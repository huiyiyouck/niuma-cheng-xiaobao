import json
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.settings import settings
from worker.errors import NonRetryableError


TWEET_FIELDS = "created_at,public_metrics,author_id,text,entities,referenced_tweets"
USER_FIELDS = "name,username"
EXPANSIONS = "author_id"


async def parse_x_twitter(
    config: dict,
    cursor: dict,
    max_items: int,
) -> tuple[list[dict], dict]:
    """
    主入口。返回 (items, cursor_updates)。
    items: list[dict]，每个 dict 包含 source_item_id, url, published_at, content。
    cursor_updates: dict，需要合并到 source_states.cursor 的更新。
    """
    mode = config.get("mode", "search")
    if mode == "search":
        return await _fetch_search(config, cursor, max_items)
    elif mode == "user_timeline":
        return await _fetch_user_timelines(config, cursor, max_items)
    else:
        raise RuntimeError(f"unsupported x_twitter mode: {mode}")


async def _fetch_search(
    config: dict,
    cursor: dict,
    max_items: int,
) -> tuple[list[dict], dict]:
    """关键词搜索模式。"""
    query = config.get("search_query")
    if not query:
        raise RuntimeError("x_twitter search mode requires config.search_query")

    proxy = settings.https_proxy or settings.http_proxy
    async with httpx.AsyncClient(timeout=30, proxy=proxy) as client:
        url = "https://api.twitter.com/2/tweets/search/recent"
        params = {
            "query": query,
            "max_results": min(max_items, 100),
            "tweet.fields": TWEET_FIELDS,
            "user.fields": USER_FIELDS,
            "expansions": EXPANSIONS,
        }
        since_id = cursor.get("since_id")
        if since_id:
            params["since_id"] = since_id

        r = await client.get(url, headers=_auth_headers(), params=params)
        _handle_auth_failure(r)
        _handle_rate_limit(r)
        r.raise_for_status()
        data = r.json()

    items = _parse_tweets(data)
    new_since_id = None
    if items:
        tweet_ids = [int(t["source_item_id"]) for t in items if t["source_item_id"].isdigit()]
        if tweet_ids:
            new_since_id = str(max(tweet_ids))

    cursor_updates = {}
    if new_since_id:
        cursor_updates["since_id"] = new_since_id

    return items[:max_items], cursor_updates


