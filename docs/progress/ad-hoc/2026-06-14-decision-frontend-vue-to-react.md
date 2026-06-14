# 技术决策记录：前端技术栈 Vue3 → React（直接复用原型）

- 日期：2026-06-14
- 模式：非迭代 / 技术决策（Decision）
- 决策人：Owner（项目负责人，直接拍板）
- 执行角色：Developer
- 关联迭代：v0.6 实现阶段

## 决策

v0.6 前端**放弃 Vue3 路线，改用 React**，直接以现有原型 React 工程 `/root/news-aggregation-platform` 为基底开发；逐页将原型内的 mock 替换为真实 `/v1` API。

## 背景

v0.6 前端原计划：「React 原型 → 手工逐组件转译成 Vue3」。该转译是确定性的体力劳动（改 `useState→ref`、`className` 语法、Radix→reka-ui、重调 Tailwind），无技术增量，却**大量消耗 AI 开发用量**。Owner 提出将「前端视觉实现」从 AI 逐行编写中剥离，以降低用量。

## 理由

1. **原型本身就是 React**（React Router + Tailwind + Radix + lucide），视觉/布局/交互 100% 现成 → 用 React 即「直接复用原型」，转译工作量归零，**最大化复用、不重复造轮子**。
2. **前后端已完全剥离**，换前端框架不触及后端（见下「影响评估」）。
3. AI 用量聚焦到不可替代的部分（API 对接、状态逻辑、联调、后端业务），不再烧在框架转译上。

## 影响评估

### 前端
- 弃用现有 Vue 代码（`frontend/` 下 v0.6 已转译部分），属沉没成本。
- 以原型 React 工程为基底，逐页接真实 `/v1` API。
- 遵循前端原则：不重复造轮子、能复用就复用（见 memory `frontend-no-reinvent-reuse`）。

### 后端 —— **零业务改动**
验证依据（2026-06-14 实测）：
- 前端 **0 处** import 后端代码；后端无 SSR / 无模板渲染（仅 `source-detector.ts` 有 SSRF 防护注释，非 SSR）。
- 后端是纯 Fastify REST API（`/v1/...` 返回 JSON），前端通过 HTTP 调用。
- 前后端**唯一接触点**：`server/src/index.ts:18` 将 `frontend/dist` 作为静态目录托管——属「顺便托管打包产物」，非代码耦合。React 同样 build 到 `frontend/dist`（或调整该行 `distPath`）即可，后端继续托管 + 提供 API。
- 结论：**后端不需要重构**，仅需本记录留痕。

## 流程说明

本变更为重大技术栈调整，由 Owner（兼实际项目经理）直接决策，**未走标准 R1/R2 Review**（同 v0.5.1 X 反向同步的有条件处理先例）。后续如需架构层正式评估，可补 Architect Review。

## 后续

- Developer：启动前端 React 重构（复用原型 + 接真实 API）。
- 后端：维持现状，无动作。
