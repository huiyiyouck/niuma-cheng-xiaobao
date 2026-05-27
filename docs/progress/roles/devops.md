# DevOps 工作日志

## 2026-05-27 — v0.3 本地部署验证

- 本次角色：DevOps（兼职，全栈开发兼任）
- 动作：部署验证
- 部署目标：本地生产（Node.js v22.22.0 直跑，无 Docker）
- 涉及文件：`server/start.sh`（新增启动脚本）
- 部署步骤：
  1. `npm install` 安装依赖
  2. `nohup npx tsx src/index.ts` 启动 API + Worker 同进程服务
  3. 健康检查 → API 端点验证 → Worker 调度验证
- 验证结果：全部通过
  - 健康检查 `/health` → `{"status":"ok"}`
  - Channel Spaces (4) / Sources (2) / Stats (20 news, 6 today, 1 active)
  - Worker fetch task 执行成功（@alpha123cc X推文）
- 结论：部署就绪。API + Worker 运行正常，数据库连接正常。
- 关联迭代：v0.3
- 遗留问题/风险：Docker 未安装，当前使用 nohup + tsx 直跑。若需生产环境（news.huiyiyou.cloud）部署，需先在该服务器上安装 Node.js 22 + npm 依赖 + 配置 systemd。

## 2026-05-26 — 补充配置 + 关机

- 前端更新：SourceManager 添加 X/Twitter 特有配置字段（抓取模式、搜索关键词、追踪账号）
- LLM 配置更新：切换为火山云 deepseek-v4-pro（`OPENAI_API_KEY` + `OPENAI_BASE_URL`）
- 前端静态目录优化：`/var/www/news.huiyiyou.cloud` 改为软链接指向 `frontend/dist`
- 服务关闭：news-api + news-worker 已停止并禁用开机自启，nginx + PostgreSQL 保留

## 2026-05-25 — 生产环境部署（news.huiyiyou.cloud）

- 目标：在服务器上部署完整服务，通过 nginx 反向代理提供 HTTPS 访问
- 数据库：本地 PostgreSQL 16（用户 `news`，库 `news`），9 张表初始化
- 前端：`npm run build` 静态文件部署到 `/var/www/news.huiyiyou.cloud/`
- 后端：systemd 管理 API + Worker，开机自启
- Nginx：反向代理 `/v1/` `/ws` `/docs` → `127.0.0.1:8000`，前端 SPA fallback
- SSL：Certbot 自动签发 Let's Encrypt，HTTPS 自动续期
- 健康检查：全部通过（前端/API/Worker/数据库/Nginx）
- 备注：部署中修复 1 个构建阻断（LogViewer.vue 未使用的 `getLogsConfig` 导入）+ 1 个配置问题（DATABASE_URL 缺少 `+asyncpg` 驱动前缀）
- 待用户填写：OPENAI_API_KEY

## 2026-05-24 — v0.2 部署就绪检查

- 产出：v0.2 本地部署 + 健康检查
- 启动结果：API + Worker + 前端全部启动成功
- 健康检查：7 项端点检查通过，1 项 Bug 阻塞
- Bug：Worker `fetch_and_ingest` 中 `row["display_name"]` 键名不匹配 → 开发已修复（`d92fab3`），重启后验证通过
- 详细报告：docs/progress/iterations/v0.2.md 部署就绪检查段

## 2026-05-23 — v0.1 部署就绪检查

- 产出：Dockerfile、docker-compose.yml
- 补充：.env.example 增加 POSTGRES_* 变量
- 部署验证：本地启动 API + 前端构建，全部通过
- 详细报告：docs/progress/iterations/v0.1.md 部署就绪检查段