async def _fetch_user_timelines(
    config: dict,
    cursor: dict,
    max_items: int,
) -> tuple[list[dict], dict]:
    """账号追踪模式。逐用户拉取，排序截断后仅对保留推文更新游标。"""
    usernames = config.get("usernames")
    if not usernames:
        raise RuntimeError("x_twitter user_timeline mode requires config.usernames")

    max_per_user = config.get("max_results_per_user", 20)

    proxy = settings.https_proxy or settings.http_proxy
    all_items: list[dict] = []
    user_cursors = dict(cursor.get("user_cursors", {}))
    user_items: dict[str, list[dict]] = {}

    async with httpx.AsyncClient(timeout=30, proxy=proxy) as client:
        user_ids = await _resolve_usernames(client, usernames)

        for username, user_id in user_ids.items():
            if not user_id:
                continue
            url = f"https://api.twitter.com/2/users/{user_id}/tweets"
            params = {
                "max_results": min(max_per_user, 100),
                "tweet.fields": TWEET_FIELDS,
                "exclude": "retweets,replies",
            }
            since = user_cursors.get(username)
            if since:
                params["since_id"] = since

            r = await client.get(url, headers=_auth_headers(), params=params)
            _handle_auth_failure(r)
            _handle_rate_limit(r)
            r.raise_for_status()
            data = r.json()

            tweets = _parse_tweets(data)
            user_items[username] = tweets
            all_items.extend(tweets)

    # 按 published_at DESC 排序后截断
    all_items.sort(key=lambda x: x.get("published_at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    retained = all_items[:max_items]
    retained_ids = {item["source_item_id"] for item in retained}

    # 仅对保留推文对应的用户更新游标
    updated_cursors = dict(user_cursors)
    for username, tweets in user_items.items():
        retained_tweets = [t for t in tweets if t["source_item_id"] in retained_ids]
        if retained_tweets:
            tweet_ids = [int(t["source_item_id"]) for t in retained_tweets if t["source_item_id"].isdigit()]
            if tweet_ids:
                updated_cursors[username] = str(max(tweet_ids))

    return retained, {"user_cursors": updated_cursors}


async def _resolve_usernames(
    client: httpx.AsyncClient,
    usernames: list[str],
) -> dict[str, Optional[str]]:
    """通过用户名查询 user_id。404 静默跳过，非 404 错误抛出触发重试。"""
    result = {}
    for username in usernames:
        r = await client.get(
            f"https://api.twitter.com/2/users/by/username/{username}",
            headers=_auth_headers(),
        )
        _handle_auth_failure(r)
        _handle_rate_limit(r)
        if r.status_code == 200:
            data = r.json()
            result[username] = data.get("data", {}).get("id")
        elif r.status_code == 404:
            result[username] = None
        else:
            r.raise_for_status()
    return result


def _parse_tweets(api_response: dict) -> list[dict]:
    """将 X API 响应解析为标准 item 格式。"""
    tweets = api_response.get("data", [])
    includes = api_response.get("includes", {})
    users = {u["id"]: u for u in includes.get("users", [])}

    items = []
    for tweet in tweets:
        tweet_id = tweet.get("id")
        if not tweet_id:
            continue

        author_id = tweet.get("author_id")
        user = users.get(author_id, {})
        username = user.get("username", "")
        author_name = user.get("name", "")

        text = tweet.get("text", "")
        created_at_str = tweet.get("created_at")
        published_at = None
        if created_at_str:
            try:
                published_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            except Exception:
                pass

        metrics = tweet.get("public_metrics", {})
        entities_data = tweet.get("entities", {})
        referenced = tweet.get("referenced_tweets", [])

        content = {
            "tweet_id": tweet_id,
            "text": text,
            "author_username": username,
            "author_name": author_name,
            "created_at": created_at_str,
            "public_metrics": metrics,
            "entities": entities_data,
            "referenced_tweets": referenced,
        }

        url = f"https://x.com/{username}/status/{tweet_id}" if username else f"https://x.com/i/status/{tweet_id}"

        items.append({
            "source_item_id": tweet_id,
            "url": url,
            "published_at": published_at,
            "content": content,
        })

    return items


def _auth_headers() -> dict:
    return {"Authorization": f"Bearer {settings.x_bearer_token}"}


def _handle_auth_failure(response: httpx.Response):
    """401/403 立即抛出 NonRetryableError，不重试。"""
    if response.status_code in (401, 403):
        raise NonRetryableError(
            f"X API authentication failed (HTTP {response.status_code}). "
            "Check X_BEARER_TOKEN in .env"
        )


def _handle_rate_limit(response: httpx.Response):
    """429 响应抛出异常，触发 Worker 退避重试。"""
    if response.status_code == 429:
        raise httpx.HTTPStatusError(
            "X API rate limit exceeded",
            request=response.request,
            response=response,
        )


def render_text_for_llm(content) -> str:
    """将推文内容渲染为给 LLM 的文本。"""
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            content = {}

    username = content.get("author_username") or ""
    text = content.get("text") or ""
    metrics = content.get("public_metrics") or {}
    entities = content.get("entities") or {}

    parts = []
    if username:
        parts.append(f"[Tweet by @{username}]")
    parts.append(text)

    metric_parts = []
    for key in ["like_count", "retweet_count", "reply_count"]:
        v = metrics.get(key)
        if v is not None:
            metric_parts.append(f"{key.replace('_count', '').title()}s: {v}")
    if metric_parts:
        parts.append(" | ".join(metric_parts))

    urls = entities.get("urls", [])
    if urls:
        link_parts = [u.get("expanded_url") or u.get("url", "") for u in urls]
        parts.append("引用链接:\n" + "\n".join(f"- {u}" for u in link_parts if u))

    return "\n\n".join(parts).strip()
