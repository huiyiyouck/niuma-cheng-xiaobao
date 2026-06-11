# DevOps 工作长期摘要

> 本文是 DevOps 角色长期视角：项目部署架构骨架、当前关注点、积累的常见风险。详尽日志见 `devops-current.md` / `devops-archive.md`。

## 项目部署架构（v0.6 PRD R1 时点）

| 维度 | 现状 | 来源记录 |
|------|------|----------|
| **生产域名** | `https://news.huiyiyou.cloud/` | 2026-05-25 部署 |
| **后端运行** | systemd `news-api.service`（root 用户 / Type=simple / Restart=always RestartSec=5）| 2026-05-31 systemd 化 |
| **后端目录** | `/root/Project/niuma-cheng-xiaobao/server/` | systemd unit WorkingDirectory |
| **启动链** | `ExecStartPre=/usr/bin/npx drizzle-kit migrate` → `ExecStart=/usr/bin/npx tsx src/index.ts`（API + Worker 同进程，单实例） | 2026-05-31 ADR-001 |
| **数据库** | 本机 PostgreSQL 16，`postgresql://news:news@localhost:5432/news`，drizzle-kit 管理迁移，`__drizzle_migrations` 表记录 baseline + 0001-0004 | 2026-05-31 ADR-001 + 2026-06-07 v0.5.1 |
| **前端部署** | **软链接模式** — `/var/www/news.huiyiyou.cloud` → `/root/Project/niuma-cheng-xiaobao/frontend/dist`（`npm run build` 即上线，无 rsync 环节） | 2026-06-07 软链接发现 |
| **nginx 配置** | `/etc/nginx/sites-enabled/news.huiyiyou.cloud`：HTTPS + Certbot 自动续期 + `/v1/` `/ws` `/docs` 反代 `127.0.0.1:8000` + `/assets/` 1 年 immutable + `/index.html` no-cache + SPA fallback | 2026-05-25 / 2026-06-08 资源缓存策略 |
| **静态资源**（Fastify 侧）| `@fastify/static` 注册 prefix `/assets/`（实际入口由 nginx 承担，Fastify 仅 fallback） | `server/src/index.ts:13-22` |
| **日志** | systemd `StandardOutput=append:/var/log/niuma-news-api.log`，无轮转（winston 应用层有 daily-rotate-file，但未接管 systemd stdout） | 当前 428K，#O8 待落实 |
| **代理** | `X_PROXY_URL=http://127.0.0.1:10809`（v2ray 三方进程），X API 走代理；LLM `token-plan-cn.xiaomimimo.com` 直连 | 2026-06-07 v0.5.1 |
| **崩溃保护** | `StartLimitIntervalSec=60` / `StartLimitBurst=3`（systemd 255 必须放 `[Unit]`） | 2026-05-31 Step 3 |
| **磁盘** | 系统盘 40GB / 已用 22GB / 可用 16GB | 2026-06-10 现场 `df -h` |
| **备份目录** | `/var/backups/niuma-news/` — pg_dump 备份 + .env 备份（pre-vX.Y 命名） | 2026-06-07 v0.5.1 |

## 当前关注点

- **v0.6 PRD R2 复审完成**：本次 ⚠️ **有条件通过**，12 条意见 5 完关 + 4 基本关 + 2 合理分流 + 1 未关闭（#O8 日志轮转）；R2 新引入 #O13（LLM 供应商切换告警）+ #O14（生产 .env 真实性验证）。R2 五方一致 ⚠️ 有条件通过共识门槛已达成，PM 决定 R3 vs UI 方案阶段。
- **v0.6 部署侧前置硬约束**（设计阶段 / 部署就绪检查前必须落实）：
  1. **systemd 日志轮转方案 v0.6 上线前必须落实**（#O8，推荐 logrotate daily/14天/压缩 = 方案 A，systemd unit 0 改动）；
  2. 图标上传 nginx 配置变更必须随代码同步上线（#O3 / AC-28b）；
  3. AC-32 告警类型枚举值 + 初版触发阈值由设计阶段产出 + 部署侧 Review（#O4 / Architect #A17 / Developer #D15 同源）；
  4. 新增依赖系统侧预审（sharp / playwright 类 native binding）在设计阶段依赖清单确定后由 DevOps dry-check（#O5 残留）；
  5. v0.5 测试当前禁用，本期实施前必须先恢复独立 test DB + `.env.test`（与 Developer R2 条件 D / Tester R2 条件 D 同向）。
