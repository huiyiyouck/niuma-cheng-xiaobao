import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Alert, ChannelSource, ChannelSpace, ProcessedNews, Source, SubChannel
from app.schemas import (
    AlertOut,
    ChannelSourceBind,
    ChannelSourceOut,
    ChannelSourceUpdatePolicy,
    ChannelSourceWithSource,
    ChannelSpaceCreate,
    ChannelSpaceOut,
    ChannelStats,
    LogEntry,
    LogQueryResponse,
    ProcessedNewsOut,
    SourceBindingInfo,
    SourceCreate,
    SourceOut,
    SourceType,
    SourceUpdate,
    SourceVerifyResponse,
    SourceWithBindings,
    SubChannelCreate,
    SubChannelOut,
    SubChannelUpdate,
    VerifyItem,
)
from app.utils import as_dict as _as_dict

from worker.errors import NonRetryableError

router = APIRouter()

UTC = timezone.utc


# ── 转换函数 ─────────────────────────────────────────────────

def _source_out_v2(r: Source) -> SourceOut:
    return SourceOut.model_validate({
        "id": r.id, "type": r.type, "display_name": r.display_name,
        "source_url": r.source_url, "status": r.status,
        "config": _as_dict(r.config),
        "last_verified_at": r.last_verified_at,
        "verify_error": r.verify_error,
        "created_at": r.created_at,
    })



def _channel_source_out(r: ChannelSource) -> ChannelSourceOut:
    return ChannelSourceOut.model_validate({
        "id": r.id,
        "channel_space_id": r.channel_space_id,
        "source_id": r.source_id,
        "enabled": r.enabled,
        "fetch_policy": _as_dict(r.fetch_policy),
        "sub_channel_id": r.sub_channel_id,
        "created_at": r.created_at,
    })


def _processed_news_out(r: ProcessedNews) -> ProcessedNewsOut:
    return ProcessedNewsOut.model_validate({
        "id": r.id,
        "channel_space_id": r.channel_space_id,
        "raw_item_id": r.raw_item_id,
        "sub_channel_id": r.sub_channel_id,
        "title": r.title,
        "summary": r.summary,
        "language": r.language,
        "source_refs": _as_dict(r.source_refs),
        "published_at": r.published_at,
        "bullets": r.bullets or [],
        "tags": r.tags or [],
        "entities": r.entities or [],
        "importance_score": float(r.importance_score or 0),
        "created_at": r.created_at,
    })


def _alert_out(r: Alert) -> AlertOut:
    return AlertOut.model_validate({
        "id": r.id,
        "channel_space_id": r.channel_space_id,
        "type": r.type,
        "severity": r.severity,
        "message": r.message,
        "meta": _as_dict(r.meta),
        "created_at": r.created_at,
    })


# ── ChannelSpace ────────────────────────────────────────────

@router.get("/channel-spaces", response_model=list[ChannelSpaceOut])
async def list_channel_spaces(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(ChannelSpace).order_by(ChannelSpace.created_at.desc())
    )).scalars().all()
    return [ChannelSpaceOut.model_validate(r, from_attributes=True) for r in rows]


@router.post("/channel-spaces", response_model=ChannelSpaceOut)
async def create_channel_space(payload: ChannelSpaceCreate, session: AsyncSession = Depends(get_session)):
    obj = ChannelSpace(name=payload.name, description=payload.description)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return ChannelSpaceOut.model_validate(obj, from_attributes=True)


# ── Source CRUD (v0.2 重构版) ────────────────────────────────

