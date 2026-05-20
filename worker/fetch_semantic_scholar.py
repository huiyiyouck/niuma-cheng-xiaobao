import json
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.settings import settings

FIELDS = ",".join([
    "title", "abstract", "year", "venue", "publicationDate",
    "citationCount", "influentialCitationCount", "externalIds",
    "authors", "url", "paperId",
])


async def parse_semantic_scholar(config: dict) -> list[dict]:
    query = config.get("query") or "artificial intelligence"
    limit = config.get("limit") or 50
    if not isinstance(limit, int) or limit < 1:
        limit = 50
    limit = min(limit, 100)

    proxy = settings.https_proxy or settings.http_proxy
    url = (
        f"https://api.semanticscholar.org/graph/v1/paper/search"
        f"?query={httpx.QueryParam(query)}"
        f"&limit={limit}"
        f"&sort=publicationDate:desc"
        f"&fields={FIELDS}"
    )
    async with httpx.AsyncClient(timeout=30, proxy=proxy) as client:
        r = await client.get(url)
        r.raise_for_status()
        data = r.json()

        items: list[dict] = []
        for paper in data.get("data") or []:
            paper_id = paper.get("paperId")
            if not paper_id:
                continue
            title = paper.get("title") or ""
            abstract = paper.get("abstract") or ""
            if not title and not abstract:
                continue

            pub_dt: Optional[datetime] = None
            pub_date = paper.get("publicationDate")
            if pub_date:
                try:
                    pub_dt = datetime.fromisoformat(pub_date).replace(tzinfo=timezone.utc)
                except Exception:
                    pass

            ext_ids = paper.get("externalIds") or {}
            arxiv_id = ext_ids.get("ArXiv")
            doi = ext_ids.get("DOI")
            paper_url = paper.get("url") or (
                f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id
                else f"https://doi.org/{doi}" if doi
                else f"https://api.semanticscholar.org/{paper_id}"
            )

            items.append({
                "source_item_id": paper_id,
                "url": paper_url,
                "published_at": pub_dt,
                "content": {
                    "paper_id": paper_id,
                    "title": title,
                    "abstract": abstract,
                    "year": paper.get("year"),
                    "venue": paper.get("venue"),
                    "citation_count": paper.get("citationCount"),
                    "influential_citations": paper.get("influentialCitationCount"),
                    "authors": [a.get("name") for a in paper.get("authors", []) if a.get("name")],
                    "arxiv_id": arxiv_id,
                    "doi": doi,
                },
            })
        return items


def render_text_for_llm(content: dict) -> str:
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            content = {}
    title = content.get("title") or ""
    abstract = content.get("abstract") or ""
    venue = content.get("venue") or ""
    year = content.get("year") or ""
    venue_info = f"Published: {venue} ({year})" if venue else f"Year: {year}" if year else ""
    parts = [p for p in [title, abstract, venue_info] if p]
    return "\n\n".join(parts).strip()
