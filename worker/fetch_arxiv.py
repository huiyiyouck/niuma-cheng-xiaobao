import json

import feedparser
from dateutil import parser as date_parser


def parse_rss(feed_text: str) -> list[dict]:
    parsed = feedparser.parse(feed_text)
    items: list[dict] = []
    for entry in parsed.entries:
        source_item_id = entry.get("id") or entry.get("guid") or entry.get("link")
        if not source_item_id:
            continue
        published_at = None
        if entry.get("published"):
            try:
                published_at = date_parser.parse(entry["published"])
            except Exception:
                published_at = None
        items.append(
            {
                "source_item_id": str(source_item_id),
                "url": entry.get("link"),
                "published_at": published_at,
                "content": {
                    "title": entry.get("title"),
                    "summary": entry.get("summary"),
                    "authors": [a.get("name") for a in entry.get("authors", []) if a.get("name")],
                    "link": entry.get("link"),
                    "raw": entry,
                },
            }
        )
    return items


def render_text_for_llm(content: dict) -> str:
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            content = {}
    title = content.get("title") or ""
    summary = content.get("summary") or ""
    return f"{title}\n\n{summary}".strip()
