# 前端 React 接 API 交接文档（剩余页面）

> 🟢 **新会话只读本文件这一个就够**——不要读 INDEX、CLAUDE.md、决策记录或原型其它文档，本文件已自包含。
> 启动语：「普通模式，只读 `docs/progress/ad-hoc/2026-06-14-frontend-react-wiring-handoff.md`，照里面 NewsPage 套路接 AdminPage」。

## 当前状态（2026-06-14）

- 前端已从 Vue 迁移到 **React**（Figma Make 原型工程），位于 `frontend/`。
- 技术栈：Vite6 + React18 + react-router7 + Tailwind v4 + shadcn(Radix UI)。
- API 客户端：`frontend/src/app/lib/api.ts`（后端 `/v1` 契约，相对路径，dev 走 vite proxy → `:8001` 测试后端，生产走 nginx）。
- **NewsPage 已接真实 API（已 build 通过，作为样板）**：`frontend/src/app/pages/NewsPage.tsx`。
- 后端零改动。决策背景见 `2026-06-14-decision-frontend-vue-to-react.md`。

## 接入套路（照 NewsPage 做，核心原则）

1. `import { ... } from "../lib/api"` 引入需要的 API 函数。
2. 把页面里的 **mock 常量**改成 `useState`。
3. 用 `useEffect` 加载数据（mount 时 + 依赖变化时）。
4. 写 `mapXxx(raw)` 把后端字段映射成**原型组件期望的 shape**，字段用 `??` 兜底。
5. 写操作 handler 里的 `console.log`/mock → 调对应 API 函数 + 成功后重新加载。
6. **🔴 铁律：原型的所有交互逻辑（onClick / navigate / useState 弹窗开关 / 滑块 / 排序等）一字不改，只换数据来源。**（Owner 明确要求）

## 剩余清单

| 文件 | mock 数据位置 | 要接的 API（api.ts 已封装） |
|------|--------------|------------------------------|
| `pages/AdminPage.tsx` | 双 Tab 外壳，基本无 mock | 一般无需改 |
| `components/admin/SpacesManagement.tsx` | `mockSpaces` / `mockChannels` / `mockSources` | `listSpaces` `listChannels` `listSpaceSources` + `createSpace/updateSpace/deleteSpace` `createChannel/updateChannel/deleteChannel` `pauseSource/resumeSource` `removeDisplayPosition` `moveDisplayPosition` |
| `components/admin/SourceLibrary.tsx` | mock 源列表 | `listSources`(带筛选/分页) + `syncXRules` |
| `pages/MonitoringPage.tsx` | mock 告警 + 日志 | `listAlerts` `markAlertProcessed` `getUnreadAlertsCount` `getLogsConfig` |
| `pages/SourceDetailPage.tsx` | mock `source`/`placements`/`recentNews` | `getSource` `updateSource` `deleteSource` `toggleDisplayPosition` `removeDisplayPosition` `addDisplayPosition` |
| `components/admin/AddSourceDrawer.tsx` | `mockAvailableSources`（search/create 双视图） | search→`listSources`+`addDisplayPosition`；create→`preVerifySource`+`createSource`+`addDisplayPosition` |
| `components/admin/SourceEditDrawer.tsx` | 无（props 传入） | `onSave` → `updateSource` |
| `components/admin/SpaceEditDialog.tsx` | 无 | `onSave` → `createSpace`/`updateSpace`（图标当前是 emoji 文本；图标**上传**需后端 `GET /v1/spaces` 补返回 `icon_url`，原型未画，建议另行确认是否做） |
| `components/admin/ChannelEditDialog.tsx` | 无 | `onSave` → `createChannel`/`updateChannel` |
| `components/admin/DeleteConfirmDialog.tsx` | 无 | `onConfirm` → 按 type 调 `deleteSpace`/`deleteChannel`/`deleteSource`/`removeDisplayPosition` |

## 字段映射注意（后端 → 原型 shape）

- **space**：后端 `{id,name,icon,description,channel_count,source_count}` → 原型 `{...,channelCount,sourceCount}`（驼峰）。
- **source（listSpaceSources 已聚合）**：含 `display_positions[]`（每项有 `id`/`channel_id`/`channel_name`/`enabled`，但 `space_name` 为空串）。`availability_status` 值：`normal`/`awaiting_repair`/`source_error`/`source_removed`。`paused` 决定运行态。
- **news**：`score_total ?? importance_score`，`tags_v2 ?? tags`，`source:{id,name} ?? source_id+source_display_name`。见 `NewsPage.tsx` 的 `mapNews`。
- **「从此位置移除」定位 positionId**：在具体频道取 `display_positions` 里 `channel_id===选中频道` 的 position；在「全部」频道取该源在当前空间的全部 position。
- 旧 Vue 的完整映射可参考 git 历史：`git show HEAD~1:frontend/src/lib/api.ts`（迁移前的 api.ts，含 `mapSpace`/`mapSource`/stats 字段名）。

## 环境坑（重要，省得新会话踩一遍）

- **装依赖必须禁 sandbox**（需联网）：Bash 用 `dangerouslyDisableSandbox: true`，否则 npm install 静默失败、node_modules 不生成。
- **一律用绝对路径**：此环境 cwd 会飘移，相对路径时好时坏；多行 shell 脚本可能被部分吞掉，破坏性操作（rm/mv）务必单命令 + 立即验证。
- **build**：`cd frontend && npm run build`（vite build，不跑 tsc，unused 不报错）。已知需先修：原型 import 大小写（如已修的 `ui/Badge`→`ui/badge`），Linux 大小写敏感。
- **截图自查**：`/tmp/pwenv/bin/python` 已装 playwright+chromium；dev server 起后截图，**截图必须存项目目录内**（Read 工具只能读项目目录）。
- **dev server**：`cd frontend && npm run dev`（禁 sandbox），proxy 已配 `/v1`+`/uploads`→`:8001`；需测试后端 `news-api-test`(:8001) 在跑才有真实数据。

## 验收

每接完一页：`npm run build` 通过 → 起 dev + playwright 截图自查视觉与原型一致 → 确认交互未被破坏。全部接完后切到 test 环境部署，Owner 浏览器整体视觉验证。
