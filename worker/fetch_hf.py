import json

from dateutil import parser as date_parser


def parse_daily_papers(items: list[dict]) -> list[dict]:
    result: list[dict] = []
    for entry in items:
        paper = entry.get("paper") or {}
        paper_id = paper.get("id") or entry.get("paper_id") or entry.get("id")
        if not paper_id:
            continue
        title = paper.get("title") or entry.get("title")
        summary = paper.get("summary") or entry.get("summary")
        published_at = paper.get("publishedAt") or entry.get("publishedAt")
        published_dt = None
        if published_at:
            try:
                published_dt = date_parser.parse(published_at)
            except Exception:
                published_dt = None
        url = f"https://huggingface.co/papers/{paper_id}"
        result.append(
            {
                "source_item_id": str(paper_id),
                "url": url,
                "published_at": published_dt,
                "content": {
                    "paper_id": str(paper_id),
                    "title": title,
                    "summary": summary,
                    "ai_summary": paper.get("ai_summary") or entry.get("ai_summary"),
                    "ai_keywords": paper.get("ai_keywords") or entry.get("ai_keywords"),
                    "authors": [a.get("name") for a in paper.get("authors", []) if a.get("name")],
                    "project_page": paper.get("projectPage") or entry.get("projectPage"),
                    "github_repo": paper.get("githubRepo") or entry.get("githubRepo"),
                    "raw": entry,
                },
            }
        )
    return result


def render_text_for_llm(content: dict) -> str:
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            content = {}
    title = content.get("title") or ""
    summary = content.get("summary") or ""
    ai_summary = content.get("ai_summary") or ""
    parts = [title, summary, ai_summary]
    return "\n\n".join([p for p in parts if p]).strip()