@router.get("/sources", response_model=list[SourceWithBindings])
async def list_sources_v2(
    status: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Source).order_by(Source.created_at.desc())
    if status:
        stmt = stmt.where(Source.status == status)
    if type:
        stmt = stmt.where(Source.type == type)
    rows = (await session.execute(stmt)).scalars().all()

    source_ids = [r.id for r in rows]
    bindings: dict[uuid.UUID, list[SourceBindingInfo]] = {}
    if source_ids:
        cs_rows = (await session.execute(
            select(ChannelSource, ChannelSpace.name, SubChannel.name)
            .join(ChannelSpace, ChannelSpace.id == ChannelSource.channel_space_id)
            .outerjoin(SubChannel, SubChannel.id == ChannelSource.sub_channel_id)
            .where(ChannelSource.source_id.in_(source_ids))
        )).all()
        for cs, space_name, sc_name in cs_rows:
            bindings.setdefault(cs.source_id, []).append(
                SourceBindingInfo(
                    channel_space_id=cs.channel_space_id,
                    channel_space_name=space_name,
                    sub_channel_id=cs.sub_channel_id,
                    sub_channel_name=sc_name,
                    enabled=cs.enabled,
                )
            )

    return [
        SourceWithBindings(
            **(_source_out_v2(r).model_dump()),
            channel_spaces=bindings.get(r.id, []),
        )
        for r in rows
    ]


