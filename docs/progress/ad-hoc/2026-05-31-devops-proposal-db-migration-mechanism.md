# DevOps 提案 — 数据库迁移机制规范化

## 基本信息

- 日期：2026-05-31
- 提出角色：DevOps（运维/部署工程师）
- 工作模式：Ops Task 衍生提案（非迭代）
- 关联待办：INDEX 跨任务待办 P2「数据库迁移机制规范化」
- 关联事件：v0.4 测试报告 #B1「alerts.status 列缺失」根因
- 状态：✅ Architect Review R1 通过（2026-05-31），Step 1 已拍板，见 §「Architect Review 记录区」
- 是否升级为标准迭代：暂否；若架构师评估认为影响范围足以走 PRD，再升

## 1. 背景

v0.4 测试阶段爆出 #B1🔴阻塞缺陷：`alerts.status` 列在 Drizzle TS schema 里已定义，但生产数据库未执行 ALTER TABLE，导致 `POST /v1/alerts/acknowledge-all` 直接 500。临时修复是手动 `ALTER TABLE alerts ADD COLUMN`，但根因没解决：**项目缺少"谁、什么时候、用哪套机制"执行 schema 迁移的约定**。

PM 在 2026-05-31 测试报告 R1 定稿时把这条登记为 INDEX P2，归属「DevOps（主）+ Architect（评估）」，要求建立 drizzle 迁移文件管理 + 部署自动迁移步骤。本文档是 DevOps 侧的勘察 + 评估 + 提案，供 Architect Review 后启动 Step 1 实施。

## 2. 现状勘察（事实层）

| 维度 | 现状 |
|---|---|
| ORM | drizzle-orm 0.38 + drizzle-kit 0.30 已装在 `server/package.json` |
| schema 真源 | `server/src/db/schema.ts`（Drizzle TS schema） |
| drizzle.config.ts | 已配置，`out: "./drizzle"`，但**该目录在仓库中不存在**（drizzle-kit 从未生成过迁移文件） |
| package.json scripts | 仅 `"db:push": "drizzle-kit push"`（直推不留痕） |
| 已有手写 SQL 迁移 | 散落两处：根目录 `db/migrations/v0.{1,2}.sql`（含 rollback）+ `server/db/migrations/v0.4.sql`（无 rollback）。**v0.3 跳号**（v0.3 是 Python → Node 全量迁移，schema 也变了但没建迁移文件） |
| 部署链路是否跑迁移 | **无**。`server/start.sh` 不跑、`deploy/systemd/news-api.service` 不跑（今日 systemd 化时未挂迁移步骤）。schema 变更靠人工记得手动跑 SQL |
| 回滚机制 | 部分存在（v0.1/v0.2 有 rollback.sql），v0.4 无 |
| `migrations` 表 | 无（drizzle journal 表未建立） |

**核心矛盾**：项目同时存在 3 套迁移思路，互相不衔接：

- 思路 A：drizzle-kit generate（生成版本化 SQL）— 配置就绪但从未使用
- 思路 B：drizzle-kit push（schema 直推）— 写进了 package.json，但需手动执行
- 思路 C：手写 SQL 文件 — 实际在用，但路径不统一、版本号断档、无自动执行

## 3. 拆分方案

整条 P2 按 #B1 教训单步上手过于庞杂，建议拆三步推进：

| 顺序 | 子任务 | 主责 | 阻塞依赖 |
|---|---|---|---|
| **Step 1** | 选定迁移工具流 + 统一迁移路径 | **Architect 决策**（DevOps 评审） | — |
| **Step 2** | 已有 v0.1/v0.2/v0.4 SQL 归并到选定路径 + 补 v0.3 baseline + 补 v0.4 rollback | Developer 执行（DevOps 评审） | Step 1 |
| **Step 3** | 部署时自动跑迁移（`ExecStartPre` 挂到 systemd unit） | **DevOps 独担** | Step 1, Step 2 |

#B2「两步查询拆 FOR UPDATE」是查询代码层调整，归 Architect 评估 + Developer 改，**不归 DevOps**，本提案不涉及。

## 4. Step 1 工具流方案对比（核心议题）

