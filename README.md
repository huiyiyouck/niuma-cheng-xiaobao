# 🐂 牛马程小报

AI 驱动的多源新闻聚合平台，自动从 RSS、社交媒体等渠道抓取素材，经 LLM 处理后生成结构化中文新闻卡片。

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 API | Node.js + Fastify + TypeScript |
| Worker | 同进程内置调度器 |
| 数据库 | PostgreSQL + Drizzle ORM |
| LLM | OpenAI 兼容 API |
| 前端 | Vue 3 + TypeScript + Vite |

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `OPENAI_API_KEY` | LLM API Key |
| `X_BEARER_TOKEN` | X/Twitter API Token（可选） |

### 2. 启动后端（含 Worker）

```bash
cd server
npm install
npm run dev
```

API + Worker 同进程运行，默认端口 8000。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认端口 5173，访问 `http://localhost:5173`。

### 4. 创建数据源

```bash
# 创建频道空间
curl -X POST http://localhost:8000/v1/channel-spaces \
  -H "Content-Type: application/json" \
  -d '{"name":"AI","description":"AI news"}'

# 创建 RSS Source
curl -X POST http://localhost:8000/v1/sources \
  -H "Content-Type: application/json" \
  -d '{"display_name":"arxiv-cs-AI","type":"rss","source_url":"https://rss.arxiv.org/rss/cs.AI"}'

# 绑定到频道空间
curl -X POST http://localhost:8000/v1/channel-spaces/{space_id}/sources \
  -H "Content-Type: application/json" \
  -d '{"source_id":"{source_id}","enabled":true}'
```

## 项目结构

```
├── server/               # Node.js 后端 + Worker
│   └── src/
│       ├── api/          # Fastify API (路由/中间件/Schema)
│       └── worker/       # 调度器 + Fetcher + LLM
├── frontend/             # Vue 3 前端
├── db/                   # 数据库 schema + 迁移
├── deploy/               # 部署配置（systemd）
└── docs/                 # 设计文档
```

## 支持的数据源

| 类型 | Source Type | 说明 |
|------|-------------|------|
| RSS | `rss` | 标准 RSS/Atom Feed |
| X/Twitter | `x_twitter` | 关键词搜索 / 账号追踪 |

## API 文档

部署环境：`https://news.huiyiyou.cloud/v1/`

## License

[MIT](LICENSE)
