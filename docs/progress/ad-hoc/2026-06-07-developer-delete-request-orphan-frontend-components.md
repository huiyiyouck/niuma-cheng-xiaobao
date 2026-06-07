# Developer 删除请求：5 个孤儿前端组件（v0.5 重构遗孤）

- 日期：2026-06-07
- 提出角色：Developer
- 模式：受保护路径删除 Review 请求（依据 `docs/baseline/conventions.md §受保护路径删除 Review 门禁`）
- 需要 Review：Architect（架构师）
- 关联：INDEX 跨任务待办 P0「修复 frontend 31 个 TS 错误」、`docs/progress/iterations/v0.5.1-frontend-ts-errors.txt`

## 背景

v0.5 在迭代中完成「子频道（SubChannel）→ 频道（Channel）」数据模型重命名 + Source 字段从「source_url/status」迁移到「source_identity/availability_status+operational_status」+ 多个组件按原型重构。新组件全部就位并接入 router/父组件，但 5 个旧组件文件未删除，停留在仓库中。

2026-06-07 DevOps 上线 v0.5.1 时尝试重新 `npm run build`，vue-tsc 报 31 个 TypeScript 错误中有 22 个来自这 5 个孤儿文件。Developer 本次已修复全部 9 个正用文件中的 9 个错误（commit 即将提交），剩余 17 个错误（部分原报 22 个错误经依赖解析合并）全部集中在这 5 个孤儿文件，**且这 5 个文件在 `src/` 中没有任何引用**（路由、组件、composables、index.html、vite.config 全部已确认）。

按 Owner 指示「删除文件一定要让架构师 review，走最小路径」+「不允许加 @ts-nocheck 绕过，部署推迟到 Architect 删除后」，本删除清单请求架构师 Review，通过后由 Developer 执行 `git rm` 并 commit，重新构建即可解除 v0.5/v0.5.1 前端部署阻塞。

## 待删文件清单

| # | 路径 | 删除原因 | 最近一次变更 |
|---|------|----------|------------|
| 1 | `frontend/src/components/InlineAddSource.vue` | v0.5 重构后被 `SearchSourceModal.vue` + `SourceCreateForm.vue` 替代；仍调用已删 API `listSubChannels` 与已删字段 `source_url`；零引用 | `c4463f2 2026-05-30 v0.4 InlineAddSource: X/Twitter 账号/关键词配置字段` |
| 2 | `frontend/src/components/SubChannelManager.vue` | v0.5 数据模型将「SubChannel」整体重命名为「Channel」并改由 `SpaceManagementTab.vue` 内置频道列表管理；本文件全文调用已删 `listSubChannels/createSubChannel/updateSubChannel/deleteSubChannel` 与已删类型 `SubChannel`；零引用 | `f10ceb8 2026-06-07 v0.5 UI 收尾: 原型对齐 + 搜索式添加源 + 基础组件库` |
| 3 | `frontend/src/components/VerifyDialog.vue` | v0.5 验证流程改由 `SourceVerifyDialog.vue` 提供；本文件调用已删导出 `markVerified` 与已删字段 `source.source_url`/`source.status`；零引用 | `f10ceb8 2026-06-07 v0.5 UI 收尾: 原型对齐 + 搜索式添加源 + 基础组件库` |
| 4 | `frontend/src/components/ChannelFilter.vue` | v0.5 频道筛选改由 `ChannelPills.vue` + NewsPage 内置 context-card 提供；本文件引用已删类型 `ChannelSpace`；零引用 | `ea9e906 2026-05-30 v0.4 实现阶段完成：全栈功能落地` |
| 5 | `frontend/src/components/SearchFilterBar.vue` | v0.5 信息源库筛选改由 `SourceLibraryTab.vue` 内置 + `FilterSelect.vue` 实现；本文件全部类型 import 未使用、整体未挂载；零引用 | `9b83263 2026-06-06 Developer: v0.5 全栈实现 R1` |

### 零引用核对方法

```bash
cd frontend
for c in InlineAddSource SubChannelManager VerifyDialog ChannelFilter SearchFilterBar; do
  grep -rn "\b$c\b" src/ index.html vite.config.* | grep -v "components/$c.vue"
done
# 输出为空（已执行）
```

### 替代关系一览

| 旧 | 新 |
|----|----|
| InlineAddSource.vue | SearchSourceModal.vue + SourceCreateForm.vue |
| SubChannelManager.vue | SpaceManagementTab.vue 内置频道列表（含上/下移、编辑、删除） |
| VerifyDialog.vue | SourceVerifyDialog.vue |
| ChannelFilter.vue | ChannelPills.vue + NewsPage.vue 内置 context-card |
| SearchFilterBar.vue | SourceLibraryTab.vue 内置筛选 + FilterSelect.vue |

## 风险评估（Developer 自评，待架构师复核）

- ✅ **运行时风险**：零。5 个文件无引用 → 删除不会影响构建产物体积外的任何运行时行为。
- ✅ **数据风险**：零。前端 .vue 组件，无 DB/磁盘副作用。
- ✅ **回滚成本**：低。git 历史完整保留，需要时可 `git revert` 或单文件 checkout。
- ⚠️ **可能漏点**：若某编外 PR/分支引用其中之一，删除后冲突。请架构师 Review 时确认无非 main 分支待合并工作。
- ⚠️ **commit 范围一致性**：本删除 commit 与 9 个正用文件的修复将拆为两个独立 commit（修复 commit 先于删除 commit）。删除 commit message 将明确含「删除」字样和文件清单（符合 conventions §commit message 规范）。

## 请求 Architect Review

