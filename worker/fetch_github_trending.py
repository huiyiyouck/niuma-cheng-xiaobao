import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from typing import Optional

import httpx

from app.settings import settings

AI_TOPICS = [
    "ai", "artificial-intelligence", "machine-learning", "deep-learning",
    "llm", "large-language-model", "nlp", "natural-language-processing",
    "computer-vision", "generative-ai", "rag", "agent", "transformer",
    "diffusion", "text-to-speech", "speech-recognition", "openai",
    "langchain", "llama", "gpt", "chatgpt", "claude", "gemini",
    "stable-diffusion", "neural-network", "reinforcement-learning",
    "ml", "data-science", "pytorch", "tensorflow", "jax",
]


def _is_ai_repo(desc: str, language: str, topics: list[str]) -> bool:
    text = f"{desc or ''} {' '.join(topics or [])} {language or ''}".lower()
    return any(t in text for t in AI_TOPICS)


class _TrendingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.repos: list[dict] = []
        self._in_article = False
        self._in_h2 = False
        self._in_desc = False
        self._current: dict = {}
        self._data_buf: str = ""

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        cls = attrs_dict.get("class") or ""

        if tag == "article" and "Box-row" in cls:
            self._in_article = True
            self._current = {}

        if self._in_article:
            if tag == "h2":
                self._in_h2 = True
            if tag == "p" and not self._in_desc:
                self._in_desc = True

            if tag == "a" and attrs_dict.get("href") and not self._current.get("url"):
                href = attrs_dict["href"]
                if href.startswith("/") and "/" in href[1:]:
                    self._current["url"] = f"https://github.com{href}"
            if tag == "span" and "repo-language-color" in cls and attrs_dict.get("itemprop") == "programmingLanguage":
                self._data_buf = ""

    def handle_endtag(self, tag):
        if self._in_article and tag == "article":
            self._in_article = False
            if self._current.get("name"):
                self.repos.append(self._current)
            self._current = {}
        if tag == "h2":
            self._in_h2 = False
        if tag == "p" and self._in_desc:
            self._in_desc = False

    def handle_data(self, data):
        if self._in_article and self._in_h2:
            text = data.strip()
            if text:
                self._current["name"] = text.replace("\n", "").replace(" ", "")
        if self._in_article and self._in_desc:
            text = data.strip()
            if text:
                self._current["description"] = text


async def parse_github_trending(config: dict) -> list[dict]:
    since = config.get("since") or "daily"
    language = config.get("language") or ""
    max_items = config.get("max_items") or 25
    if not isinstance(max_items, int) or max_items < 1:
        max_items = 25

    url = f"https://github.com/trending?since={since}"
    if language:
        url += f"&l={language}"

    proxy = settings.https_proxy or settings.http_proxy
    async with httpx.AsyncClient(timeout=30, proxy=proxy, follow_redirects=True) as client:
        r = await client.get(url, headers={"Accept": "text/html"})
        r.raise_for_status()
        parser = _TrendingParser()
        parser.feed(r.text)

        # 用 GitHub Search API 补充 topic 信息做 AI 过滤
        items: list[dict] = []
        for repo in parser.repos[:max_items * 2]:  # 多取一些，过滤后不足
            name = repo.get("name") or ""
            if "/" not in name:
                continue
            owner, repo_name = name.split("/", 1)
            desc = repo.get("description") or ""
            # 快速检查：描述中是否包含 AI 关键词
            if not _is_ai_repo(desc, "", []):
                # 进一步检查：查 GitHub API 获取 topics
                try:
                    api_r = await client.get(
                        f"https://api.github.com/repos/{owner}/{repo_name}",
                        headers={"Accept": "application/vnd.github+json"},
                    )
                    if api_r.status_code == 200:
                        data = api_r.json()
                        topics = data.get("topics") or []
                        if not _is_ai_repo(desc, data.get("language") or "", topics):
                            continue
                        desc = data.get("description") or desc
                    else:
                        continue
                except Exception:
                    continue

            items.append(
                {
                    "source_item_id": name,
                    "url": repo.get("url") or f"https://github.com/{name}",
                    "published_at": datetime.now(tz=timezone.utc),
                    "content": {
                        "repo": name,
                        "description": desc,
                        "url": repo.get("url") or f"https://github.com/{name}",
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
    repo = content.get("repo") or ""
    desc = content.get("description") or ""
    url = content.get("url") or ""
    parts = [p for p in [repo, desc, url] if p]
    return "\n".join(parts).strip()
