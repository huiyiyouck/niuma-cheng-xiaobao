# 架构决策记录（ADR）

> 本文件汇集本项目所有"为什么这么选"的架构决策。每条 ADR 一旦写入即视为冻结历史，**不修改已采纳/已废弃条目的正文**；如需调整决策，新增一条新的 ADR 并把旧条目状态改为"被 ADR-{N} 替代"。
>
> 写入入口：Architect（架构师）。其他角色提议变更须先走基线修正流程。

## 索引

| 编号 | 标题 | 日期 | 状态 |
|------|------|------|------|
| ADR-001 | Drizzle 迁移机制选型 | 2026-05-31 | 已采纳（含 2026-05-31 实操修订附注） |

---

## ADR-001：Drizzle 迁移机制选型

- 日期：2026-05-31
- 状态：已采纳
- 提案来源：[DevOps 提案 — 数据库迁移机制规范化](../progress/ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md)
- 关联事件：[v0.4 测试报告](../progress/iterations/v0.4-test-report.md) #B1「alerts.status 列缺失」

### 背景

v0.4 测试阶段爆出 #B1🔴阻塞缺陷：`alerts.status` 列在 Drizzle TS schema 里已定义，但生产数据库未执行 ALTER TABLE，导致 `POST /v1/alerts/acknowledge-all` 直接 500。临时修复手工补列，但根因没解决——**项目缺少"谁、什么时候、用哪套机制"执行 schema 迁移的约定**。

现状勘察的关键事实：

1. 项目已装 `drizzle-orm@0.38` + `drizzle-kit@0.30`，`drizzle.config.ts` 已配置 `out: "./drizzle"`，但**该目录从未生成过**。
2. `package.json` 仅含 `db:push` 一个脚本，直推无产物。
3. 历史手写 SQL 散落两处：根目录 `db/migrations/v0.{1,2}.sql`（含 rollback）+ `server/db/migrations/v0.4.sql`（无 rollback）。**v0.3 跳号**（Python→Node 全量重写但未建迁移文件）。
4. 部署链路完全不跑迁移：`server/start.sh` 与 `deploy/systemd/news-api.service` 均无迁移步骤，schema 变更靠人工记得手动跑 SQL。
5. **现场核验**：生产 schema 9 张表逐列对比 `schema.ts`，**完全对齐**，无隐藏漂移。

核心矛盾：项目同时存在 3 套迁移思路（drizzle generate / drizzle push / 手写 SQL）互不衔接，#B1 是这个矛盾的必然产物。

### 决策

采纳 **drizzle-kit generate + journal** 工具流，迁移文件目录定为 `server/drizzle/`，部署链通过 systemd `ExecStartPre` 自动执行 `drizzle-kit migrate`。

具体 5 项落点：

| 项 | 决策 |
|---|---|
| 1. 工具流 | `drizzle-kit generate` 产出版本化 SQL + `_journal.json`；`drizzle-kit migrate` 在部署时按 journal 顺序应用未执行的迁移 |
| 2. 迁移路径 | `server/drizzle/`（与 `drizzle.config.ts` 默认 `out` 一致） |
| 3. v0.3 baseline | 从生产 `introspect` 反推 + 与 `schema.ts` 双向对账后产出 `0000_baseline.sql`，journal 标记为已应用（生产已有这些表，零执行） |
| 4. down.sql 要求 | 破坏性改动（DROP/RENAME/类型变更）和数据迁移必须配 down；ADD COLUMN/CREATE INDEX 默认不强制 |
| 5. migrate 执行位置 | 仅部署机（systemd `ExecStartPre`）；CI 暂无；将来 CI 上线时仅用于测试库验证，不接生产 |

`db:push` 脚本保留供本地开发期试 schema 使用，**禁止在生产或共享数据库执行**——README 明示。

### 考虑的替代方案

| 方案 | 优点 | 缺点 | 为什么不选 |
|------|------|------|------------|
| **A. drizzle-kit generate + journal**（选中） | 产物可代码评审；幂等可重放；与现有 SQL 几乎同构；`ExecStartPre` 失败即拦截主进程启动，能硬挡 #B1 复现 | 每次 schema 改动多一步 generate + commit；复杂改动产 SQL 可能不理想需手工修订；down 不自动生成 | — |
| B. drizzle-kit push 直推 | 一步到位，开发期最快 | 无 SQL 产物 → 无法评审；无 journal → 无幂等重放；每次部署对生产 diff 极度危险；无回滚 | 致命：本质是赌生产稳定，不能上部署链 |
| C. 继续手写 SQL（规范化版本） | 与团队历史习惯一致；完全可控无工具魔法 | 与 `schema.ts` 双真源，#B1 复现风险不消除；手写易与 drizzle introspect 列定义偏差 | 双真源问题是 #B1 根因，不能延续 |

### 后果

**正面**：

- 部署链具备硬门禁：`ExecStartPre=drizzle-kit migrate` 失败时主进程不启动，#B1 类"服务起来但 schema 没对齐"被结构性消除。
- `schema.ts` 成为唯一开发入口，generate 产物只是它的派生快照 + 历史档案。
- 与 Drizzle 社区惯例对齐，新人/未来 CI/CD 迁移成本低。
- 现场核验已确认生产 schema 与 `schema.ts` 完全对齐，baseline 工作风险归零。

