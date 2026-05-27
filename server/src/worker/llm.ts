import { config } from "../shared/config.ts";

interface NewsCard {
  title: string;
  summary: string;
  language: string;
  bullets: string[];
  tags: string[];
  entities: Array<{ name: string; type: string }>;
  importance_score: number;
}

// 从 LLM 返回文本中提取第一个完整 JSON 对象
function extractFirstJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function validateLLMOutput(result: Record<string, unknown>): NewsCard {
  let title = typeof result.title === "string" && result.title.trim()
    ? result.title
    : "无标题";
  let summary = typeof result.summary === "string" && result.summary.trim()
    ? result.summary
    : title;
  let bullets: string[] = Array.isArray(result.bullets)
    ? result.bullets.filter((b): b is string => typeof b === "string" && !!b).slice(0, 5)
    : [];
  let tags: string[] = Array.isArray(result.tags)
    ? result.tags.filter((t): t is string => typeof t === "string" && !!t).slice(0, 5)
    : [];
  let entities: Array<{ name: string; type: string }> = Array.isArray(result.entities)
    ? result.entities.filter(
        (e): e is { name: string; type: string } =>
          typeof e === "object" && e !== null && typeof e.name === "string" && !!e.name,
      )
    : [];

  let score = Number(result.importance_score);
  if (isNaN(score)) score = 0;
  score = Math.max(0, Math.min(10, score));

  let language = typeof result.language === "string" && result.language.trim()
    ? result.language
    : "zh";

  return { title, summary, language, bullets, tags, entities, importance_score: score };
}

export async function processLLM(text: string, sourceUrl?: string | null): Promise<NewsCard> {
  if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY is required");

  const prompt = `把下面内容处理成中文新闻卡片，做翻译与深度摘要。
要求：
1) 如果原文是英文，翻译成中文
2) 输出中文标题(title)和中文摘要(summary)
3) summary 80-200 字
4) 提炼 3-5 个核心要点(bullets)，每个不超过 50 字
5) 生成 3-5 个分类标签(tags)
6) 识别关键实体(entities)，每个包含 name 和 type(person/org/product/tech)
7) 评估重要性评分(importance_score)，0-10 浮点数，考虑时效性、影响力、相关性
8) 只输出严格 JSON，不要输出多余文字
JSON 格式：{"title":"...","summary":"...","bullets":["..."],"tags":["..."],"entities":[{"name":"...","type":"..."}],"importance_score":7.5,"language":"zh"}
source_url: ${sourceUrl || ""}

content:
${text}`;

  let lastErr: Error | null = null;
  const maxRetries = Math.max(1, config.llmMaxRetries);
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 60000);

      const resp = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.openaiModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
      clearTimeout(t);

      if ([429, 500, 502, 503, 504].includes(resp.status)) {
        throw new Error(`LLM retryable error: HTTP ${resp.status}`);
      }
      if (!resp.ok) {
        throw new Error(`LLM error: HTTP ${resp.status} ${await resp.text()}`);
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "";
      lastErr = null;

      let obj: Record<string, unknown>;
      try {
        obj = JSON.parse(content);
      } catch {
        const extracted = extractFirstJsonObject(content);
        if (!extracted) throw new Error(`LLM returned unparseable content: ${content.slice(0, 200)}`);
        obj = extracted;
      }

      if (typeof obj === "string") {
        try {
          obj = JSON.parse(obj);
        } catch {
          obj = { title: "", summary: obj, language: "zh" };
        }
      }

      return validateLLMOutput(obj);
    } catch (err: any) {
      lastErr = err;
      if (i >= maxRetries - 1) break;
      const delay = config.llmRetryBaseSeconds * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
    }
  }

  throw lastErr || new Error("LLM processing failed");
}
