# 全栈部署检查清单（前端 + 后端 + 反向代理）

> 后端 systemd 跑通 ≠ 部署完成。前端是独立构建产物 + 独立部署路径 + 独立 nginx 配置。任何"部署通过"翻牌前必须把全链路核到位。
>
> 来源：[v0.5.1 DevOps 部署收尾失误](../../progress/roles/devops.md#2026-06-07--v051-生产部署上线)——后端上线后翻牌「部署通过」，Owner 索取验证 URL 时才发现前端 `dist/` 是 7 天前的旧版本，重新构建又遇 31 个 TS 错误，公网长期跑陈旧前端无人察觉。

## 核心结论一句话

**部署检查表必须显式列「前端构建」和「前端产物部署」为独立步骤，且任一失败都阻塞整个迭代部署翻牌**。后端 systemd 起服只是部分成功。

## 适用场景

- 全栈项目：Node 后端（systemd）+ 静态前端（Vite/Webpack/Next.js export）+ nginx 反代
- 后端与前端在同一仓库不同子目录（如 `server/` + `frontend/`）
- 任何"部署 vX.Y"任务，无论迭代主题是后端为主还是前端为主

## 不适用场景

- 仅后端服务的迭代（明确的 backend-only PRD，无前端 commit）
- 纯文档/baseline/配置类迭代
- 容器化部署（Docker compose 把 frontend build 嵌入镜像构建期）——本手册的分离链路不适用

## 部署前必做：全链路 audit

每次部署任务的 Pre-flight check 必须包含以下 4 维：

```bash
# 1. 后端代码与部署机一致
cd server && git log --oneline -1     # 期望 HEAD 与待部署版本一致

# 2. 前端 dist 时间戳 vs 后端最近 commit 时间
stat frontend/dist/index.html | grep Modify
git log -1 --format=%ai server/        # 如果 dist 早于 server 最新 commit，前端可能落后

# 3. 公网前端目录时间戳
stat /var/www/<domain>/index.html | grep Modify  # 路径见 nginx site 配置

# 4. nginx site 配置健康
nginx -t                              # 配置语法
curl -sS -o /dev/null -w "%{http_code}\n" https://<domain>/  # 首页可达
curl -sS -o /dev/null -w "%{http_code}\n" https://<domain>/v1/health  # API 反代可达
```

任一维度异常都要 **stop the line**，不要继续后续步骤。

## 部署执行检查表

部署完成的标准是以下 8 项**全部通过**：

| 维度 | 检查项 | 通过标准 |
|---|---|---|
| 后端依赖 | `cd server && npm install` 幂等通过 | 无 ERR_MODULE_NOT_FOUND |
| 后端构建 | systemd `ExecStartPre=drizzle-kit migrate` 成功 | status=0 |
| 后端运行 | `systemctl is-active news-api.service` | active running |
| 后端健康 | `/health` 200、关键 API 200 | 全 2xx |
| 后端外部依赖 | X Stream / MCP / OpenAI 联通 | 日志无 ERROR |
| **前端依赖** | `cd frontend && npm install` 幂等通过 | 无报错 |
| **前端构建** | `npm run build` 通过 | 0 TS 错误、有 dist/ 产物 |
| **前端部署** | `rsync -av --delete frontend/dist/ /var/www/<domain>/` | 时间戳更新、首页可达 |
| 反向代理 | `nginx -t` + `systemctl reload nginx` | 配置 ok、reload 成功 |

**翻牌「部署通过」前必须 verify**：

```bash
# 前端时间戳应当晚于本次部署开始时间
stat /var/www/<domain>/index.html | grep Modify

# 前端 HTML 中的 bundle hash 应当指向 dist/assets/ 中实际存在的文件
curl -s https://<domain>/ | grep -oE '/assets/[A-Za-z-]+-[A-Za-z0-9_-]+\.(js|css)' | head -3
# 然后 ls /var/www/<domain>/ 对应路径都应存在
```

## 故障排查

### 现象 1：前端 `npm run build` 报 TS 错误

```text
src/components/Foo.vue(N,N): error TS2724: '"@/lib/types"' has no exported member named 'OldType'.
src/lib/api.ts(N,N): error TS2305: Module '"..."' has no exported member 'oldFunc'.
```

**根因**：后端/types 已重构（重命名、删字段、改函数签名）但前端组件没跟上 —— **典型的"v0.X 重构遗孤"**。

**处置**：

- **不允许跳过 TS 检查强行构建**（`vue-tsc --noEmit false`、`vite build --skip-type-check` 等）。把不一致带到生产，比跑旧版本更危险（前端调用不存在的 API、读不存在的字段，运行时全是 undefined）。
- 必须 Developer 修复：保留完整 TS 错误日志（`npm run build 2>&1 > /tmp/ts-errors.txt`），存档到 `docs/progress/iterations/vX.Y-frontend-ts-errors.txt`，登记 P0/P1 跨任务待办给 Developer。
- 部署阻塞登记到 `vX.Y.md` 部署就绪检查表（如实写「前端部署阻塞」，不要含糊）。

### 现象 2：前端 dist 时间戳很久远但没人注意

**根因**：上一轮迭代的 dist 残留，后续多轮迭代后端在跑、前端从没构建过——典型的"前端不归我管"心态导致的盲区。

**预防**：

- 每次部署 Pre-flight 把「前端时间戳 vs 后端最近 commit 时间」对比作为**强制项**（见上文「部署前必做」第 2 条）
- 迭代关闭检查模板里加入「前端 dist 时间戳是否 ≥ 本迭代实现阶段最后一次前端 commit」
- 任何「部署通过」翻牌前必须给出公网 URL，由 DevOps（不是 Owner）至少 curl 一次首页看返回的 HTML 是否引用了最新 hash 的 bundle

### 现象 3：公网首页 200 但内容是旧的（CDN/浏览器缓存）

```bash
# 强制 no-cache 验证
curl -sS -H "Cache-Control: no-cache" -H "Pragma: no-cache" https://<domain>/
```

如果 nginx 配了 ETag/Last-Modified，浏览器 304 不刷新。Vite 构建产物 hash 命名（如 `app-AbC123.js`）天然避免这个问题，但 `index.html` 本身要确保 nginx 配置 `add_header Cache-Control "no-cache"`。

## 禁止事项

| 禁止 | 原因 |
|---|---|
| ❌ 后端 systemd 起服 OK 就翻牌「部署通过」 | 前端可能未构建/未部署，迭代未完成（v0.5.1 教训） |
| ❌ 用 `--skip-type-check` 强制构建前端 | 类型契约失配带到生产，运行时全是 undefined |
| ❌ 把前端 dist/ 入 git | 应每次部署期构建，避免 stale 产物入库 |
| ❌ 部署中改 nginx 配置不跑 `nginx -t` 就 reload | 语法错误会导致 reload 失败、nginx 进 fail 状态 |
| ❌ "前端不归我管" 心态 | DevOps 是部署链路的总负责，前后端全栈都在边界内 |

## 关联文档

- [数据库 Schema 迁移操作手册](db-migration-handbook.md) — 部署期数据库链路
- [Node 依赖变更同步检查手册](dependency-change-handbook.md) — 部署期依赖链路
- [DevOps v0.5.1 部署日志](../../progress/roles/devops.md#2026-06-07--v051-生产部署上线) — 本手册的触发事件

## 验证证据

| 日期 | 事件 | 教训 |
|---|---|---|
| 2026-06-07 | v0.5.1 后端上线翻牌「部署通过」后，Owner 索取验证 URL 才发现 `frontend/dist/` 与 `/var/www/news.huiyiyou.cloud/` 均为 7 天前的版本，重新 build 报 31 个 TS 错误（v0.5 重构遗孤） | 形成本手册——DevOps 必须把全栈部署作为整体检查，不能只看后端 systemd |
