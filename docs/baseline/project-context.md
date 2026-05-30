# 项目上下文

> 本文件是项目适配层，只写项目事实。不要把通用工作流规则写在这里。

## 项目一句话
AI 驱动的多源新闻聚合平台。从 RSS/论文/社交/开源渠道抓取 → LLM 处理 → 结构化中文新闻卡片。

## 技术栈
FastAPI + SQLAlchemy async | Worker(asyncio+asyncpg) | PostgreSQL(Supabase) | Vue3+TS+Vite | OpenAI 兼容 LLM

## 启动方式
bash start.sh 或分别启动后端/Worker/前端，详见 docs/使用说明.md

## 关键环境变量
- DATABASE_URL
- OPENAI_API_KEY

## 业务边界
- 本项目做：多源新闻抓取、LLM 处理、结构化新闻卡片聚合
- 本项目不做：未定义

## 项目特有约束
- 中文沟通和注释
- 产出文档用 Markdown，含状态标记（待Review / Review中 / 修改中 / 已定稿）
- 禁止 force push；禁止跳过 Git hooks
- 同一迭代的同一阶段，同一时刻只允许一个角色进行写操作

## 状态说明

本文件只记录项目事实，不记录当前阶段、当前迭代状态或 Review 状态。

- 项目级当前状态维护在 `docs/progress/INDEX.md`。
- 迭代阶段细节维护在 `docs/progress/iterations/vX.Y.md`。
