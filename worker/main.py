import asyncio
import json
import os
import socket
import traceback
import signal
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.settings import settings
from app.utils import as_dict as _as_dict
from worker.db import create_pool
from worker.fetch_arxiv import parse_rss as parse_rss_items, render_text_for_llm as arxiv_text
from worker.fetch_hf import parse_daily_papers, render_text_for_llm as hf_text
from worker.fetch_github_trending import parse_github_trending, render_text_for_llm as gt_text
from worker.fetch_hackernews import parse_hackernews, render_text_for_llm as hn_text
from worker.fetch_semantic_scholar import parse_semantic_scholar, render_text_for_llm as ss_text
from worker.fetch_x_twitter import parse_x_twitter, render_text_for_llm as xt_text
from worker.errors import NonRetryableError
from worker.llm import translate_and_summarize


UTC = timezone.utc


async def _claim_task(conn, worker_id: str, task_type: str) -> Optional[dict]:
    row = await conn.fetchrow(
        """
        with next_task as (
          select id
          from tasks
          where status = 'queued' and run_after <= now() and type=$2
          order by priority desc, created_at asc
          for update skip locked
          limit 1
        )
        update tasks
        set status='running',
            locked_by=$1,
            locked_at=now(),
            attempt=attempt+1,
            updated_at=now()
        where id in (select id from next_task)
        returning *
        """,
        worker_id,
        task_type,
    )
    return dict(row) if row else None


async def _finish_task(conn, task_id, status: str, last_error: Optional[str] = None) -> None:
    await conn.execute(
        "update tasks set status=$2, last_error=$3, locked_by=null, locked_at=null, updated_at=now() where id=$1",
        task_id,
        status,
        last_error,
    )

async def _requeue_task(conn, task: dict, last_error: str) -> None:
    attempt = int(task.get("attempt") or 0)
    max_attempts = int(task.get("max_attempts") or 0)
    if max_attempts > 0 and attempt >= max_attempts:
        await _finish_task(conn, task["id"], "failed", last_error)
        return
    tries = max(0, attempt - 1)
    delay_seconds = min(300, 10 * (tries + 1))
    await conn.execute(
        """
        update tasks
        set status='queued',
            last_error=$2,
            run_after=now() + make_interval(secs => $3),
            locked_by=null,
            locked_at=null,
            updated_at=now()
        where id=$1
        """,
        task["id"],
        last_error,
        delay_seconds,
    )


async def _enqueue_fetch_task(conn, channel_space_id, channel_source_id, run_after: datetime, priority: int = 0) -> None:
    await conn.execute(
        """
        insert into tasks(type, channel_space_id, channel_source_id, status, priority, run_after, created_at, updated_at)
        values('fetch', $1, $2, 'queued', $3, $4, now(), now())
        """,
        channel_space_id,
        channel_source_id,
        priority,
        run_after,
    )


async def _enqueue_process_task(conn, channel_space_id, raw_item_id, run_after: datetime, priority: int = 0) -> None:
    await conn.execute(
        """
        insert into tasks(type, channel_space_id, raw_item_id, status, priority, run_after, created_at, updated_at)
        values('process', $1, $2, 'queued', $3, $4, now(), now())
        """,
        channel_space_id,
        raw_item_id,
        priority,
        run_after,
    )


def _policy_every_seconds(fetch_policy: dict) -> int:
    schedule = fetch_policy.get("schedule") or {}
    v = schedule.get("every_seconds")
    if isinstance(v, int) and v > 0:
        return v
    return settings.default_fetch_every_seconds


def _policy_max_items(fetch_policy: dict) -> int:
    budget = fetch_policy.get("budget") or {}
    v = budget.get("max_items_per_run")
    if isinstance(v, int) and v > 0:
        return v
    return settings.default_max_items_per_run