### 方案 A：drizzle-kit generate + journal（推荐）

```bash
# 开发期，改完 schema.ts 后
npx drizzle-kit generate --name=v0.5_some_change
# → 在 server/drizzle/ 下生成 0001_v0.5_some_change.sql + meta/_journal.json

# 部署时
npx drizzle-kit migrate
# → 读 journal，对未应用的 SQL 顺序执行；幂等可重放
```

**优点**：

- 产出版本化 SQL 文件，**可代码评审**
- CI/CD 友好，幂等可重放
- 失败可挡部署：systemd `ExecStartPre` 失败则不启动主进程，避免 #B1 那种"服务起来了但 schema 没对齐"
- 与已有手写 SQL 路径几乎一致，迁移成本低
- Drizzle 团队推荐用于生产

**缺点**：

- 每次 schema 改动多一步 `generate` + 提交迁移文件
- 复杂改动（rename column / split table）generate 可能产出不理想 SQL，需手工修订
- 需要约定 down.sql 写法（drizzle-kit 不自动生成 down）

### 方案 B：drizzle-kit push（开发友好，不推荐用于生产）

```bash
# 改完 schema.ts 后
npx drizzle-kit push
# → 直接 diff 当前库与 schema，生成 SQL 并立刻执行，不留文件痕迹
```

**优点**：

- 一步到位，开发期最快
- 现有 `db:push` 脚本即可用

**缺点**（致命）：

- ❌ 无 SQL 文件，**无法代码评审**
- ❌ 无 journal，**无幂等重放**
- ❌ 部署链上没办法挂——每次部署都对当前生产库做即时 diff，极度危险
- ❌ 无回滚机制

**结论**：push 仅保留给**开发期快速试 schema**，**不进部署链**，不作为迁移管理主方案。

### 方案 C：继续手写 SQL（保留现状但规范化）

继续 `server/db/migrations/vX.Y.sql` 形式，DevOps 写部署脚本逐个 apply。

**优点**：

- 与团队历史习惯一致（v0.1/v0.2/v0.4 已经这样做）
- 完全可控，无工具魔法

**缺点**：

- ❌ 与 Drizzle TS schema 双真源，schema.ts 改了得记得同时写 SQL（#B1 复现风险）
- ❌ 无自动 diff，依赖人工
- ❌ 手写 SQL 容易与 drizzle-kit 自动 introspect 时的列定义有偏差

### DevOps 的倾向

| 维度 | 方案 A generate | 方案 B push | 方案 C 手写 |
|---|---|---|---|
| 可评审 | ✅ | ❌ | ✅ |
| CI/CD 友好 | ✅ | ❌ | ⚠️ 需自写脚本 |
| 防 #B1 复现 | ✅ | ⚠️ | ❌ |
| 回滚 | ✅ | ❌ | ⚠️ 需手写 |
| 与现有 SQL 文件衔接 | ✅ | ❌ | ✅ 完美 |
| 迁移成本 | 中（建 drizzle/ + 重组现有 SQL） | 高（废弃所有现有 SQL） | 低 |

**DevOps 倾向方案 A**，但工具流选择本质是架构决策，最终由 Architect 拍板。

## 5. Step 1 迁移路径方案（同步待 Architect 决策）

当前 SQL 文件散落两处，必须统一。候选：

| 选项 | 路径 | 说明 |
|---|---|---|
| 路径 P1 | `server/drizzle/` | drizzle-kit 默认 out 目录（drizzle.config.ts 当前配置）。**若采纳方案 A，建议此项** |
| 路径 P2 | `server/db/migrations/` | 与 v0.4.sql 已有路径一致。**若采纳方案 C，建议此项** |
| 路径 P3 | 根目录 `db/migrations/` | v0.1/v0.2 历史路径，但 v0.3 后端拆到 `server/` 后已不合时宜，**不推荐** |

## 6. Step 3（DevOps 独担部分）实施草案

待 Step 1 拍板后执行。基于本日刚完成的 systemd 化结果：

