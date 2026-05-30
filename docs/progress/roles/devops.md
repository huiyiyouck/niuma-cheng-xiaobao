# DevOps 工作日志

## 2026-05-30 — 会话收尾

- 本次会话：DevOps（运维/部署工程师），v0.4 部署阶段全程
- 完成工作：预部署检查（发现 #D1-#D5）→ 复审 R1（#D2 阻塞）→ 复审 R2（全部通过）→ 生产部署 → 重新部署
- 部署结果：✅ v0.4 已上线 https://news.huiyiyou.cloud/，所有验证通过
- 遗留：无 DevOps 侧遗留问题
- 下一步：用户浏览器视觉验证 → PM 复审测试报告 → 迭代关闭

## 2026-05-30 — v0.4 生产部署 ✅完成

- 本次角色：DevOps（运维/部署工程师）
- 动作：v0.4 生产环境部署
- 部署步骤：
  1. `npm install` — 依赖同步（package.json 已清理前端依赖）
  2. `npm run build` — 前端生产构建（vue-tsc + vite）
  3. 停止旧进程（PID 3782498，nohup 方式）
  4. `server/start.sh` 启动新服务（PID 3784214，API + Worker 同进程）
- 验证结果：全部通过
  - `/health` → `{"status":"ok"}`
  - 前端 HTTPS → HTTP 200
  - 频道空间 API → 4 个空间正常
  - 新闻查询 API → 正常（0 条，Worker 待新抓取）
  - Worker 日志 → 无报错，调度正常
- 前端部署：dist 通过软链接 `/var/www/news.huiyiyou.cloud/` → `frontend/dist` 自动生效
- 关联迭代：v0.4
- 下一步：用户浏览器视觉验证 → PM 复审测试报告 → 迭代关闭

## 2026-05-30 — v0.4 预部署检查再次复审 ✅部署就绪

- 本次角色：DevOps（运维/部署工程师）
- 动作：v0.4 部署再次复审（Developer 修复 #D2 后）
- 结论：✅**全部通过** — #D1-#D5 全部关闭，部署门禁满足
- 复审明细：
  - #D1 ✅ 前端构建通过
  - #D2 ✅ `server/package.json` 已清除前端依赖，node_modules 清理完毕
  - #D3 ✅ `ADMIN_TOKEN` 已配置
  - #D4 ✅ 迁移文件已就位
  - #D5 ⚠️ 维持，不阻塞
- 通过项（8/8）：DB 迁移 / TS 编译 / rss-parser / 环境变量 / 系统依赖 / start.sh / 服务运行 / 健康检查
- 下一步：执行部署 → 用户浏览器视觉验证 → 迭代关闭

## 2026-05-30 — v0.4 预部署检查复审（第一次）

## 2026-05-30 — v0.4 预部署检查

- 本次角色：DevOps（运维/部署工程师）
- 动作：v0.4 预部署检查
- 前置条件：实现阶段 ✅已定稿 / 测试阶段 ✅有条件通过（#B1-#B3 全部修复）
- 检查范围：依赖审计、编译构建、数据库迁移、环境变量、服务运行状态、启动脚本
- 结论：🔴**部署阻塞** — 2 个阻断项
  - **#D1 🔴阻断**：前端生产构建 `vue-tsc -b && vite build` 失败（9 个 TS 错误）
  - **#D2 🔴阻断**：`server/package.json` 含 3 个前端依赖（@vueuse/core、sortablejs、vuedraggable），服务器代码零引用
  - **#D3 🟡警告**：ADMIN_TOKEN 为空
  - **#D4 🟡警告**：迁移文件 `db/migrations/v0.4.sql` 路径不标准（项目根而非 server/db/migrations/）
  - **#D5 🟡警告**：.env 含明文 API Key
- 通过项：DB 迁移已执行、服务器 TS 编译通过、rss-parser 已安装、无新增环境变量、无新增系统依赖、start.sh 兼容、所有服务运行正常、健康检查通过
- 详细报告：`docs/progress/iterations/v0.4.md` 部署阶段段
- 下一步：Developer 修复 #D1 #D2 → DevOps 复审部署 → 用户浏览器视觉验证 → PM 复审测试报告 → 迭代关闭

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
