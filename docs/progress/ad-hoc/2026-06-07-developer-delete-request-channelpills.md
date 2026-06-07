# Developer 删除请求：ChannelPills.vue（v0.5 重构遗孤 · 第 6 个）

- 日期：2026-06-07
- 提出角色：Developer
- 模式：受保护路径删除 Review 请求（依据 `docs/baseline/conventions.md §受保护路径删除 Review 门禁`）
- 需要 Review：Architect（架构师）
- 关联：
  - 2026-06-07 Architect Review 5 个孤儿组件删除请求结论中的「附 1 项观察」（见 `docs/progress/ad-hoc/2026-06-07-developer-delete-request-orphan-frontend-components.md §Review 结论 §3`）
  - INDEX 跨任务待办 P2「ChannelPills.vue 受保护路径删除 Review」
- 优先级：P2（不阻塞部署 — 该文件 TS 编译通过、不在前次 31 错误清单内；本请求是死代码清理）

## 背景

2026-06-07 Architect Review 上一批 5 个孤儿前端组件删除请求时，在「替代关系一览」复核中发现：

> ⚠️ ChannelFilter → ChannelPills + NewsPage context-card：**`ChannelPills.vue` 实际全仓零引用**，NewsPage 中的频道筛选已**完全内联**（`.cc-pill` 直接渲染 `channels.value`，无组件包裹）。Developer 的替代描述"ChannelPills + NewsPage 内置 context-card"中前半段是冗余表述——`ChannelPills.vue` 与本次待删的 `ChannelFilter.vue` 同属孤儿组件。**但 `ChannelPills.vue` 不在本次删除清单内，不在本次 Review 范围**；建议 Developer 在本次删除完成后另起一次受保护路径删除 Review 请求处理（不要在本次门禁内偷夹带，保持删除原子可追溯）。

按 Architect 建议，本次另起一次最小化的删除请求，专门处理 `ChannelPills.vue`。

## 待删文件清单

| # | 路径 | 删除原因 | 最近一次变更 |
|---|------|----------|------------|
| 1 | `frontend/src/components/ChannelPills.vue` | v0.5 频道展示已由 `NewsPage.vue` context-card 中 `.cc-pill` 直接 `v-for="ch in channels"` 内联实现；频道的创建/编辑/删除/排序已由 `SpaceManagementTab.vue` 内置实现（v0.5 Owner 试用 Bugfix 批次已确认）；本文件全仓零引用 | `75ca9ae 2026-06-07 v0.5 Owner 试用 Bugfix 批次: 前后端契约对齐 + 空间/频道/源管理 + 告警批量 + MCP 协议接入基础` |

### 零引用核对方法

```bash
cd frontend
# 1) 精确符号扫描
grep -rn "\bChannelPills\b" src/ index.html vite.config.* | grep -v "components/ChannelPills.vue"
# 输出：空（EXIT=1）

# 2) 全仓更宽扫描（含 kebab-case / camelCase 命名形式）
grep -rn "channel-pills\|channelPills\|ChannelPills" \
  --include="*.vue" --include="*.ts" --include="*.js" --include="*.json" --include="*.html" \
  --exclude-dir=node_modules --exclude-dir=dist | grep -v "components/ChannelPills.vue"
# 输出：空（EXIT=1）
```

### 替代关系核对

| 旧（待删） | 新（已就位） | 验证方式 |
|----|----|----|
| `ChannelPills.vue`「频道选中态展示」 | `NewsPage.vue` context-card 内 `<button v-for="ch in channels" class="cc-pill">` 直接渲染 | `grep -n "channel" src/views/NewsPage.vue` 第 151-160 行确认 |
| `ChannelPills.vue`「频道创建/编辑/删除/排序」 | `SpaceManagementTab.vue` 内置（`openChannelCreate/openChannelEdit/doDeleteChannel/moveChannel`） | 已在 commit `75ca9ae`（v0.5 Owner 试用 Bugfix 批次）落地并被 AdminPage 引用 |

## 与上一批 5 个孤儿的差异（重要）

- **TS 编译状态**：`ChannelPills.vue` 自身 TS 编译通过，**不在** 2026-06-07 DevOps 报的 31 个错误清单中
- **部署阻塞性**：删除该文件**不阻塞** v0.5/v0.5.1 部署；本请求是死代码清理，非紧急
- **优先级**：P2（上一批是 P0，因为 5 个孤儿的 22 个 TS 错误直接阻塞构建）
- **范围**：单文件单 commit，最小化 Review 成本

## 风险评估（Developer 自评，待架构师复核）

- ✅ **运行时风险**：零。零引用 → 删除不会影响构建产物体积外的任何运行时行为。
- ✅ **数据风险**：零。前端 .vue 组件，无 DB/磁盘副作用。
- ✅ **回滚成本**：低。git 历史完整保留。
- ✅ **构建影响**：零（该文件本来就编译通过，删除后构建仍 0 错误）。
- ⚠️ **可能漏点**：若某编外 PR/分支引用本文件，删除后冲突；本地单分支单 worktree 风险为零。

## 请求 Architect Review

请架构师切换角色后：
1. 复核零引用结论（建议自行 grep 一次实证）
2. 复核 NewsPage 内联实现 + SpaceManagementTab 频道 CRUD 的替代关系
3. 给出 ✅通过 / ❌驳回 / ⚠️有条件通过 结论
4. 在本文件「Review 结论」段追加结论
5. 同步更新 `docs/progress/roles/architect.md`

通过后由 Developer 执行：
```bash
git rm frontend/src/components/ChannelPills.vue
git commit  # 标题含「删除」字样 + body 含删除清单 + Review 留痕
```
然后 `npm run build` 应继续通过，DevOps 后续部署即可。

## Review 结论

> 待 Architect 填写
