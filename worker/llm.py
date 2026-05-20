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


async def translate_and_summarize(text: str, source_url: Optional[str]) -> dict:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required")

    prompt = {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": (
                    "把下面内容处理成中文新闻卡片，只做翻译与摘要。\n"
                    "要求：\n"
                    "1) 如果原文是英文，翻译成中文\n"
                    "2) 输出中文标题(title)和中文摘要(summary)\n"
                    "3) summary 80-200 字\n"
                    "4) 只输出严格 JSON，不要输出多余文字\n"
                    "JSON 格式：{\"title\":\"...\",\"summary\":\"...\",\"language\":\"zh\"}\n"
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
    if obj.get("language") != "zh":
        obj["language"] = "zh"
    return obj
