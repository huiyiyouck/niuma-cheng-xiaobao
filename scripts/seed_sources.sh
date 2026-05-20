#!/bin/bash
# 一键创建 10 个 AI 信息源
# 用法: ./scripts/seed_sources.sh [API_BASE_URL]
# 默认 API_BASE_URL=http://localhost:8000

API="${1:-http://localhost:8000}"

echo ">>> 在 $API 创建 Sources ..."

# --- RSS 源（7 个，复用现有 rss type）---

# 1. arXiv cs.AI
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"arxiv-cs-AI","config":{"feed_url":"https://rss.arxiv.org/rss/cs.AI"}}' | jq -r '.id + " ← " + .name'

# 2. arXiv cs.LG
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"arxiv-cs-LG","config":{"feed_url":"https://rss.arxiv.org/rss/cs.LG"}}' | jq -r '.id + " ← " + .name'

# 3. arXiv cs.CL
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"arxiv-cs-CL","config":{"feed_url":"https://rss.arxiv.org/rss/cs.CL"}}' | jq -r '.id + " ← " + .name'

# 4. OpenAI Blog（官方 RSS 不稳定，用 openrss.org 代理）
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"openai-blog","config":{"feed_url":"https://openrss.org/openai.com/news"}}' | jq -r '.id + " ← " + .name'

# 5. Anthropic Research（无官方 RSS，用 Olshansk 社区爬取）
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"anthropic-research","config":{"feed_url":"https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_research.xml"}}' | jq -r '.id + " ← " + .name'

# 6. DeepMind Blog
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"deepmind-blog","config":{"feed_url":"https://deepmind.com/blog/feed/basic/"}}' | jq -r '.id + " ← " + .name'

# 7. Meta AI Blog（无官方 RSS，用 Olshansk 社区爬取）
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"meta-ai-blog","config":{"feed_url":"https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_meta_ai.xml"}}' | jq -r '.id + " ← " + .name'

# 8. TechCrunch AI
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"techcrunch-ai","config":{"feed_url":"https://techcrunch.com/category/artificial-intelligence/feed/"}}' | jq -r '.id + " ← " + .name'

# --- API 源（3 个，需新 Source Type，先创建 Source 记录）---

# 9. HuggingFace Daily Papers（已有 hf_daily_papers type）
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"hf_daily_papers","name":"hf-daily-papers","config":{}}' | jq -r '.id + " ← " + .name'

# 10. Hacker News（新 hacker_news type）
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"hacker_news","name":"hacker-news-ai","config":{"min_score":30,"max_items":20}}' | jq -r '.id + " ← " + .name'

# 11. GitHub Trending（新 github_trending type）
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"github_trending","name":"github-trending-ai","config":{"since":"daily","language":""}}' | jq -r '.id + " ← " + .name'

# 12. Semantic Scholar（新 semantic_scholar type）
curl -s -X POST "$API/v1/sources" -H "Content-Type: application/json" \
  -d '{"type":"semantic_scholar","name":"semantic-scholar-ai","config":{"query":"artificial intelligence","limit":50}}' | jq -r '.id + " ← " + .name'

echo ""
echo ">>> 完成。把上述 Source ID 绑定到 ChannelSpace 即可开始抓取。"
