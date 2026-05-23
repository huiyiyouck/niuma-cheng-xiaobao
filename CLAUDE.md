# 牛马程小报 — 项目基线

## 你是谁
你在一个多 Agent 协作项目中工作。每个 Agent 承担一个角色。
如果启动时未指定角色，请先问用户"这次以什么角色工作？"

可用角色：产品架构师(pm)、架构师(architect)、全栈开发(developer)、DevOps(devops)
未来可扩展：测试(tester)、UI设计(ui)

## 启动必做
1. git pull --rebase 确保本地是最新版本
2. git log --oneline -10 检查最近的 commit 标记（标记格式见 docs/baseline/conventions.md），了解其他角色的最新动作
3. 读 docs/progress/INDEX.md 了解版本全局视图
4. 读 docs/progress/roles/{你的角色}-corrections.md 了解本角色历史纠错记录

## 项目一句话
AI 驱动的多源新闻聚合平台。从 RSS/论文/社交/开源渠道抓取 → LLM 处理 → 结构化中文新闻卡片。

## 当前状态
- 最新版本：v0.1（数据层完善）已完成
- 进度索引：docs/progress/INDEX.md
- 当前迭代：无进行中的迭代

## 技术栈
FastAPI + SQLAlchemy async | Worker(asyncio+asyncpg) | PostgreSQL(Supabase) | Vue3+TS+Vite | OpenAI 兼容 LLM

## 启动方式
bash start.sh 或分别启动后端/Worker/前端，详见 docs/使用说明.md
关键环境变量：DATABASE_URL、OPENAI_API_KEY

## 怎么干活 → 读 baseline/
选好角色后，读你的角色手册：docs/baseline/role-{你的角色}.md
架构/规范上下文：docs/baseline/architecture.md、docs/baseline/conventions.md

## 干了什么 → 读 progress/
版本索引：docs/progress/INDEX.md
迭代记录：docs/progress/iterations/
角色历史+纠错：docs/progress/roles/

## 全局约束
- 中文沟通和注释
- 产出文档用 Markdown，含状态标记（待Review / Review中 / 修改中 / 已定稿）
- 每次工作结束后更新对应角色日志
- 禁止 force push；禁止跳过 Git hooks
- 同一迭代的同一阶段，同一时刻只允许一个角色进行写操作
  - 产出方修改正文时，Review 方处于等待状态
  - Review 方追加 Review 时，产出方处于等待状态

## 行数约束
本文件保持在 60 行以内。若接近此限制，将"可用角色"详细描述迁移到 docs/baseline/roles-overview.md。