请架构师切换角色后：
1. 复核以上零引用结论
2. 评估替代关系一览的正确性（如有遗漏功能未在新组件中实现，需指出）
3. 给出 ✅通过 / ❌驳回 / ⚠️有条件通过 结论
4. 在本文件「Review 结论」段追加结论
5. 同步更新 `docs/progress/roles/architect.md`

通过后由 Developer 执行：
```bash
git rm frontend/src/components/InlineAddSource.vue \
       frontend/src/components/SubChannelManager.vue \
       frontend/src/components/VerifyDialog.vue \
       frontend/src/components/ChannelFilter.vue \
       frontend/src/components/SearchFilterBar.vue
git commit  # 标题含「删除」字样 + body 含删除清单 + Review 留痕
```
然后 `npm run build` 应当通过，DevOps 重新部署前端 dist 即可解除阻塞。

## Review 结论

### 2026-06-07 — Architect Review：✅ 通过

**Reviewer**：Architect（架构师）
**Review 方法**：实际读 5 个文件 + 全仓 grep + 核查被引用的已删 API/类型/字段是否真已删 + 复核新替代组件存在与引用关系
**结论**：✅通过。同意 Developer 执行 `git rm` 5 个文件并 commit。

#### 复核详情

1. **零引用复核**：✅
   - `src/`、`index.html`、`vite.config.*` 全部扫描通过（grep -rn `\b<name>\b`）
   - 整个 `frontend/` 子串扫描（含 `.vue/.ts/.js/.json/.html`，剔除 `node_modules/dist`）仅 `VerifyDialog` 命中 `SourceVerifyDialog`（子串伪命中，非引用本体）
   - 单分支单 worktree，无本仓库内编外分支风险

2. **依赖已删 API/类型/字段事实成立**：✅（抽样核查）
   - `lib/api.ts` 中 `listSubChannels/createSubChannel/updateSubChannel/deleteSubChannel/markVerified` 全部不存在
   - `lib/types.ts` 中 `SubChannel/ChannelSpace` 类型不存在；Source 字段 `source_url` 不存在
   - 5 个旧组件中 4 个明确引用了上述已删导出（详见 grep 结果）；`SearchFilterBar.vue` 是 v0.5 实现 R1 中途产物（commit `9b83263`），在 UI 收尾 `f10ceb8` 后被 `SourceLibraryTab.vue` 内置筛选 + `FilterSelect.vue` 取代，整体零引用即足以判废

3. **替代关系一览**：✅总体成立，附 1 项观察（不阻塞本次删除）
   - InlineAddSource → SearchSourceModal + SourceCreateForm：替代组件均被 SpaceManagementTab/SourceLibraryTab 引用 ✅
   - SubChannelManager → SpaceManagementTab 内置频道列表：SpaceManagementTab 由 AdminPage 引用 ✅
   - VerifyDialog → SourceVerifyDialog：被 SourceCreateForm 引用 ✅
   - SearchFilterBar → SourceLibraryTab 内置 + FilterSelect：均被引用 ✅
   - ⚠️ ChannelFilter → ChannelPills + NewsPage context-card：**`ChannelPills.vue` 实际全仓零引用**，NewsPage 中的频道筛选已**完全内联**（`.cc-pill` 直接渲染 `channels.value`，无组件包裹）。Developer 的替代描述"ChannelPills + NewsPage 内置 context-card"中前半段是冗余表述——`ChannelPills.vue` 与本次待删的 `ChannelFilter.vue` 同属孤儿组件。**但 `ChannelPills.vue` 不在本次删除清单内，不在本次 Review 范围**；建议 Developer 在本次删除完成后另起一次受保护路径删除 Review 请求处理（不要在本次门禁内偷夹带，保持删除原子可追溯）。

#### 风险评估复核

- 运行时风险：✅ 零（同意 Developer 自评）
- 数据风险：✅ 零
- 回滚成本：✅ 低（git 历史完整）
- 编外分支引用：本地仅 `main` 单分支、单 worktree，本仓库可见范围无风险。如远端 GitHub 仍有他人 fork/PR 引用，需 Owner 兜底，但这类风险与本删除决策本身无关。

#### 执行条件

- Developer 按预案执行 `git rm` 5 个文件，**修复 commit 与删除 commit 分两个独立 commit 提交**（已在请求中承诺）
- 删除 commit 标题第一行必须含「删除」字样（满足 conventions §commit message 规范）
- 删除 commit body 必须含：

  ```
  删除清单：
    - frontend/src/components/InlineAddSource.vue（v0.5 重构已被 SearchSourceModal+SourceCreateForm 替代）
    - frontend/src/components/SubChannelManager.vue（v0.5 重命名后由 SpaceManagementTab 内置替代）
    - frontend/src/components/VerifyDialog.vue（v0.5 由 SourceVerifyDialog 替代）
    - frontend/src/components/ChannelFilter.vue（v0.5 频道筛选改由 NewsPage 内置 context-card 实现）
    - frontend/src/components/SearchFilterBar.vue（v0.5 由 SourceLibraryTab 内置+FilterSelect 替代）
  Review：架构师 ✅通过（2026-06-07 / docs/progress/roles/architect.md 本日条目）
  ```

- 删除后 `npm run build`（vue-tsc）应清零，DevOps 才能重新部署前端 dist 解除 v0.5/v0.5.1 阻塞

#### 后续动作

- Developer：执行删除 + commit + push + `npm run build` 验证 → 移交 DevOps 部署
- Developer（建议另起）：把 `ChannelPills.vue` 列入下一次受保护路径删除 Review 请求（不阻塞本次）