- **磁盘容量预警**：当前 16GB 可用 + 540K 日志（2 天 +112K = 56K/天）。L0/L1 上线后 raw_items 年增 5-40GB + 日志 10-50MB/天，**6-12 个月必触发扩容**（Owner R2 已明确接受本期不建治理能力 + §6.1 风险登记）。
- **密钥泄漏风险**：v0.5.1 部署期 `X_BEARER_TOKEN` / `OPENAI_API_KEY` / `JIN10_MCP_TOKEN` 在 Owner 对话历史中明文出现，强烈建议 Owner 在各服务控制台轮换。
- **drizzle journal 漂移**：v0.5.1 部署期已自动修复，但要求所有迁移 SQL 严格 `IF [NOT] EXISTS`。v0.6 schema 变更必须走 `db:generate` 增量，不能再人工 psql。
- **前端构建是部署独立步骤**：v0.5.1 教训已沉淀到 `full-stack-deploy-handbook.md`，DevOps 部署清单不再允许"后端 active = 部署通过"的翻牌（memory `devops-full-stack-deploy-not-just-backend`）。

## DevOps 知识库

- [`docs/knowledge/devops/db-migration-handbook.md`](../../knowledge/devops/db-migration-handbook.md) — drizzle 迁移机制（generate / migrate / journal 漂移修复 / 工具版本约束 / 禁止事项）
- [`docs/knowledge/devops/dependency-change-handbook.md`](../../knowledge/devops/dependency-change-handbook.md) — Node 依赖变更全链路规范（Developer 改 package.json 4 步 + DevOps 部署前 dry-check + 故障排查）
- [`docs/knowledge/devops/full-stack-deploy-handbook.md`](../../knowledge/devops/full-stack-deploy-handbook.md) — 全栈部署检查清单（前端构建 + 后端 systemd + nginx；部署模式判别 A/B/C；软链接模式 3 条风险）

## DevOps 8 类常见风险

> 历史踩过 + 本期 v0.6 R1 Review 新识别的运维侧高频踩坑点；启动新会话时优先扫描这些。

| # | 风险类型 | 触发场景 | 已沉淀对策 |
|---|---|---|---|
| 1 | **package.json 改了但部署机未 npm install** → 服务起来即崩 | Developer commit 新依赖 + DevOps 直接 restart | `dependency-change-handbook.md` 部署前 `npm install` 必做 |
| 2 | **drizzle journal/DB/disk 三方漂移** → 重启失败 / schema 不一致 | 历史人工 psql + db:generate 没跟上 | `db-migration-handbook.md` 故障排查现象 4；要求迁移 SQL 全 `IF [NOT] EXISTS` |
| 3 | **后端 active ≠ 部署通过**：前端 build 失败 / dist 时间戳陈旧 / 公网仍跑旧 bundle | 部署清单只盯后端 systemd | `full-stack-deploy-handbook.md` 把前端构建+部署列独立步骤；memory `devops-full-stack-deploy-not-just-backend` |
| 4 | **软链接模式回滚陷阱**：备份在 build 之后 → 备份就是新版本本身 | 软链接 + cp -r 时序 | `full-stack-deploy-handbook.md` 软链接模式备份必在 build 之前；回滚走 `git checkout + rebuild` |
| 5 | **systemd 255 `StartLimitIntervalSec` 放错 section** → 配置无效 | 旧文档放 `[Service]`，新 systemd 必须 `[Unit]` | memory `systemd-startlimit-in-unit-section` |
| 6 | **drizzle-kit 放 devDependencies** → 生产 `npm install --omit=dev` 后 ExecStartPre 找不到工具 | drizzle-kit 默认 devDeps | memory `drizzle-kit-in-dependencies`；ADR-001 A2 已修 |
| 7 | **.env / .env.example / systemd EnvironmentFile 三处脱节** → 新部署机反复试错 | 生产 patch .env 后未同步 example | v0.6 #O6 已列入 PRD 修订项；要求实施阶段 `.env.example` 与 `.env` 增量同步 |
| 8 | **密钥在对话历史明文出现** → 需立即轮换 | 部署期 .env 整段贴出 | v0.5.1 教训；日志按手册原则不记录原始值；v0.6 #O10 已列入 PRD 修订项 |

## DevOps 边界守则

- 角色独占：部署方式、环境变量、云服务、发布风险、回滚条件。
- **不越界**：不替 Architect 做选型、不替 Developer 改业务代码、不替 PM 拍产品决策。
- Review 时严格守"上线后能不能扛住 + 出问题能不能回得来"两个维度，与已 Review 角色错开重复（与 Architect/Developer/Tester/UI 同源时显式标注同源点 + 补独立视角部分）。
- 翻牌"部署通过"前必做：前端构建 + 后端 systemd + nginx 反代 + 公网验证四项全过；缺一即"部署阻塞"或"仅后端通过"。
