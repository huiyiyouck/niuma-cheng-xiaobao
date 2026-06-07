# Node 依赖变更同步检查手册

> Developer 改 `server/package.json` 或 `frontend/package.json` 后，部署机的 `node_modules` 不会自动更新。本手册规范从「改依赖」到「部署机生效」的链路检查。
>
> 来源：[v0.5.1 生产部署 — undici 缺失事故](../../progress/roles/devops.md#2026-06-07--v051-生产部署上线)（commit `75ca9ae` 引入 `undici@^7.27.2` 但部署机未跑 npm install，导致 worker 启动崩 `ERR_MODULE_NOT_FOUND`，systemd 触发 StartLimitBurst 锁定）。

## 核心结论一句话

**改 `package.json` → commit `package-lock.json` → 部署机执行 `npm install` → 服务 restart**。四步缺一不可。`node_modules` 不在 git 里，systemd 不会自动同步依赖。

## 适用场景

- 项目使用 systemd 单机部署（`news-api.service`），代码与部署机在同一台机器或通过 `git pull` 同步
- 任何修改 `server/package.json` 或 `frontend/package.json` 的 `dependencies` / `devDependencies` 字段的 commit
- 包括：新增包、删除包、版本号变更（^1.0.0 → ^2.0.0）、移动 dependencies ↔ devDependencies

## 不适用场景

- 仅修改 `scripts` 字段、`name` / `version` 等元数据：无需 `npm install`，但仍建议跑一遍验证 lock 文件一致性
- 容器化部署（Docker `npm install` 在镜像构建期完成）：本手册不适用，由 Dockerfile 接管
- frontend 端的纯前端依赖：影响 `npm run build` 产物而非运行时（systemd 不跑 frontend），部署链路另算

## Developer 改完 package.json 后的检查链

### 1. 本地必做

```bash
cd server  # 或 frontend
npm install          # 更新 node_modules + package-lock.json
npm run build        # 验证编译通过（frontend：vite build；server：tsx 不编译，跑测试代替）
npm test             # server 端必跑
```

### 2. commit 检查清单

| 项 | 必须吗 | 说明 |
|---|---|---|
| `package.json` | ✅ 必 | 改动主体 |
| `package-lock.json` | ✅ 必 | 部署机用 `npm ci`/`npm install` 时需要一致版本固定 |
| `node_modules/` | ❌ 不 | `.gitignore` 已忽略，不允许入库 |

**漏 commit lock 文件的后果**：部署机执行 `npm install` 可能装到不同 minor 版本，与开发机行为不一致。

### 3. PR / commit message 提示

如果本次 commit 改了 `package.json`，commit message **必须**显式提到「需在部署机跑 npm install」，例如：

> ```
> feat(worker): 接入金十数据 MCP + 全局代理
>
> 新增依赖：undici@^7.27.2（用于 X 代理 + MCP 调用）
> ⚠️ 部署机需跑 `cd server && npm install`
> ```

否则 DevOps 在「上线部署」时可能漏掉这一步——这是 v0.5.1 事故的根本原因。

### 4. INDEX「下一步入口」必须列出

按 [`docs/baseline/conventions.md` §前后端契约变更同步检查](../../baseline/conventions.md)（如适用），跨角色待办登记到 `INDEX.md` 跨任务待办表，归属 DevOps，例如：

> | P1 | v0.5 部署：cd server && npm install 后再 systemd restart | DevOps | 2026-06-07 Developer 收尾 commit 75ca9ae 引入 undici | 待执行 |

## DevOps 部署前必做检查

每次部署（包括标准迭代部署、Bugfix 上线、热修复）**必须**先比对待部署代码与部署机 `node_modules` 的依赖差异：

```bash
cd /root/Project/niuma-cheng-xiaobao/server

# 1. 提取 package.json 中所有 dependencies + devDependencies 的包名
jq -r '.dependencies + .devDependencies | keys[]' package.json | sort > /tmp/want.txt

# 2. 提取 node_modules 顶层实际安装的包名
ls node_modules 2>/dev/null | grep -v '^\.' | sort > /tmp/have.txt

# 3. diff——任何 want 中存在但 have 中缺失的，必须 npm install
diff /tmp/want.txt /tmp/have.txt
```

如果 diff 显示 `<` 行（want 有但 have 无），**必须先跑 `npm install` 再 restart**。

或更直接的整体检查（推荐写进部署脚本）：

```bash
cd /root/Project/niuma-cheng-xiaobao/server
npm install --no-audit --no-fund  # 幂等：已是最新则秒返回
```

`npm install` 是幂等的——如果 `node_modules` 已与 `package-lock.json` 一致，几乎无副作用。**作为部署 dry-check 的固定一步是安全的**。

## 故障排查

### 现象 1：`ERR_MODULE_NOT_FOUND: Cannot find package '<X>'`

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'undici' imported from
    /root/Project/.../server/src/worker/index.ts
```

**根因**：`package.json` 已声明 `<X>` 但 `node_modules/<X>` 不存在。

**修复**：

```bash
cd server
npm install
systemctl reset-failed news-api.service  # 若已被 StartLimitBurst 锁定
systemctl restart news-api.service
```

**预防**：把上文「DevOps 部署前必做检查」加入部署脚本。

### 现象 2：版本号不一致导致行为差异

```text
TypeError: foo.bar is not a function
```

**根因**：开发机 `node_modules/<X>` 是 `2.1.0`，部署机装到了 `2.2.0`，API 已变。通常因为 commit 漏了 `package-lock.json`。

**修复**：

```bash
git log --oneline package-lock.json  # 确认是否在最近 commit 跟着更新
cd server
rm -rf node_modules package-lock.json
git checkout package-lock.json       # 如果它在 git 里
npm ci                                # 严格按 lock 文件装
```

如果 lock 文件**没在 git 里**——补 commit 上去（Developer 责任），然后部署机 `git pull && npm ci`。

### 现象 3：`devDependencies` 中的包在生产被需要

例如 v0.4 #B2 的 `drizzle-kit`：systemd `ExecStartPre=/usr/bin/npx drizzle-kit migrate` 在生产期跑，但 `drizzle-kit` 被错放进 `devDependencies`，`npm install --production` 后缺失。

**修复**：把它移回 `dependencies`。详见 [db-migration-handbook §禁止事项](db-migration-handbook.md#禁止事项)。

**预防**：systemd unit 中出现 `ExecStartPre=npx <pkg>` 的所有 `<pkg>` 都必须在 `dependencies`，不能在 `devDependencies`。

### 现象 4：systemd 被 `StartLimitBurst=3` 锁定

```text
news-api.service: Start request repeated too quickly.
news-api.service: Failed with result 'exit-code'.
```

这是依赖类故障的二次伤害——服务连崩 3 次后 systemd 拒绝再启动。修完根因后必须 reset：

```bash
sudo systemctl reset-failed news-api.service
sudo systemctl restart news-api.service
```

## 禁止事项

| 禁止 | 原因 |
|---|---|
| ❌ 改 `package.json` 不跑 `npm install` 直接 commit | lock 文件不更新，部署机行为与开发机偏离 |
| ❌ commit `node_modules/` | 与 lock 文件双真源、git 仓库体积爆炸；按项目 `.gitignore` 已禁止 |
| ❌ 在生产机直接改 `node_modules/` 任意文件 | 下次 `npm install` 会覆盖，且无 git 记录 |
| ❌ 部署机用 `--production` 安装并期望 `devDependencies` 仍能跑 | systemd ExecStartPre 工具链可能落进 devDeps，会缺失（v0.4 #B2） |
| ❌ 用 `npm install <pkg>` 而不指定版本范围、不跟着 commit lock | 锁定不上、跨机行为漂移 |

## 关联文档

- [数据库 Schema 迁移操作手册](db-migration-handbook.md) — schema 与依赖是部署期两条独立必检的链路
- [DevOps 工作日志 2026-06-07 v0.5.1 部署](../../progress/roles/devops.md#2026-06-07--v051-生产部署上线) — 本手册的触发事件

## 验证证据

| 日期 | 事件 | 教训 |
|---|---|---|
| 2025（v0.4 收尾后） | `drizzle-kit` 误放 devDependencies → systemd ExecStartPre 缺包 | 形成「systemd 链路上的工具必须 dependencies」规则，落到 db-migration-handbook |
| 2026-06-07 | commit `75ca9ae` 引入 `undici@^7.27.2` 未通知部署，systemd restart 崩 3 次锁定，DevOps 前向修复（`npm install` + `reset-failed` + `restart`），3s 恢复 | 形成本手册 |
