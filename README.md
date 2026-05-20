# News Aggregator MVP

## 1. 创建数据库表（Supabase）

在 Supabase 项目的 SQL Editor 执行：
- [schema.sql](file:///Users/ck/Project/New_Project/db/schema.sql)

## 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写：
- `DATABASE_URL`：Supabase Postgres 连接串（建议使用 `postgresql+asyncpg://...`）
- `ADMIN_ALLOWED_IPS`：允许调用写接口与 `/v1/alerts` 的 IP（逗号分隔）
- `OPENAI_API_KEY`

## 3. 安装依赖

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 4. 启动 API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 5. 启动 Worker

```bash
python -m worker.main
```

## 6. 启动前端（Vue3 + TS）

```bash
cd frontend
npm install
npm run dev
```

默认前端地址：`http://localhost:5173/`

如需指定后端地址，在 `frontend/.env.local` 写入：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WS_BASE_URL=ws://127.0.0.1:8000/ws
```

## 7. 最小可用配置（创建空间/渠道/绑定）

从 `ADMIN_ALLOWED_IPS` 的机器上调用：

```bash
curl -X POST http://localhost:8000/v1/channel-spaces \
  -H "Content-Type: application/json" \
  -d '{"name":"AI","description":"AI news"}'
```

创建 arXiv RSS source（示例）：

```bash
curl -X POST http://localhost:8000/v1/sources \
  -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"arxiv-cs-ai","config":{"feed_url":"https://rss.arxiv.org/rss/cs.AI"}}'
```

创建 HF Daily Papers source：

```bash
curl -X POST http://localhost:8000/v1/sources \
  -H "Content-Type: application/json" \
  -d '{"type":"hf_daily_papers","name":"hf-daily-papers","config":{}}'
```

绑定到频道空间（把 `{space_id}`、`{source_id}` 替换成真实值）：

```bash
curl -X POST http://localhost:8000/v1/channel-spaces/{space_id}/sources \
  -H "Content-Type: application/json" \
  -d '{"source_id":"{source_id}","enabled":true,"fetch_policy":{"schedule":{"every_seconds":600},"budget":{"max_items_per_run":20}}}'
```

## 8. 前端拉取与 WS

- 列表：`GET /v1/channel-spaces/{space_id}/news?limit=20&offset=0`
- 详情：`GET /v1/news/{news_id}`
- WS：连接 `ws://{host}:8000/ws`，发送 `{"type":"subscribe","channel_space_id":"{space_id}"}`，接收 `news.processed`
