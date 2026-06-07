# 数据库 Schema 迁移操作手册

> 本手册是 v0.4 #B1 教训后规范化的 schema 迁移执行说明书。所有 schema 变更必须按本手册执行，不允许绕过。
>
> 决策依据：[ADR-001 Drizzle 迁移机制选型](../../baseline/architecture.md#adr-001drizzle-迁移机制选型)。

## 核心结论一句话

**`schema.ts` 是真源 → `npm run db:generate` 产出迁移文件 → commit → 部署时 systemd `ExecStartPre=drizzle-kit migrate` 自动应用**。三步缺一不可。

## 适用范围

- 项目：niuma-cheng-xiaobao（牛马程小报）
- 数据库：PostgreSQL 16
- ORM：drizzle-orm 0.38.x + drizzle-kit 0.31.x
- 部署：systemd 单机（`news-api.service`）

## 工具版本约束（重要）

drizzle-kit 与 drizzle-orm **必须保持兼容版本**。当前已验证组合：

| drizzle-orm | drizzle-kit | 状态 |
|---|---|---|
| 0.38.4 | 0.31.10 | ✅ 当前生产组合 |
| 0.38.4 | 0.30.6 | ❌ `ERR_PACKAGE_PATH_NOT_EXPORTED` |

升级 drizzle-orm 时必须同步升 drizzle-kit 到对应版本。升级前先在临时目录跑 `npx drizzle-kit generate --dry-run` 验证（虽然该工具无 --dry-run，可改为复制 schema.ts 到测试目录跑 generate 看是否报错）。

## 开发期工作流（改 schema 时）

### 1. 改 `server/src/db/schema.ts`

正常修改 Drizzle TS schema：添加列、新表、改类型等。

### 2. 生成迁移文件

```bash
cd server
npm run db:generate
# 等价于：npx drizzle-kit generate
```

drizzle-kit 会：
- 读 `schema.ts` 与 `drizzle/meta/*_snapshot.json` 对比
- 产出新的 `drizzle/NNNN_xxx.sql` + 更新 `meta/_journal.json` + `meta/NNNN_snapshot.json`
- 文件名格式：`0001_<auto_name>.sql`、`0002_<auto_name>.sql` ……

### 3. 人工 Review 生成的 SQL

⚠️ **必做**。drizzle-kit 对简单改动（ADD COLUMN / CREATE INDEX）产出正确，但对**复杂改动**（rename column、split table、改 NOT NULL 同时填默认值）经常产 SQL 不理想。**Review 后可手工编辑 SQL 文件**，drizzle-kit 只关心 hash 与执行结果。

### 4. 按需配 down.sql（分类强制）

| 改动类型 | down.sql |
|---|---|
| ADD COLUMN | 默认不强制（可省） |
| CREATE INDEX | 默认不强制 |
| CREATE TABLE | 默认不强制（除非新表已有数据迁移） |
| DROP COLUMN / DROP TABLE | **必须配** |
| RENAME COLUMN / RENAME TABLE | **必须配** |
| 改类型 / 改 NOT NULL / 改 DEFAULT | **必须配** |
| 任何数据迁移（INSERT/UPDATE/DELETE） | **必须配** |

down.sql 命名：`NNNN_xxx_down.sql`，与对应 up 同目录。drizzle-kit 不自动 down，down 由人工跑：

```bash
psql "$DATABASE_URL" < server/drizzle/NNNN_xxx_down.sql
# 然后人工删 __drizzle_migrations 表对应行
```

### 5. 本地测试

```bash
cd server
npm run db:migrate
# 应用迁移到本地库
```

或本地不停服直接：

```bash
psql "$DATABASE_URL" < server/drizzle/NNNN_xxx.sql
# 然后手动插入 __drizzle_migrations 记录
```

### 6. commit

```bash
git add server/drizzle/NNNN_xxx.sql server/drizzle/meta/_journal.json server/drizzle/meta/NNNN_snapshot.json
git commit -m "feat(db): NNNN add ..."
```

**禁止漏提交 meta 文件**——`_journal.json` 不入库会导致部署时 drizzle-kit 看不到这条迁移，#B1 复现。

## 部署期工作流（systemd 自动）

部署链路已嵌入 systemd unit。每次 `systemctl restart news-api.service`：

1. `ExecStartPre=/usr/bin/npx drizzle-kit migrate` 自动跑
2. drizzle-kit 读 `server/drizzle/meta/_journal.json`，按顺序检查 `drizzle.__drizzle_migrations` 表
3. 跳过已应用迁移，执行所有新迁移
4. **migrate 失败 → ExecStartPre 退出非 0 → ExecStart 不执行 → 服务 failed**
5. systemd 自动重试 3 次（`StartLimitBurst=3`，`StartLimitIntervalSec=60`），仍失败则停在 failed 状态

部署人不需要手动跑 migrate，**也不应该手动跑**——以 systemd 触发为准。

## 首次部署到新环境（首次套用本机制）

⚠️ **只有第一次接入本机制的部署机需要做这一步**。

### 场景

生产已有 schema（9 张表），但 `drizzle.__drizzle_migrations` 表不存在 / `0000_baseline.sql` 未注入。直接跑 migrate 会失败（`CREATE TABLE alerts already exists`）。

### 步骤

```bash
# 1. 计算 baseline.sql 的 sha256
cd server
node -e "
const crypto = require('node:crypto');
const fs = require('node:fs');
const q = fs.readFileSync('drizzle/0000_baseline.sql').toString();
console.log(crypto.createHash('sha256').update(q).digest('hex'));
"
# → 输出例如 34b7133da1fe032ddbf1396a1db3e4e0aa17df683e4fa286b82ecfd60f40a14a

# 2. 取 journal 里的 when 值
grep '"when"' drizzle/meta/_journal.json
# → "when": 1780214254537

# 3. 注入到生产库
psql "$DATABASE_URL" <<SQL
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('<上面计算的 hash>', <上面 when 值>);
SQL

# 4. 验证 migrate 跑通
npx drizzle-kit migrate
# 应当输出 "migrations applied successfully" 且不修改任何业务表
```

### 验证

```bash
# 9 张业务表必须保持原样
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
# → 9

# drizzle.__drizzle_migrations 有且只有 1 行 baseline
psql "$DATABASE_URL" -c "SELECT id, hash, created_at FROM drizzle.__drizzle_migrations;"
```

## 故障排查

### 现象 1：`systemctl status` 显示 `ExecStartPre=/usr/bin/npx drizzle-kit migrate (code=exited, status=1/FAILURE)`

可能原因：

| 原因 | 诊断 | 修复 |
|---|---|---|
| baseline 未注入 | `SELECT COUNT(*) FROM drizzle.__drizzle_migrations;` 是 0 | 按「首次部署到新环境」执行注入 |
| 迁移 SQL 语法错误 | `npx drizzle-kit migrate` 手动跑，看具体报错行 | 修 SQL → commit → restart |
| schema 漂移（生产已有未记录的列） | 与 schema.ts 对比 | 手工 ALTER 或写补救迁移 |
| drizzle-kit 缺失 | `npx drizzle-kit --version` 报 not found | 确认 `drizzle-kit` 在 `dependencies`（不是 devDependencies）+ `npm install` |

### 现象 2：服务被 systemd 限速停在 failed

```text
news-api.service: Start request repeated too quickly.
news-api.service: Failed with result 'exit-code'.
```

这是 `StartLimitBurst=3` 触发。修完根因后：

```bash
sudo systemctl reset-failed news-api.service
sudo systemctl restart news-api.service
```

### 现象 3：迁移跑了一半失败（原有，drizzle 事务保护消除了此风险）

drizzle-orm 默认把所有迁移**包在一个事务里**（看 `node_modules/drizzle-orm/pg-core/dialect.js` `session.transaction`）。失败时整个事务回滚，`__drizzle_migrations` 不会留半应用记录。修完 SQL 重启即可。

但**多语句 SQL 文件**中如果某语句使用了 `--> statement-breakpoint` 分隔，drizzle-orm 会按 breakpoint 拆分逐条执行——仍在事务里，仍是全有全无。

### 现象 4：drizzle journal / `__drizzle_migrations` / 实际 DB schema 三方漂移

```text
症状：
- `server/drizzle/` 目录有 0001-0004.sql 四个文件
- `_journal.json` 只有 0000-0001 两条 entries
- `drizzle.__drizzle_migrations` 表只有 baseline 一行
- 但 DB 实际 schema 已经是 0004 之后的终态（手工 psql 应用过 SQL）
```

**根因**：开发期有人手动用 `psql` 跑了 SQL，但没更新 journal 和 `__drizzle_migrations`；或者 `db:generate` 跑了但 `_journal.json` 没 commit 上来；或两者混合发生。

**风险评估**：

| 0001-0004 SQL 是否全部使用 `CREATE/ALTER ... IF [NOT] EXISTS` | 处置 | 后果 |
|---|---|---|
| ✅ 是（幂等） | 直接 `systemctl restart` 让 drizzle migrate 幂等重跑，journal 与 DB 自动对齐 | 安全。0 个 ALTER 实际执行（全 no-op），但 `__drizzle_migrations` 表会被补全 |
| ❌ 否（含无保护的 ADD COLUMN / CREATE TABLE） | **必须先用「首次部署到新环境」章节的 baseline 注入流程，按当前 DB 真实状态补 hash**，再 restart | 否则会报 `relation already exists` / `column already exists` 导致 ExecStartPre 失败 |

**检测命令**：

```bash
# 1. journal entries
jq '.entries[].tag' server/drizzle/meta/_journal.json
# 2. DB 已应用迁移
psql "$DATABASE_URL" -c "SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id;"
# 3. disk 上的迁移文件
ls server/drizzle/*.sql
# 4. 比对——三者数量与顺序应该完全一致
```

**预防**：

- 任何时候**不要**用 `psql < migration.sql` 在生产/共享 DB 上跑迁移——只走 `systemctl restart` 触发的 `ExecStartPre=drizzle-kit migrate`
- 开发期改 schema 必须走 `db:generate`，禁止直接编辑 disk 上的 SQL 后手动应用
- `_journal.json` 和 `*_snapshot.json` 必须**与 SQL 文件同 commit**入库

**触发事件**：[v0.5.1 生产部署](../../progress/roles/devops.md#2026-06-07--v051-生产部署上线)——0001-0004 全部 `IF [NOT] EXISTS` 保护，幂等 migrate 自动对齐了三方状态，零数据风险。

## 回滚

### 撤回最近一条迁移

```bash
# 1. 跑对应 down.sql
psql "$DATABASE_URL" < server/drizzle/NNNN_xxx_down.sql

# 2. 删 __drizzle_migrations 对应记录
psql "$DATABASE_URL" -c "DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT MAX(id) FROM drizzle.__drizzle_migrations);"

# 3. 在仓库里 git revert 这条迁移的 commit
git revert <commit_hash>
git push

# 4. 重启服务
sudo systemctl restart news-api.service
```

### 不能跳号回滚

drizzle migrator 按 `created_at` 时序判断哪些迁移要跑。**不允许**：

- 只删除 `__drizzle_migrations` 表中间一行（会导致后续迁移再次执行）
- 删除某个迁移文件但保留 journal 入口（migrate 启动时会报 `No file found`）

## 禁止事项

| 禁止 | 原因 |
|---|---|
| ❌ 在生产或共享数据库执行 `npm run db:push` | push 直推不留产物，与 generate 机制冲突，且无幂等 |
| ❌ 跳过 `db:generate` 直接手写 SQL 文件 | 与 `schema.ts` 双真源，#B1 复现风险 |
| ❌ 漏 commit `_journal.json` 或 `*_snapshot.json` | 部署机看不到这条迁移，且 generate 会重复 |
| ❌ 修改已 commit 的迁移文件 SQL 内容 | hash 变化会导致部署时 migrate 试图重跑或失败 |
| ❌ 把 `drizzle-kit` 放回 devDependencies | `npm install --production` 会缺失，systemd ExecStartPre 失败 |
| ❌ 用 `psql < migration.sql` 在生产/共享 DB 跑迁移而不同步 `__drizzle_migrations` 和 `_journal.json` | 三方漂移（详见故障排查现象 4），后续 drizzle migrate 行为不可预测 |

## 关联文档

- [ADR-001 Drizzle 迁移机制选型](../../baseline/architecture.md#adr-001drizzle-迁移机制选型)（决策根据）
- [DevOps 提案：数据库迁移机制规范化](../../progress/ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md)（背景 + 三步实施过程）
- [v0.4 测试报告 #B1](../../progress/iterations/v0.4-test-report.md#b1)（触发本机制建立的事件）

## 验证证据（首次部署历史）

2026-05-31 由 DevOps 完成首次部署 + 验证（Step 3）：

- ✅ baseline 注入：`drizzle.__drizzle_migrations` 表创建 + 1 行 baseline 记录注入，9 张业务表未变
- ✅ systemd `ExecStartPre` 跑通：重启服务 `Process: ExecStartPre=/usr/bin/npx drizzle-kit migrate (code=exited, status=0/SUCCESS)`
- ✅ #B1 复现拦截验证：临时加假迁移 → ExecStartPre 失败 → 主进程不启动 → `/health` 不通
- ✅ StartLimitBurst 验证：3 次重试后 systemd 报 `Start request repeated too quickly` 停在 failed
- ✅ 失败回滚：删测试文件 + reset-failed + restart 后 10 秒内恢复
