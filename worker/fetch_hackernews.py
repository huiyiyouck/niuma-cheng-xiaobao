import asyncio
import json
from datetime import datetime, timezone

import httpx

from app.settings import settings

AI_KEYWORDS = [
    "ai ", "ai-", "artificial intelligence", "machine learning", "deep learning",
    "llm", "large language model", "gpt", "claude", "gemini", "llama", "mistral",
    "deepseek", "openai", "anthropic", "deepmind", "transformer", "neural net",
    "agent", "rag", "prompt", "diffusion", "image generat", "text-to-",
    "chatbot", "copilot", "autonomous", "robot", "nlp", "computer vision",
    "reinforcement learning", "fine-tun", "pretrain", "embedding", "vector",
    "tokenizer", "attention", "encoder", "decoder", "moe", "mixture of expert",
    "open source model", "open weight", "guardrail", "alignment", "safety",
]


def _is_ai_related(title: str) -> bool:
    lower = title.lower()
    return any(kw in lower for kw in AI_KEYWORDS)


async def parse_hackernews(config: dict) -> list[dict]:
    min_score = config.get("min_score") or 30
    if not isinstance(min_score, int) or min_score < 1:
        min_score = 30
    max_items = config.get("max_items") or 20
    if not isinstance(max_items, int) or max_items < 1:
        max_items = 20

    proxy = settings.https_proxy or settings.http_proxy
    async with httpx.AsyncClient(timeout=30, proxy=proxy) as client:
        # 获取 top stories
        r = await client.get("https://hacker-news.firebaseio.com/v0/topstories.json")
        r.raise_for_status()
        all_ids = r.json()[:200]  # 取前 200 条

        items: list[dict] = []
        sem = asyncio.Semaphore(10)

        async def _fetch(story_id: int):
            async with sem:
                try:
                    item_r = await client.get(
                        f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
                    )
                    item_r.raise_for_status()
                    return item_r.json()
                except Exception:
                    return None

        results = await asyncio.gather(*[_fetch(sid) for sid in all_ids])

        for data in results:
            if not data:
                continue
            if data.get("type") != "story":
                continue
            title = data.get("title") or ""
            if not _is_ai_related(title):
                continue
            score = data.get("score") or 0
            if score < min_score:
                continue
            published_dt = None
            ts = data.get("time")
            if ts:
                try:
                    published_dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                except Exception:
                    pass
            source_item_id = str(data["id"])
            url = data.get("url") or f"https://news.ycombinator.com/item?id={source_item_id}"
            items.append(
                {
                    "source_item_id": source_item_id,
                    "url": url,
                    "published_at": published_dt,
                    "content": {
                        "title": title,
                        "score": score,
                        "by": data.get("by"),
                        "descendants": data.get("descendants"),
                        "url": url,
                    },
                }
            )
            if len(items) >= max_items:
                break

        return items


def render_text_for_llm(content: dict) -> str:
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            content = {}
    title = content.get("title") or ""
    score = f"HN score: {content.get('score')}" if content.get("score") else ""
    url = content.get("url") or ""
    parts = [p for p in [title, score, url] if p]
    return "\n".join(parts).strip()