@router.post("/sources", response_model=SourceOut)
async def create_source_v2(payload: SourceCreate, session: AsyncSession = Depends(get_session)):
    from app.source_detector import detect_type_with_http

    if payload.type:
        source_type = payload.type
    elif payload.source_url and payload.source_url.strip():
        source_type = await detect_type_with_http(payload.source_url.strip())
    else:
        source_type = SourceType.unknown

    obj = Source(
        type=source_type,
        display_name=payload.display_name,
        source_url=payload.source_url.strip() if payload.source_url else None,
        config=payload.config,
        status="unverified",
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return _source_out_v2(obj)


@router.get("/sources/{source_id}", response_model=SourceWithBindings)
async def get_source_v2(source_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    row = (await session.execute(
        select(Source).where(Source.id == source_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="source not found")

    cs_rows = (await session.execute(
        select(ChannelSource, ChannelSpace.name, SubChannel.name)
        .join(ChannelSpace, ChannelSpace.id == ChannelSource.channel_space_id)
        .outerjoin(SubChannel, SubChannel.id == ChannelSource.sub_channel_id)
        .where(ChannelSource.source_id == source_id)
    )).all()

    bindings = []
    for cs, space_name, sc_name in cs_rows:
        bindings.append(SourceBindingInfo(
            channel_space_id=cs.channel_space_id,
            channel_space_name=space_name,
            sub_channel_id=cs.sub_channel_id,
            sub_channel_name=sc_name,
            enabled=cs.enabled,
        ))

    return SourceWithBindings(
        **(_source_out_v2(row).model_dump()),
        channel_spaces=bindings,
    )


@router.put("/sources/{source_id}", response_model=SourceOut)
async def update_source_v2(
    source_id: uuid.UUID,
    payload: SourceUpdate,
    session: AsyncSession = Depends(get_session),
):
    row = (await session.execute(
        select(Source).where(Source.id == source_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="source not found")

    values: dict = {}
    if payload.display_name is not None:
        values["display_name"] = payload.display_name
    if payload.source_url is not None:
        values["source_url"] = payload.source_url.strip() if payload.source_url else None
    if payload.type is not None:
        values["type"] = payload.type
    if payload.config is not None:
        values["config"] = payload.config

    # 修改 source_url 或 type → 重置验证状态
    if payload.source_url is not None or payload.type is not None:
        values["status"] = "unverified"
        values["last_verified_at"] = None
        values["verify_error"] = None

    if values:
        await session.execute(
            update(Source).where(Source.id == source_id).values(**values)
        )
        await session.commit()

    row = (await session.execute(
        select(Source).where(Source.id == source_id)
    )).scalar_one()
    return _source_out_v2(row)


@router.delete("/sources/{source_id}", status_code=204)
async def delete_source_v2(source_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    row = (await session.execute(
        select(Source).where(Source.id == source_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="source not found")
    await session.delete(row)
    await session.commit()


# ── Source 验证 ──────────────────────────────────────────────

def _truncate_preview(item: dict, max_chars: int) -> str:
    content = item.get("content", {})
    if isinstance(content, dict):
        text = content.get("text") or content.get("description") or ""
    else:
        text = str(content) if content else ""
    if len(text) <= max_chars:
        return text
    return text[:max_chars]


async def _execute_verify_fetch(source_type: str, config: dict) -> list[dict]:
    if source_type == "x_twitter":
        from worker.fetch_x_twitter import parse_x_twitter
        items, _ = await parse_x_twitter(config=config, cursor={}, max_items=5)
        return items
    raise NonRetryableError(f"该 Source 类型的抓取器尚未实现：{source_type}")


@router.post("/sources/{source_id}/verify", response_model=SourceVerifyResponse)
async def verify_source(source_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    row = (await session.execute(
        select(Source).where(Source.id == source_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="source not found")

    source_type = row.type
    config = _as_dict(row.config)

    try:
        items = await asyncio.wait_for(
            _execute_verify_fetch(source_type, config),
            timeout=15.0,
        )
    except asyncio.TimeoutError:
        await session.execute(
            update(Source).where(Source.id == source_id).values(
                verify_error="外部服务超时（15s）"
            )
        )
        await session.commit()
        return SourceVerifyResponse(status="error", error="外部服务超时（15s）")

    except NonRetryableError as e:
        await session.execute(
            update(Source).where(Source.id == source_id).values(verify_error=str(e))
        )
        await session.commit()
        return SourceVerifyResponse(status="error", error=str(e))

    except Exception as e:
        await session.execute(
            update(Source).where(Source.id == source_id).values(verify_error=str(e))
        )
        await session.commit()
        return SourceVerifyResponse(status="error", error=str(e))

    # parse_x_twitter item 结构：{source_item_id, url, published_at, content:{text, author_name, ...}}
    verify_items = [
        VerifyItem(
            source_item_id=it["source_item_id"],
            source_item_url=it.get("url"),
            title=it.get("content", {}).get("text", "")[:80]
            if isinstance(it.get("content"), dict) else "",
            content_preview=_truncate_preview(it, 200),
            published_at=str(it.get("published_at")) if it.get("published_at") else None,
        )
        for it in items[:5]
    ]

    await session.execute(
        update(Source).where(Source.id == source_id).values(
            last_verified_at=datetime.now(tz=UTC),
            verify_error=None,
        )
    )
    await session.commit()
    return SourceVerifyResponse(status="ok", items=verify_items, total_fetched=len(items))


@router.post("/sources/{source_id}/mark-verified")
async def mark_source_verified(source_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    row = (await session.execute(
        select(Source).where(Source.id == source_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="source not found")

    if row.status in ("verified", "active"):
        return {"status": "ok"}

    if row.status == "error":
        raise HTTPException(status_code=409, detail="不能将 error 状态的 Source 直接标记为 verified")

    if row.status != "unverified":
        raise HTTPException(status_code=409, detail=f"当前状态 {row.status} 不允许此操作")

    await session.execute(
        update(Source).where(Source.id == source_id).values(status="verified")
    )
    await session.commit()
    return {"status": "ok"}


# ── ChannelSource 绑定 ──────────────────────────────────────

@router.get("/channel-spaces/{channel_space_id}/sources", response_model=list[ChannelSourceWithSource])
async def list_channel_sources(channel_space_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    rows = (
        await session.execute(
            select(ChannelSource, Source)
            .join(Source, Source.id == ChannelSource.source_id)
            .where(ChannelSource.channel_space_id == channel_space_id)
            .order_by(ChannelSource.created_at.desc())
        )
    ).all()
    result: list[ChannelSourceWithSource] = []
    for cs, src in rows:
        result.append(ChannelSourceWithSource(
            channel_source=_channel_source_out(cs),
            source=_source_out_v2(src),
        ))
    return result


@router.post("/channel-spaces/{channel_space_id}/sources", response_model=ChannelSourceOut)
async def bind_source(
    channel_space_id: uuid.UUID,
    payload: ChannelSourceBind,
    session: AsyncSession = Depends(get_session),
):
    exists = (await session.execute(
        select(ChannelSpace.id).where(ChannelSpace.id == channel_space_id)
    )).scalar_one_or_none()
    if not exists:
        raise HTTPException(status_code=404, detail="channel_space not found")
    source_exists = (await session.execute(
        select(Source.id).where(Source.id == payload.source_id)
    )).scalar_one_or_none()
    if not source_exists:
        raise HTTPException(status_code=404, detail="source not found")
    if payload.sub_channel_id:
        sc_exists = (await session.execute(
            select(SubChannel.id).where(
                SubChannel.id == payload.sub_channel_id,
                SubChannel.channel_space_id == channel_space_id,
            )
        )).scalar_one_or_none()
        if not sc_exists:
            raise HTTPException(status_code=400, detail="sub_channel not found in this channel_space")

    # verified→active 触发
    if payload.enabled:
        src = (await session.execute(
            select(Source).where(Source.id == payload.source_id)
        )).scalar_one()
        if src.status == "verified":
            src.status = "active"

    obj = ChannelSource(
        channel_space_id=channel_space_id,
        source_id=payload.source_id,
        enabled=payload.enabled,
        fetch_policy=payload.fetch_policy,
        sub_channel_id=payload.sub_channel_id,
    )
    session.add(obj)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="该 Source 已绑定到此 ChannelSpace")
    await session.refresh(obj)
    return _channel_source_out(obj)


@router.put("/channel-sources/{channel_source_id}", response_model=ChannelSourceOut)
async def update_channel_source(
    channel_source_id: uuid.UUID,
    payload: ChannelSourceUpdatePolicy,
    session: AsyncSession = Depends(get_session),
):
    row = (await session.execute(
        select(ChannelSource).where(ChannelSource.id == channel_source_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="channel_source not found")

    values: dict = {}
    if payload.enabled is not None:
        values["enabled"] = payload.enabled
        # verified→active 触发
        if payload.enabled is True and not row.enabled:
            src = (await session.execute(
                select(Source).where(Source.id == row.source_id)
            )).scalar_one()
            if src.status == "verified":
                await session.execute(
                    update(Source).where(Source.id == row.source_id).values(status="active")
                )
    if payload.fetch_policy is not None:
        values["fetch_policy"] = payload.fetch_policy
    if payload.sub_channel_id is not None:
        cs_row = (await session.execute(
            select(ChannelSource.channel_space_id).where(ChannelSource.id == channel_source_id)
        )).scalar_one()
        sc_exists = (await session.execute(
            select(SubChannel.id).where(
                SubChannel.id == payload.sub_channel_id,
                SubChannel.channel_space_id == cs_row,
            )
        )).scalar_one_or_none()
        if not sc_exists:
            raise HTTPException(status_code=400, detail="sub_channel not found in this channel_space")
        values["sub_channel_id"] = payload.sub_channel_id

    if values:
        await session.execute(
            update(ChannelSource).where(ChannelSource.id == channel_source_id).values(**values)
        )
        await session.commit()
    row = (await session.execute(
        select(ChannelSource).where(ChannelSource.id == channel_source_id)
    )).scalar_one()
    return _channel_source_out(row)


# ── SubChannel ───────────────────────────────────────────────

@router.post("/channel-spaces/{channel_space_id}/sub-channels", response_model=SubChannelOut)
async def create_sub_channel(
    channel_space_id: uuid.UUID,
    payload: SubChannelCreate,
    session: AsyncSession = Depends(get_session),
):
    exists = (await session.execute(
        select(ChannelSpace.id).where(ChannelSpace.id == channel_space_id)
    )).scalar_one_or_none()
    if not exists:
        raise HTTPException(status_code=404, detail="channel_space not found")

    obj = SubChannel(
        channel_space_id=channel_space_id,
        name=payload.name,
        sort_order=payload.sort_order,
    )
    session.add(obj)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail=f"子频道名称 '{payload.name}' 已存在")
    await session.refresh(obj)
    return SubChannelOut.model_validate(obj, from_attributes=True)


@router.get("/channel-spaces/{channel_space_id}/sub-channels", response_model=list[SubChannelOut])
async def list_sub_channels(
    channel_space_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    rows = (await session.execute(
        select(SubChannel)
        .where(SubChannel.channel_space_id == channel_space_id)
        .order_by(SubChannel.sort_order, SubChannel.created_at)
    )).scalars().all()
    return [SubChannelOut.model_validate(r, from_attributes=True) for r in rows]


@router.put("/sub-channels/{sub_channel_id}", response_model=SubChannelOut)
async def update_sub_channel(
    sub_channel_id: uuid.UUID,
    payload: SubChannelUpdate,
    session: AsyncSession = Depends(get_session),
):
    row = (await session.execute(
        select(SubChannel).where(SubChannel.id == sub_channel_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="sub_channel not found")

    values = {}
    if payload.name is not None:
        values["name"] = payload.name
    if payload.sort_order is not None:
        values["sort_order"] = payload.sort_order
    if not values:
        raise HTTPException(status_code=400, detail="at least one field required")
    await session.execute(
        update(SubChannel).where(SubChannel.id == sub_channel_id).values(**values)
    )
    await session.commit()
    row = (await session.execute(
        select(SubChannel).where(SubChannel.id == sub_channel_id)
    )).scalar_one()
    return SubChannelOut.model_validate(row, from_attributes=True)


@router.delete("/sub-channels/{sub_channel_id}", status_code=204)
async def delete_sub_channel(
    sub_channel_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    row = (await session.execute(
        select(SubChannel).where(SubChannel.id == sub_channel_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="sub_channel not found")
    await session.delete(row)
    await session.commit()


# ── 新闻列表（含排序）───────────────────────────────────────

@router.get("/channel-spaces/{channel_space_id}/news", response_model=list[ProcessedNewsOut])
async def list_news(
    channel_space_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sub_channel_id: Optional[uuid.UUID] = Query(default=None),
    sort: Optional[str] = Query(default="published_desc"),
    session: AsyncSession = Depends(get_session),
):
    if sort == "score_desc":
        order_col = ProcessedNews.importance_score.desc().nullslast()
    elif sort == "score_asc":
        order_col = ProcessedNews.importance_score.asc().nullslast()
    else:
        order_col = ProcessedNews.published_at.desc().nullslast()

    stmt = (
        select(ProcessedNews)
        .where(ProcessedNews.channel_space_id == channel_space_id)
        .order_by(order_col, ProcessedNews.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if sub_channel_id is not None:
        stmt = stmt.where(ProcessedNews.sub_channel_id == sub_channel_id)
    rows = (await session.execute(stmt)).scalars().all()
    return [_processed_news_out(r) for r in rows]


@router.get("/news/{news_id}", response_model=ProcessedNewsOut)
async def get_news(news_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    row = (await session.execute(
        select(ProcessedNews).where(ProcessedNews.id == news_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="news not found")
    return _processed_news_out(row)


# ── 统计端点 ────────────────────────────────────────────────

@router.get("/channel-spaces/{channel_space_id}/stats", response_model=ChannelStats)
async def get_channel_stats(
    channel_space_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    today = datetime.now(tz=UTC).date()
    total = (await session.execute(
        select(func.count()).select_from(ProcessedNews).where(
            ProcessedNews.channel_space_id == channel_space_id
        )
    )).scalar()
    today_new = (await session.execute(
        select(func.count()).select_from(ProcessedNews).where(
            ProcessedNews.channel_space_id == channel_space_id,
            ProcessedNews.created_at >= today,
        )
    )).scalar()
    active_sources = (await session.execute(
        select(func.count()).select_from(ChannelSource).where(
            ChannelSource.channel_space_id == channel_space_id,
            ChannelSource.enabled == True,
        )
    )).scalar()
    sub_count = (await session.execute(
        select(func.count()).select_from(SubChannel).where(
            SubChannel.channel_space_id == channel_space_id
        )
    )).scalar()
    return ChannelStats(
        total_news=total, today_new=today_new,
        active_sources=active_sources, sub_channel_count=sub_count,
    )


@router.get("/stats", response_model=ChannelStats)
async def get_global_stats(session: AsyncSession = Depends(get_session)):
    today = datetime.now(tz=UTC).date()
    total = (await session.execute(
        select(func.count()).select_from(ProcessedNews)
    )).scalar()
    today_new = (await session.execute(
        select(func.count()).select_from(ProcessedNews).where(
            ProcessedNews.created_at >= today
        )
    )).scalar()
    active_sources = (await session.execute(
        select(func.count()).select_from(ChannelSource).where(
            ChannelSource.enabled == True
        )
    )).scalar()
    sub_count = (await session.execute(
        select(func.count()).select_from(SubChannel)
    )).scalar()
    return ChannelStats(
        total_news=total, today_new=today_new,
        active_sources=active_sources, sub_channel_count=sub_count,
    )


# ── 管理日志 ────────────────────────────────────────────────

LOG_DIR = __import__("pathlib").Path(__file__).resolve().parent.parent / "logs"
LOG_FILES = {"api": LOG_DIR / "api.log", "worker": LOG_DIR / "worker.log"}


def _read_log_lines(
    source: Optional[str],
    level: Optional[str],
    keyword: Optional[str],
    from_dt: Optional[str],
    to_dt: Optional[str],
    limit: int,
    offset: int,
) -> tuple[list[dict], int]:
    """从磁盘日志文件读取并过滤，返回 (entries, total_matched)。"""
    import json as _json

    files_to_read = []
    if source:
        if source in LOG_FILES:
            files_to_read.append(LOG_FILES[source])
    else:
        files_to_read = list(LOG_FILES.values())

    all_lines: list[dict] = []
    for fp in files_to_read:
        if not fp.exists():
            continue
        with open(fp, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = _json.loads(line)
                except _json.JSONDecodeError:
                    continue
                all_lines.append(entry)

    if from_dt:
        all_lines = [e for e in all_lines if e.get("timestamp", "") >= from_dt]
    if to_dt:
        all_lines = [e for e in all_lines if e.get("timestamp", "") <= to_dt]
    if level:
        all_lines = [e for e in all_lines if e.get("level", "").upper() == level.upper()]
    if keyword:
        kw = keyword.lower()
        all_lines = [e for e in all_lines if kw in e.get("message", "").lower()]

    all_lines.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    total = len(all_lines)
    entries = all_lines[offset:offset + limit]
    return entries, total


@router.get("/admin/logs", response_model=LogQueryResponse)
async def query_logs(
    level: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    keyword: Optional[str] = Query(default=None),
    from_dt: Optional[str] = Query(default=None, alias="from", description="ISO 8601 起始时间"),
    to_dt: Optional[str] = Query(default=None, alias="to", description="ISO 8601 结束时间"),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
):
    entries, total = await asyncio.to_thread(
        _read_log_lines, source, level, keyword, from_dt, to_dt, limit, offset,
    )
    return LogQueryResponse(
        entries=[LogEntry(**e) for e in entries],
        total=total,
        has_more=(offset + limit) < total,
    )


@router.get("/admin/logs/config")
async def get_logs_config():
    return {
        "levels": ["DEBUG", "INFO", "WARNING", "ERROR"],
        "sources": ["api", "worker"],
        "log_files": {k: str(v) for k, v in LOG_FILES.items()},
    }


# ── Alerts ──────────────────────────────────────────────────

@router.get("/alerts", response_model=list[AlertOut])
async def list_alerts(
    channel_space_id: Optional[uuid.UUID] = None,
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Alert).order_by(Alert.created_at.desc()).limit(limit)
    if channel_space_id:
        stmt = stmt.where(Alert.channel_space_id == channel_space_id)
    rows = (await session.execute(stmt)).scalars().all()
    return [_alert_out(r) for r in rows]
