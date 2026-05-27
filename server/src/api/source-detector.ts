// Source 类型识别（等价 Python source_detector.py）

export enum SourceType {
  x_twitter = "x_twitter",
  rss = "rss",
  github_trending = "github_trending",
  hf_daily_papers = "hf_daily_papers",
  hacker_news = "hacker_news",
  semantic_scholar = "semantic_scholar",
  unknown = "unknown",
}

// 域名/路径匹配表：(hostSuffix, pathPrefix, type)
const DOMAIN_RULES: Array<[string, string, SourceType]> = [
  ["x.com", "", SourceType.x_twitter],
  ["twitter.com", "", SourceType.x_twitter],
  ["github.com", "", SourceType.github_trending],
  ["huggingface.co", "/papers", SourceType.hf_daily_papers],
  ["news.ycombinator.com", "", SourceType.hacker_news],
  ["semanticscholar.org", "", SourceType.semantic_scholar],
];

const RSS_PATH_PATTERNS = ["/feed/", "/rss/", "/feeds/posts/default"];
const RSS_SUFFIXES = [".xml", ".rss", ".atom"];
const RSS_CONTENT_TYPES = ["application/rss+xml", "application/atom+xml"];

function hostMatches(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith("." + suffix);
}

export function detectTypeFromUrl(sourceUrl: string): SourceType {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return SourceType.unknown;
  }
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  for (const [hostSuffix, pathPrefix, st] of DOMAIN_RULES) {
    if (hostMatches(host, hostSuffix)) {
      if (!pathPrefix || path.startsWith(pathPrefix)) {
        return st;
      }
    }
  }

  for (const pat of RSS_PATH_PATTERNS) {
    if (path.includes(pat)) return SourceType.rss;
  }
  for (const suf of RSS_SUFFIXES) {
    if (path.endsWith(suf)) return SourceType.rss;
  }

  return SourceType.unknown;
}

export async function detectTypeWithHttp(
  sourceUrl: string,
  timeoutMs: number = 3000,
): Promise<SourceType> {
  const base = detectTypeFromUrl(sourceUrl);
  if (base !== SourceType.unknown) return base;

  // 仅允许 http/https 协议，阻断 file:// 等 SSRF 风险
  if (!/^https?:\/\//i.test(sourceUrl)) return SourceType.unknown;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(sourceUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(t);
    const ct = resp.headers.get("content-type") || "";
    for (const rssCt of RSS_CONTENT_TYPES) {
      if (ct.includes(rssCt)) return SourceType.rss;
    }
  } catch {
    // 失败则返回 unknown
  }

  return SourceType.unknown;
}
