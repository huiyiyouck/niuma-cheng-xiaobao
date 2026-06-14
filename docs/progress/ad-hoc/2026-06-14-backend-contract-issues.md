# 后端契约问题记录（前端接 AdminPage 时发现）

> 记录人：前端接 AddSourceDrawer 时发现。**当前以前端为主，后端先不动**，仅登记待后续由 PM/架构/后端确认。

## 背景

接 `AddSourceDrawer`（新建信息源抽屉）真实 API 时，发现前端 `frontend/src/app/lib/api.ts` 里几个 source 相关封装与后端 `server/src/api/routes/sources.ts` 实际契约对不上。这些封装在 NewsPage / 空间管理之前都没被任何页面调用过，属未联调的死封装。

## 一、前端封装与后端路由/字段不一致（已在前端侧修正）

| 前端封装 | 原指向（错误） | 后端实际 | 处理 |
|----------|----------------|----------|------|
| `preVerifySource` | `POST /v1/sources/pre-verify`，body `{type, source_identity}` | 无此路由；只有 `POST /v1/sources/verify`，body `{type, identity, config}` | ✅ 前端已改指 `/v1/sources/verify` 并映射 `identity` |
| `createSource` | body 用 `source_identity` | `POST /v1/sources` 要 `identity` | ✅ 前端已在封装内映射 `source_identity → identity` |

## 二、前端仍存在、但本次未用到的错误封装（未修，待确认）

- `checkDuplicateSource` → 指向 `POST /v1/sources/check-duplicate`，**后端无此路由**（后端是在 `POST /v1/sources` 内部做去重，命中返 409 + `existing_source_id`）。当前无页面调用。
- `verifySource(id)` → 指向 `POST /v1/sources/{id}/verify`，**后端无此路由**（只有不带 id 的 `/v1/sources/verify`）。当前无页面调用。

> 建议：要么删掉这两个死封装，要么等后续真要用时按后端实际契约重写。本次未动，避免扩大改动面。

## 三、产品/原型与后端的真实冲突（需 PM/架构拍板，前端无法单方解决）

**后端禁止平台创建 X 源。** `POST /v1/sources` 中 `type === "x_twitter"` 直接返回 400：

```
X 信息源由 X Developer Portal 规则自动同步，请在 Portal 创建规则后等待同步
```

但原型 `AddSourceDrawer` 的「新建信息源」create 视图画了 **「X 搜索」** 类型入口（搜索关键字 + 搜索间隔）。

- 现状：前端已如实接通——选 RSS 能正常新建；选「X 搜索」点保存会收到后端 400，落到错误提示。
- 待确认：「X 搜索」create 入口是否应保留？若 X 源只能走 Portal 同步，这个入口要么去掉，要么改成只读引导文案。需 PM/架构确认产品意图。

## 四、其它接入时的取舍（前端侧，非后端问题，仅备注）

- create 表单「来源角色」是自由文本输入，后端 `source_role` 是枚举（official/media/kol/community/research/other）。本次新建时**未传** `source_role`，走后端 default `other`，自由文本暂未映射。后续如需，要么前端改成下拉枚举，要么后端放开自由文本。
- 删除确认弹窗的「关联新闻数」前端暂填 0（真实数需调 `delete-preview` 接口，原型本就是写死 mock 数）。
