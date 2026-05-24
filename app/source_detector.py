from app.schemas import SourceType

# 域名/路径匹配表：(host_suffix, path_prefix, type)
# host_suffix 匹配规则：精确匹配 或 ".host_suffix" 结尾（防止子域名误判）
# path_prefix 为空时仅匹配域名
_DOMAIN_RULES: list[tuple[str, str, SourceType]] = [
    ("x.com", "", SourceType.x_twitter),
    ("twitter.com", "", SourceType.x_twitter),
    ("github.com", "", SourceType.github_trending),
    ("huggingface.co", "/papers", SourceType.hf_daily_papers),
    ("news.ycombinator.com", "", SourceType.hacker_news),
    ("semanticscholar.org", "", SourceType.semantic_scholar),
]

_RSS_PATH_PATTERNS = ["/feed/", "/rss/", "/feeds/posts/default"]
_RSS_SUFFIXES = [".xml", ".rss", ".atom"]
_RSS_CONTENT_TYPES = ["application/rss+xml", "application/atom+xml"]


def _host_matches(host: str, suffix: str) -> bool:
    """域名精确匹配或子域名匹配（避免 x.com 误匹配 x.com.evil.com）。"""
    return host == suffix or host.endswith("." + suffix)


def detect_type_from_url(source_url: str) -> SourceType:
    """基于 URL 特征识别 Source 类型（不含 HTTP 请求）。"""
    from urllib.parse import urlparse

    parsed = urlparse(source_url)
    host = (parsed.hostname or "").lower()
    path = parsed.path.lower()

    for host_suffix, path_prefix, st in _DOMAIN_RULES:
        if _host_matches(host, host_suffix):
            if not path_prefix or path.startswith(path_prefix):
                return st

    for pat in _RSS_PATH_PATTERNS:
        if pat in path:
            return SourceType.rss

    for suf in _RSS_SUFFIXES:
        if path.endswith(suf):
            return SourceType.rss

    return SourceType.unknown


async def detect_type_with_http(source_url: str, timeout: float = 3.0) -> SourceType:
    """当 URL 特征无法判定时，发起 HEAD 请求检查 Content-Type。"""
    base = detect_type_from_url(source_url)
    if base != SourceType.unknown:
        return base

    import httpx

    from app.settings import settings

    proxy = settings.https_proxy or settings.http_proxy
    try:
        async with httpx.AsyncClient(
            timeout=timeout, proxy=proxy, follow_redirects=True
        ) as client:
            resp = await client.head(source_url)
            ct = resp.headers.get("content-type", "")
            for rss_ct in _RSS_CONTENT_TYPES:
                if rss_ct in ct:
                    return SourceType.rss
    except Exception:
        pass

    return SourceType.unknown
