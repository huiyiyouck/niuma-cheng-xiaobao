import asyncio
import json
from typing import Optional

import httpx

from app.settings import settings


def _extract_first_json_object(text: str) -> Optional[dict]:
    """从 LLM 返回文本中提取第一个完整 JSON 对象，避免 rfind('}') 误匹配多个 JSON 块。"""
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start : i + 1])
                except Exception:
                    return None
    return None


def validate_llm_output(result: dict) -> dict:
    """校验并修正 LLM 输出，确保字段完整且类型正确。"""
    title = result.get("title")
    if not isinstance(title, str) or not title.strip():
        result["title"] = "无标题"

    summary = result.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        result["summary"] = result.get("title", "")

    bullets = result.get("bullets")
    if not isinstance(bullets, list):
        bullets = []
    result["bullets"] = [str(b) for b in bullets if b][:5]

    tags = result.get("tags")
    if not isinstance(tags, list):
        tags = []
    result["tags"] = [str(t) for t in tags if t][:5]

    entities = result.get("entities")
    if not isinstance(entities, list):
        entities = []
    result["entities"] = [
        e for e in entities
        if isinstance(e, dict) and e.get("name")
    ]

    score = result.get("importance_score")
    try:
        score = float(score)
    except (TypeError, ValueError):
        score = 0.0
    result["importance_score"] = max(0.0, min(10.0, score))

    result["language"] = "zh"

    return result


async def translate_and_summarize(text: str, source_url: Optional[str]) -> dict:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required")

    prompt = {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": (
                    "把下面内容处理成中文新闻卡片，做翻译与深度摘要。\n"
                    "要求：\n"
                    "1) 如果原文是英文，翻译成中文\n"
                    "2) 输出中文标题(title)和中文摘要(summary)\n"
                    "3) summary 80-200 字\n"
                    "4) 提炼 3-5 个核心要点(bullets)，每个不超过 50 字\n"
                    "5) 生成 3-5 个分类标签(tags)\n"
                    "6) 识别关键实体(entities)，每个包含 name 和 type(person/org/product/tech)\n"
                    "7) 评估重要性评分(importance_score)，0-10 浮点数，考虑时效性、影响力、相关性\n"
                    "8) 只输出严格 JSON，不要输出多余文字\n"
                    'JSON 格式：{"title":"...","summary":"...","bullets":["..."],"tags":["..."],'
                    '"entities":[{"name":"...","type":"..."}],"importance_score":7.5,"language":"zh"}\n'
                    f"source_url: {source_url or ''}\n\n"
                    f"content:\n{text}"
                ),
            }
        ],
    }

    content = ""
    proxy = settings.https_proxy or settings.http_proxy
    async with httpx.AsyncClient(timeout=60, proxy=proxy) as client:
        last_exc: Optional[Exception] = None
        for i in range(max(1, settings.llm_max_retries)):
            try:
                resp = await client.post(
                    f"{settings.openai_base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    json={
                        "model": settings.openai_model,
                        "messages": [prompt],
                        "temperature": 0.2,
                    },
                )
                if resp.status_code in {429, 500, 502, 503, 504}:
                    raise httpx.HTTPStatusError("retryable", request=resp.request, response=resp)
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                last_exc = None
                break
            except Exception as e:
                last_exc = e
                if i >= max(1, settings.llm_max_retries) - 1:
                    break
                await asyncio.sleep(settings.llm_retry_base_seconds * (2**i))
        if last_exc:
            raise last_exc

    try:
        obj = json.loads(content)
    except Exception:
        obj = _extract_first_json_object(content)
        if obj is None:
            raise RuntimeError(f"LLM returned unparseable content: {content[:200]!r}")

    if isinstance(obj, str):
        try:
            obj = json.loads(obj)
        except Exception:
            obj = {"title": "", "summary": obj, "language": "zh"}

    obj = validate_llm_output(obj)
    return obj