```ini
# /etc/systemd/system/news-api.service
[Service]
...
WorkingDirectory=/root/Project/niuma-cheng-xiaobao/server
EnvironmentFile=/root/Project/niuma-cheng-xiaobao/server/.env
ExecStartPre=/usr/bin/npx drizzle-kit migrate   # ← 新增
ExecStart=/usr/bin/npx tsx src/index.ts
Restart=always
RestartSec=5
...
```

**行为约定**：

- 每次 `systemctl restart news-api.service` 自动跑 migrate
- migrate 失败则 ExecStart 不会执行，systemd 报 failed，主进程不会以"半残 schema"启动
- 失败处理：journal 写进 `migrations` 表，人工跑 down.sql + 删除 journal 行后重试
- 开机自启场景下，若数据库未就绪会失败重试（`Restart=always` + `RestartSec=5`）

**替代方案**（不推荐）：在 `server/start.sh` 头部加 `npx drizzle-kit migrate`，systemd unit 不挂。坏处是绕开 systemd 失败感知。

## 7. 风险与待决策项

### 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 方案 A：drizzle-kit generate 对复杂改动产出 SQL 不理想 | 可能影响 v0.5+ 复杂 schema 改动 | 复杂改动手工修订生成的 SQL；建立约定「generate 后必须 review SQL 再 commit」 |
| 方案 A：v0.3 schema 没有迁移文件，新建 baseline 时怎么对齐生产已有 schema | 生产已存在数据，不能 drop & recreate | Step 2 子任务，需 introspect 生产库后手动构造 baseline 0000_init.sql |
| Step 3：ExecStartPre 失败导致服务自动重启循环 | 极端情况 systemd 重启过频被 rate-limit | `RestartSec=5` 已设；若仍频繁可加 `StartLimitInterval=60`, `StartLimitBurst=3` |
| Step 3：drizzle-kit 在 systemd 环境下 npm install 依赖问题 | 部分场景 npx 可能拉不到包 | 部署前 `npm install --production=false` 确保 drizzle-kit 在 node_modules |

### 待 Architect 决策项

1. **工具流**：方案 A（drizzle generate）/ B（push）/ C（手写 SQL）三选一
2. **迁移路径**：路径 P1 / P2 / P3 三选一
3. **v0.3 baseline 怎么补**：从生产 introspect？从 schema.ts 反推？还是手写？
4. **down.sql 是否要求**：所有迁移必须配 down，还是仅高风险（drop/rename）必须配
5. **drizzle-kit migrate 在 CI 环境跑还是只在部署机跑**

## 8. 验证标准（实施后用于验收）

实施完成后应满足：

- [ ] 改 `schema.ts` 后跑一遍约定流程，能在 `server/drizzle/` 或 `server/db/migrations/` 下产出版本化 SQL
- [ ] `systemctl restart news-api.service` 自动应用未执行的迁移
- [ ] 故意写一条会失败的迁移，systemd 拦住主进程不启动
- [ ] 复现 #B1：仅修改 schema.ts 不跑 generate，systemd 重启时检测到 schema 漂移并报错（如选择方案 A）
- [ ] 文档化：在 `docs/knowledge/devops/` 写一份「schema 迁移操作手册」，供后续迭代直接遵循

## 9. 与本日 Ops Task 的关系

本提案的 Step 3 是本日完成的 `news-api.service` systemd 化的**直接延伸**（同一 unit 文件加 ExecStartPre 即可）。Step 1 拍板后，Step 3 实施只需一次 unit 文件 patch + reload + restart 验证，工作量约 1 个会话。

## 10. Review

### Review 计划

- Review 模式：动态 Review（非迭代提案）
- 指定 Review 方：
  - **Architect** — 主审，负责 Step 1 决策（工具流 + 迁移路径 + 待决策项 1-5）
- 未指定 Review 方及原因：
  - Developer — Step 2 实施者，但 Step 1 拍板前不必介入
  - PM — 不涉及产品行为，无需 Review
- 定稿条件：Architect 给出 Step 1 决策（工具流 + 迁移路径 + 待决策项 1-5 明确答复）

### Review 状态

| Review 方 | 指定原因 | 状态 | 轮次 |
|-----------|----------|------|------|
| Architect | Step 1 工具流与路径决策 | ✅ R1 通过 | R1 |

### Architect Review 记录区