**负面**：

- 每次 schema 改动多一步 `npm run db:generate` + commit 迁移文件，开发节奏小幅放慢。
- 复杂改动（rename column / split table）需要 generate 后手工 review SQL 再 commit，建立"generate 后必须人工 review"约定。
- down.sql 需人工编写并维护，drizzle-kit 不自动生成。

**风险与缓解**：

| 风险 | 缓解 |
|---|---|
| `drizzle-kit` 当前在 `devDependencies`，生产 `npm install --production` 会缺失 → `ExecStartPre` 失败 | 配套修正：**移到 `dependencies`**（Step 3 实施前的硬前置） |
| baseline introspect 与 `schema.ts` 不一致 | 现场核验已显示对齐；Step 2 实施时再次对账，以 `schema.ts` 为准 |
| 复杂改动 generate 产 SQL 不理想 | 约定「generate 后必须人工 review SQL 再 commit」；drizzle-kit 接受外部修订的 SQL，journal 只关心是否执行 |
| `ExecStartPre` 失败导致 systemd 重启循环 | 配套修正：unit 增加 `StartLimitInterval=60` + `StartLimitBurst=3` |
| 团队遗忘 `db:generate` 一步 → schema.ts 改了未生成迁移文件 | 部署时 `migrate` 不会检查"是否漏 generate"。靠开发文化 + code review。未来可在 CI 加 `drizzle-kit check` 步骤 |

### 实施路径

按 [DevOps 提案](../progress/ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md) §3 拆分推进：

- **Step 1**（本 ADR 已完成）：Architect 拍板工具流与路径。
- **Step 2**（待 Developer 接手）：introspect 生成 baseline + 归并 v0.4.sql 为 0001，老路径 `server/db/migrations/` 删除，根目录 `db/migrations/` 移至 `server/drizzle/_legacy/` 留底。
- **Step 3**（待 DevOps 在 Step 2 后实施）：systemd unit 加 `ExecStartPre` + 启动限制；drizzle-kit 从 devDependencies 移至 dependencies；写 `docs/knowledge/devops/db-migration-handbook.md` 操作手册；按提案 §8 验证标准跑一遍。

### 不在本 ADR 范围

- #B2「两步查询拆 FOR UPDATE」由 Architect 另开会话独立评估，不阻塞本 ADR 推进。
- 未来如需更换 ORM 或迁移工具（如改用 `node-pg-migrate`、`flyway`），新增 ADR 替代本条。

### 实操修订附注（2026-05-31）

> 附注不修改上方决策正文（ADR 冻结历史规则），仅记录 Step 2 实施过程中的实操路径调整与 Architect 复审决定。

**触发**：Developer 2026-05-31 执行 Step 2 时遇到 drizzle-kit 0.30.6 与 drizzle-orm 0.38.4 工具链不兼容（`introspect` / `generate` 报 `ERR_PACKAGE_PATH_NOT_EXPORTED`），对决策 3（v0.3 baseline 怎么补）和 A3（Step 2 流程）做了两处实操调整，本附注审议这两处调整。

| # | 原决策 | 实操调整 | Architect 复审结论 |
|---|--------|----------|---------------------|
| 决策 3 | 从生产 `introspect` 反推 baseline | 改用 `drizzle-kit generate --name baseline` 从 `schema.ts` 直接产 baseline | ✅ 接受。决策 3 本意是"baseline 与生产对齐"，introspect 只是手段之一。Architect 现场核验已确认 `schema.ts ≡ 生产 schema`（9 表逐列），故"从 schema.ts 反推"与"从生产 introspect"输出等价。baseline 核验通过：9 表 + 14 外键 + 10 索引 + 1 COMMENT 齐备 |
| A3 | 以 v0.3 baseline 为起点 generate 0001 → 与 v0.4.sql 比对一致 | baseline 一次性产出 9 表最终状态（已吸收 v0.4 `alerts.status`），无独立 0001 增量 | ✅ 接受。A3 的真实担忧是「Developer 简单复制粘贴 v0.4.sql 到 0001 造成双真源残留」，Developer 当前做法根本不存在复制粘贴动作（generate 产物就是 schema.ts 的唯一派生）。强行回滚 schema.ts 拆出 v0.3 baseline + 0001 增量纯粹是形式上的"先 0000 后 0001"，无工程价值——v0.3 在历史上从未存在过迁移文件，"v0.3 baseline"概念是虚构的 |

**新增配套约束**：

- drizzle-kit 与 drizzle-orm 必须保持版本约束，避免再次踩 `ERR_PACKAGE_PATH_NOT_EXPORTED`。写入 Step 3 操作手册 `docs/knowledge/devops/db-migration-handbook.md`。
- v0.5 起，所有 schema 变更走标准 `npm run db:generate` 产出 0001、0002……增量文件。**baseline 仅此一份，永不再 regenerate**。

**清理事项（优先级低，不阻塞）**：

- 根目录 `db/schema.sql`（141 行，Python 时期遗留 DDL）已被 `schema.ts` 取代，建议 Developer 下次经过时 `git mv` 到 `server/drizzle/_legacy/` 与 v0.1/v0.2 SQL 一起归档。

**本附注产生的 Review 记录**：详见 [DevOps 提案 §Architect Review 记录区 R2](../progress/ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md)。