async def scheduler_loop(pool, stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                select
                  cs.id as channel_source_id,
                  cs.channel_space_id,
                  cs.fetch_policy,
                  ss.id as state_id,
                  ss.next_fetch_at
                from channel_sources cs
                left join source_states ss on ss.channel_source_id = cs.id
                where cs.enabled = true
                """
            )
            now = datetime.now(tz=UTC)
            for r in rows:
                channel_source_id = r["channel_source_id"]
                channel_space_id = r["channel_space_id"]
                fetch_policy = _as_dict(r["fetch_policy"])
                next_fetch_at = r["next_fetch_at"]
                if next_fetch_at and next_fetch_at > now:
                    continue
                exists = await conn.fetchval(
                    """
                    select 1 from tasks
                    where status in ('queued','running') and type='fetch' and channel_source_id=$1
                    limit 1
                    """,
                    channel_source_id,
                )
                if exists:
                    continue
                every_seconds = _policy_every_seconds(fetch_policy)
                await _enqueue_fetch_task(conn, channel_space_id, channel_source_id, now, priority=0)
                await conn.execute(
                    """
                    insert into source_states(channel_source_id, cursor, next_fetch_at, consecutive_failures, updated_at)
                    values($1, '{}'::jsonb, $2, 0, now())
                    on conflict (channel_source_id)
                    do update set next_fetch_at=$2, updated_at=now()
                    """,
                    channel_source_id,
                    now + timedelta(seconds=every_seconds),
                )
        await asyncio.sleep(settings.scheduler_scan_seconds)


async def _create_alert(conn, channel_space_id, alert_type: str, message: str, meta: dict) -> None:
    row = await conn.fetchrow(
        """
        insert into alerts(channel_space_id, type, severity, message, meta, created_at)
        values($1, $2, 'warning', $3, $4::jsonb, now())
        returning id, channel_space_id, type, severity, message, meta, created_at
        """,
        channel_space_id,
        alert_type,
        message,
        json.dumps(meta),
    )
    payload = {
        "id": str(row["id"]),
        "channel_space_id": str(row["channel_space_id"]),
        "type": row["type"],
        "severity": row["severity"],
        "message": row["message"],
        "meta": row["meta"],
        "created_at": row["created_at"].isoformat(),
    }
    await conn.execute("select pg_notify('alert_created', $1)", json.dumps(payload, ensure_ascii=False))


async def fetch_and_ingest(conn, task: dict) -> None:
    channel_source_id = task.get("channel_source_id")
    if not channel_source_id:
        raise RuntimeError("missing channel_source_id")

    row = await conn.fetchrow(
        """
        select
          cs.channel_space_id,
          cs.fetch_policy,
          s.id as source_id,
          s.type as source_type,
          s.name as source_name,
          s.config as source_config,
          ss.cursor as cursor,
          ss.consecutive_failures as consecutive_failures
        from channel_sources cs
        join sources s on s.id = cs.source_id
        left join source_states ss on ss.channel_source_id = cs.id
        where cs.id = $1
        """,
        channel_source_id,
    )
    if not row:
        raise RuntimeError("channel_source not found")

    channel_space_id = row["channel_space_id"]
    fetch_policy = _as_dict(row["fetch_policy"])
    source_id = row["source_id"]
    source_type = row["source_type"]
    source_config = _as_dict(row["source_config"])
    cursor = _as_dict(row["cursor"])
    max_items = _policy_max_items(fetch_policy)

    new_raw_ids: list[str] = []
    cursor_updates: Optional[dict] = None

    proxy = settings.https_proxy or settings.http_proxy
    headers = {"User-Agent": "NiuMaChengXiaoBao/0.1 (News Aggregator)"}
    async with httpx.AsyncClient(timeout=60, proxy=proxy, follow_redirects=True, headers=headers) as client:
        if source_type == "rss":
            feed_url = source_config.get("feed_url") or source_config.get("url")
            if not feed_url:
                raise RuntimeError("rss source requires config.feed_url")
            resp = await client.get(feed_url)
            resp.raise_for_status()
            items = parse_rss_items(resp.text)[:max_items]
        elif source_type == "hf_daily_papers":
            today = datetime.now(tz=UTC).date()
            next_date = cursor.get("next_date")
            next_index = cursor.get("next_index")
            if isinstance(next_index, int) and next_index >= 0:
                start_index = next_index
            else:
                start_index = 0
            if not next_date and cursor.get("last_date"):
                next_date = cursor.get("last_date")
            if next_date:
                try:
                    start = datetime.fromisoformat(next_date).date()
                except Exception:
                    start = today
            else:
                start = today
            all_items: list[dict] = []
            cursor_date = start
            cursor_index = start_index
            next_cursor_date = cursor_date
            next_cursor_index = cursor_index
            while cursor_date <= today and len(all_items) < max_items:
                url = f"https://huggingface.co/api/daily_papers?date={cursor_date.isoformat()}"
                r = await client.get(url)
                if r.status_code == 404:
                    cursor_date = cursor_date + timedelta(days=1)
                    cursor_index = 0
                    continue
                r.raise_for_status()
                full_day_items = parse_daily_papers(r.json())
                day_items = full_day_items
                if cursor_index > 0:
                    day_items = day_items[cursor_index:]
                remaining = max_items - len(all_items)
                chunk = day_items[:remaining]
                all_items.extend(chunk)
                cursor_index += len(chunk)
                if cursor_index >= len(full_day_items):
                    cursor_date = cursor_date + timedelta(days=1)
                    cursor_index = 0
                next_cursor_date = cursor_date
                next_cursor_index = cursor_index
            items = all_items
            cursor_updates = {"next_date": next_cursor_date.isoformat(), "next_index": next_cursor_index}
        elif source_type == "hacker_news":
            items = await parse_hackernews(source_config)
        elif source_type == "github_trending":
            items = await parse_github_trending(source_config)
        elif source_type == "semantic_scholar":
            items = await parse_semantic_scholar(source_config)
        elif source_type == "x_twitter":
            items, cursor_updates = await parse_x_twitter(source_config, cursor, max_items)
        else:
            raise RuntimeError(f"source_type not supported in MVP: {source_type}")

    for item in items:
        inserted = await conn.fetchval(
            """
            insert into raw_items(
              channel_space_id, source_id, source_item_id, source_item_url,
              published_at, content, created_at
            )
            values($1, $2, $3, $4, $5, $6::jsonb, now())
            on conflict (source_id, source_item_id) do nothing
            returning id
            """,
            channel_space_id,
            source_id,
            item["source_item_id"],
            item.get("url"),
            item.get("published_at"),
            json.dumps(item.get("content") or {}),
        )
        if inserted:
            new_raw_ids.append(str(inserted))
            await _enqueue_process_task(conn, channel_space_id, inserted, datetime.now(tz=UTC), priority=0)

    if cursor_updates:
        cursor.update(cursor_updates)

    await conn.execute(
        """
        insert into source_states(channel_source_id, cursor, consecutive_failures, last_success_at, last_error, updated_at)
        values($1, $2::jsonb, 0, now(), null, now())
        on conflict (channel_source_id)
        do update set
          cursor=excluded.cursor,
          consecutive_failures=0,
          last_success_at=now(),
          last_error=null,
          updated_at=now()
        """,
        channel_source_id,
        json.dumps(cursor),
    )

    payload = {"new_raw_items": len(new_raw_ids)}
    await conn.execute("select pg_notify('fetch_succeeded', $1)", json.dumps(payload))


async def process_one(conn, task: dict) -> None:
    raw_item_id = task.get("raw_item_id")
    if not raw_item_id:
        raise RuntimeError("missing raw_item_id")
    row = await conn.fetchrow(
        """
        select
          ri.id,
          ri.channel_space_id,
          ri.source_id,
          ri.source_item_url,
          ri.published_at,
          ri.content,
          s.type as source_type
        from raw_items ri
        join sources s on s.id = ri.source_id
        where ri.id=$1
        """,
        raw_item_id,
    )
    if not row:
        raise RuntimeError("raw_item not found")

    content = _as_dict(row["content"])
    if row["source_type"] == "rss":
        text = arxiv_text(content)
    elif row["source_type"] == "hacker_news":
        text = hn_text(content)
    elif row["source_type"] == "github_trending":
        text = gt_text(content)
    elif row["source_type"] == "semantic_scholar":
        text = ss_text(content)
    elif row["source_type"] == "x_twitter":
        text = xt_text(content)
    else:
        text = hf_text(content)

    sub_channel_id = await conn.fetchval(
        """
        SELECT sub_channel_id FROM channel_sources
        WHERE source_id = $1 AND channel_space_id = $2
        LIMIT 1
        """,
        row["source_id"],
        row["channel_space_id"],
    )

    if sub_channel_id and row["source_item_url"]:
        existing = await conn.fetchval(
            """
            SELECT 1 FROM processed_news pn
            JOIN raw_items ri ON ri.id = pn.raw_item_id
            WHERE pn.channel_space_id = $1
              AND pn.sub_channel_id = $2
              AND ri.source_item_url = $3
            LIMIT 1
            """,
            row["channel_space_id"],
            sub_channel_id,
            row["source_item_url"],
        )
        if existing:
            return

    result = await translate_and_summarize(text=text, source_url=row["source_item_url"])
    inserted = await conn.fetchrow(
        """
        insert into processed_news(
          channel_space_id, raw_item_id, title, summary, language, source_refs, published_at,
          bullets, tags, entities, importance_score, sub_channel_id, created_at
        )
        values($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, now())
        on conflict (raw_item_id) do nothing
        returning id, channel_space_id, title, published_at
        """,
        row["channel_space_id"],
        raw_item_id,
        result.get("title") or "",
        result.get("summary") or "",
        result.get("language") or "zh",
        json.dumps({"url": row["source_item_url"], "source_id": str(row["source_id"])}),
        row["published_at"],
        json.dumps(result.get("bullets") or []),
        json.dumps(result.get("tags") or []),
        json.dumps(result.get("entities") or []),
        float(result.get("importance_score") or 0),
        sub_channel_id,
    )
    if inserted:
        payload = {
            "id": str(inserted["id"]),
            "channel_space_id": str(inserted["channel_space_id"]),
            "title": inserted["title"],
            "published_at": inserted["published_at"].isoformat() if inserted["published_at"] else None,
        }
        await conn.execute("select pg_notify('news_processed', $1)", json.dumps(payload, ensure_ascii=False))


async def worker_loop(pool, stop_event: asyncio.Event) -> None:
    fetch_sem = asyncio.Semaphore(settings.fetch_concurrency)
    process_sem = asyncio.Semaphore(settings.process_concurrency)
    running: set[asyncio.Task] = set()
    while not stop_event.is_set():
        sem: Optional[asyncio.Semaphore] = None
        task_type: Optional[str] = None
        try:
            await asyncio.wait_for(fetch_sem.acquire(), timeout=0.001)
            sem = fetch_sem
            task_type = "fetch"
        except Exception:
            try:
                await asyncio.wait_for(process_sem.acquire(), timeout=0.001)
                sem = process_sem
                task_type = "process"
            except Exception:
                await asyncio.sleep(0.05)
                continue
        task: Optional[dict] = None
        async with pool.acquire() as conn:
            task = await _claim_task(conn, settings.worker_id, task_type) if task_type else None
        # conn released immediately after claim — _run acquires its own

        if not task:
            if sem:
                sem.release()
            await asyncio.sleep(1)
            continue

        local_sem = sem

        async def _run(task_dict: dict):
            try:
                async with pool.acquire() as conn2:
                    try:
                        if task_dict["type"] == "fetch":
                            await fetch_and_ingest(conn2, task_dict)
                        elif task_dict["type"] == "process":
                            await process_one(conn2, task_dict)
                        await _finish_task(conn2, task_dict["id"], "succeeded", None)
                    except NonRetryableError:
                        err = traceback.format_exc()
                        if task_dict["type"] == "fetch":
                            await _create_alert(conn2, task_dict["channel_space_id"], "fetch_auth_failed", err, {"task_id": str(task_dict["id"])})
                        await _finish_task(conn2, task_dict["id"], "failed", err)
                    except Exception:
                        err = traceback.format_exc()
                        if task_dict["type"] == "fetch" and task_dict.get("channel_source_id"):
                            await _on_fetch_failed(conn2, task_dict, err)
                        await _requeue_task(conn2, task_dict, err)
            finally:
                if local_sem:
                    local_sem.release()

        t = asyncio.create_task(_run(task))
        running.add(t)
        t.add_done_callback(lambda x: running.discard(x))

    if running:
        await asyncio.gather(*running, return_exceptions=True)


async def _on_fetch_failed(conn, task: dict, error: str) -> None:
    channel_source_id = task["channel_source_id"]
    channel_space_id = task["channel_space_id"]
    row = await conn.fetchrow(
        """
        update source_states
        set consecutive_failures=coalesce(consecutive_failures,0)+1,
            last_error=$2,
            updated_at=now()
        where channel_source_id=$1
        returning consecutive_failures
        """,
        channel_source_id,
        error,
    )
    failures = row["consecutive_failures"] if row else 1
    if failures >= settings.default_fail_alert_threshold:
        await _create_alert(
            conn,
            channel_space_id,
            "fetch_failed",
            f"source fetch failed {failures} times: {error}",
            {"channel_source_id": str(channel_source_id), "failures": failures},
        )


async def zero_new_monitor_loop(pool, stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                select
                  cs.id as channel_source_id,
                  cs.channel_space_id,
                  s.name as source_name,
                  ss.last_success_at
                from channel_sources cs
                join sources s on s.id = cs.source_id
                left join source_states ss on ss.channel_source_id = cs.id
                where cs.enabled = true
                """
            )
            threshold = datetime.now(tz=UTC) - timedelta(hours=settings.default_zero_new_hours)
            for r in rows:
                last = r["last_success_at"]
                if last and last >= threshold:
                    continue
                channel_source_id = str(r["channel_source_id"])
                exists = await conn.fetchval(
                    """
                    select 1
                    from alerts
                    where type='zero_new'
                      and (meta->>'channel_source_id')=$1
                      and created_at > now() - interval '24 hours'
                    limit 1
                    """,
                    channel_source_id,
                )
                if exists:
                    continue
                await _create_alert(
                    conn,
                    r["channel_space_id"],
                    "zero_new",
                    f"source has no new items for {settings.default_zero_new_hours}h: {r['source_name']}",
                    {"channel_source_id": channel_source_id, "last_success_at": last.isoformat() if last else None},
                )
        await asyncio.sleep(3600)


async def reclaim_stale_running_loop(pool, stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        async with pool.acquire() as conn:
            await conn.execute(
                """
                update tasks
                set status='queued',
                    locked_by=null,
                    locked_at=null,
                    run_after=now(),
                    updated_at=now()
                where status='running'
                  and locked_at < now() - make_interval(secs => $1)
                  and attempt < max_attempts
                """,
                settings.task_stale_seconds,
            )
            await conn.execute(
                """
                update tasks
                set status='failed',
                    locked_by=null,
                    locked_at=null,
                    updated_at=now()
                where status='running'
                  and locked_at < now() - make_interval(secs => $1)
                  and attempt >= max_attempts
                """,
                settings.task_stale_seconds,
            )
        await asyncio.sleep(30)


async def main() -> None:
    # 动态生成唯一 worker_id，避免多实例冲突
    settings.worker_id = f"{socket.gethostname()}-{os.getpid()}"
    pool = await create_pool()
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except Exception:
            pass
    try:
        await asyncio.gather(
            scheduler_loop(pool, stop_event),
            worker_loop(pool, stop_event),
            zero_new_monitor_loop(pool, stop_event),
            reclaim_stale_running_loop(pool, stop_event),
        )
    finally:
        stop_event.set()
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