#### 2026-05-31 — Architect Review R1 ✅ 通过 + 5 项决策已下

**Review 方**：Architect（架构师）
**结论**：✅通过。DevOps 调研充分，5 项待决策事实层已收敛，逐条拍板：

| # | 议题 | 决策 | 关键理由 |
|---|------|------|----------|
| 1 | 工具流 | **方案 A（drizzle-kit generate + journal）** | 唯一能在部署链硬拦 #B1 复现（`ExecStartPre` 失败即不启动主进程）；方案 B 无产物无幂等不能上部署链；方案 C 双真源是 #B1 根因 |
| 2 | 迁移路径 | **`server/drizzle/`（路径 P1）** | 与 `drizzle.config.ts` 默认 `out` 对齐，零额外配置；`server/db/migrations/` Step 2 归并后删除；根目录 `db/migrations/` 移至 `server/drizzle/_legacy/` 留底 |
| 3 | v0.3 baseline | **从生产 introspect + 与 schema.ts 双向对账** | **现场核验已确认生产 9 表逐列对齐 schema.ts**，baseline 风险归零；产出 `0000_baseline.sql` + journal 标已应用 |
| 4 | down.sql 要求 | **分类强制**：破坏性改动（DROP/RENAME/类型变更）+ 数据迁移必须配 down；ADD COLUMN/CREATE INDEX 默认不强制 | 全配 down 在小团队是负担；破坏性 + 数据相关改动必须给撤回闸门 |
| 5 | migrate 执行位置 | **仅部署机（systemd `ExecStartPre`）** | 当前无 CI；生产 DATABASE_URL 不应外泄给 CI；将来 CI 上线仅用于测试库验证 |

**配套补充意见**（DevOps 提案未覆盖，本 Review 追加）：

- **A1**（package.json）：增加 `db:generate` + `db:migrate` 两个 script；保留 `db:push` 但 README 标注"仅本地开发"。
- **A2**（**Step 3 硬前置**）：`drizzle-kit` 必须从 `devDependencies` 移至 `dependencies`，否则生产 `npm install --production` 会缺失 → `ExecStartPre` 直接失败。这是提案 §7 风险表里的隐性 bug 修正，**Step 3 实施前必须完成**。
- **A3**（Step 2 流程）：v0.4.sql 不能简单复制粘贴到 0001。正确做法：以 v0.3 baseline 为起点用 `drizzle-kit generate` 自动产 0001 → 与现有 v0.4.sql 比对一致 → 保留 generate 产物。保证后续每次 generate 都是干净增量。
- **A4**（操作手册位置）：`docs/knowledge/devops/db-migration-handbook.md`（Step 3 §8 验证标准要求的手册）。
- **systemd 防护**：Step 3 实施时 unit 同步加 `StartLimitInterval=60` + `StartLimitBurst=3`（提案 §7 风险表已列，确认采纳）。

**关于 #B2**：归 Architect 评估，但是查询层独立议题，不阻塞本 Step 1 推进。架构师另开会话独立评估 `sources.ts:162` 现状后给结论。

**关联产出**：本决策同步写入 [`docs/baseline/architecture.md` ADR-001：Drizzle 迁移机制选型](../../baseline/architecture.md#adr-001drizzle-迁移机制选型)（项目首条 ADR）。

**下一步入口**：

1. DevOps 同步本 Review 进 `docs/progress/roles/devops.md`，更新 INDEX 跨任务待办状态。
2. Developer 接手 Step 2（baseline introspect + 归并 v0.4.sql 为 0001 + 老路径清理）。
3. DevOps 在 Step 2 完成后做 Step 3（A2 移依赖 + systemd unit 改造 + 验证 #B1 复现拦截 + 操作手册落档）。

---

## 关联文档

- INDEX 跨任务待办 P2 项
- `docs/progress/iterations/v0.4-test-report.md` §「正式修复建议」(#B1 根因)
- `docs/progress/roles/devops.md` 2026-05-31 P2 评估段（评估原文，与本文档内容一致）
- `docs/progress/ad-hoc/2026-05-31-ops-cleanup-legacy-systemd-units.md`（本日 systemd 化任务，Step 3 的实施基础）
