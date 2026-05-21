# 🐂 牛马程小报

AI 驱动的多源新闻聚合平台，自动从 RSS、学术论文、社交媒体、开源社区等渠道抓取素材，经 LLM 处理后生成结构化中文新闻卡片。

## 功能特性

- **多数据源接入**：支持 RSS、HuggingFace Daily Papers、HackerNews、GitHub Trending、Semantic Scholar、X/Twitter
- **AI 智能处理**：自动翻译、摘要、要点提取、标签生成、实体识别、重要性评分
- **频道空间**：按领域（AI、财经等）隔离管理，空间内支持子频道分类
- **实时推送**：通过 WebSocket 推送新消息，前端实时更新
- **轻量部署**：FastAPI + Worker 双进程架构，2C2G 即可运行

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 API | FastAPI + SQLAlchemy (async) |
| Worker | asyncio + asyncpg (直连) |
| 数据库 | PostgreSQL (Supabase) |
| LLM | OpenAI 兼容 API (DeepSeek / GPT 等) |
| 前端 | Vue 3 + TypeScript + Vite |

## 快速开始

### 1. 创建数据库

在 Supabase 的 SQL Editor 中执行 [`db/schema.sql`](db/schema.sql)。

### 2. 配置环境变量

```bash
cp .env.example .env
```

填写必要配置：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `OPENAI_API_KEY` | LLM API Key |
| `X_BEARER_TOKEN` | X/Twitter API Token（可选） |

### 3. 启动后端

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. 启动 Worker

```bash
python -m worker.main
```

### 5. 启动前端

```bash
cd frontend
npm install
npm run dev
```

或使用一键启动脚本：

```bash
bash start.sh
```

### 6. 创建数据源

```bash
# 创建频道空间
curl -X POST http://localhost:8000/v1/channel-spaces \
  -H "Content-Type: application/json" \
  -d '{"name":"AI","description":"AI news"}'

# 创建 Source（以 RSS 为例）
curl -X POST http://localhost:8000/v1/sources \
  -H "Content-Type: application/json" \
  -d '{"type":"rss","name":"arxiv-cs-AI","config":{"feed_url":"https://rss.arxiv.org/rss/cs.AI"}}'

# 绑定到频道空间
curl -X POST http://localhost:8000/v1/channel-spaces/{space_id}/sources \
  -H "Content-Type: application/json" \
  -d '{"source_id":"{source_id}","enabled":true,"fetch_policy":{"schedule":{"every_seconds":600}}}'
```

## 项目结构

```
├── app/                  # FastAPI 后端
│   ├── main.py          # 入口 + 路由挂载
│   ├── routes.py        # REST API 路由
│   ├── models.py        # SQLAlchemy 模型
│   ├── schemas.py       # Pydantic Schema
│   ├── ws_manager.py    # WebSocket 管理
│   └── settings.py      # 配置
├── worker/              # 抓取 + LLM 处理 Worker
│   ├── main.py          # 调度器 + 任务执行
│   ├── llm.py           # LLM 调用与输出校验
│   ├── fetch_*.py       # 各数据源抓取器
│   └── db.py            # asyncpg 连接池
├── frontend/            # Vue 3 前端
├── db/                  # 数据库 schema + 迁移
├── deploy/              # 部署配置（systemd）
└── docs/                # 设计文档
```

## 支持的数据源

| 类型 | Source Type | 说明 |
|------|-------------|------|
| RSS | `rss` | 任意 RSS/Atom Feed |
| HuggingFace Papers | `hf_daily_papers` | HF Daily Papers API |
| HackerNews | `hacker_news` | HackerNews Top/Best/New |
| GitHub Trending | `github_trending` | GitHub 趋势仓库 |
| Semantic Scholar | `semantic_scholar` | 学术论文搜索 |
| X/Twitter | `x_twitter` | 关键词搜索 / 账号追踪 |

## API 文档

启动后端后访问 `http://localhost:8000/docs` 查看完整 API 文档（Swagger UI）。

## License

[MIT](LICENSE)
