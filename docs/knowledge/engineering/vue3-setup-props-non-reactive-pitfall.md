# Vue 3 setup 中 const 解构 props 非响应式陷阱

## 元信息
- 类型：Engineering
- 来源：[Developer 日志 2026-05-31 v0.4 Bugfix 批次 §5a](../../progress/roles/developer.md)
- 创建日期：2026-05-31
- 相关角色：Developer
- 相关迭代/任务：v0.4 视觉验证 Bugfix（commit `e736980`）

## 内容摘要

Vue 3 `<script setup>` 里直接用 `const` 解构 `props` 拿到的字段，**会丢失响应式**。父组件传入新的 prop 时，子组件这些常量仍指向旧值，模板里看上去"组件不刷新"。

```vue
<!-- ❌ 错误写法 -->
<script setup lang="ts">
const props = defineProps<{ binding: ChannelSourceWithSource }>();
const source = props.binding.source;        // 一次性解构，引用冻结
const cs = props.binding.channel_source;    // 同上
const isXT = source.type === "x_twitter";   // 用早冻结的常量算出来，也是常量
</script>

<template>
  <span :class="statusBadge(cs.enabled)">{{ cs.enabled }}</span>
  <!-- 父组件 refreshSpaceData() 后 binding 是新对象，但 cs 还是老引用 -->
</template>
```

正确做法：用 `computed` 包一层，让派生引用跟随 props 自动更新：

```vue
<!-- ✅ 正确写法 -->
<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{ binding: ChannelSourceWithSource }>();
const source = computed(() => props.binding.source);
const cs = computed(() => props.binding.channel_source);
const isXT = computed(() => source.value.type === "x_twitter");
</script>

<template>
  <!-- 模板里 Vue 自动解包 .value -->
  <span :class="statusBadge(cs.enabled)">{{ cs.enabled }}</span>
</template>

<script setup>
  // script 里要显式 .value
  async function onSave() {
    await api.put(`/v1/sources/${source.value.id}`, ...);
  }
</script>
```

## 配套：基于 props 初始化的 ref 也要 watch 同步

派生 ref（编辑表单的本地 ref）通常用 `ref(props.xxx)` 初始化，**只在组件创建时跑一次**。如果父组件保留组件实例（v-for 同 key 复用）而 props 数据更新，本地 ref 不会自动同步。

```vue
<script setup>
const props = defineProps<{ binding, editing: boolean }>();
const editEnabled = ref(props.binding.channel_source.enabled);  // 只跑一次

// 进入编辑态时同步最新值，防止保存后下次编辑显示旧数据
watch(() => props.editing, (now) => {
  if (!now) return;
  editEnabled.value = props.binding.channel_source.enabled;
  // ... 其余编辑表单 ref
});
</script>
```

## 适用场景

- Vue 3 `<script setup>` 中需要把 props 的某个字段拆出来在多处复用
- 子组件 v-for 同 key 被复用（不是每次销毁重建），父组件 refresh 后数据更新
- 用本地 ref 做编辑表单缓冲（避免直接改 props）

## 不适用场景

- 子组件每次都靠 `:key` 变化销毁重建（这种情况 const 解构也"刷新"，因为组件实例都换了）——但靠 key 重建意味着丢失内部状态（输入框焦点、滚动位置），代价大；多数场景应该用 computed 而非换 key
- 解构纯静态 prop（一辈子不变，如 `theme` 主题色）——可以 const 解构，但建议默认 computed，养成习惯

## 关键陷阱

1. **症状容易误判为"父组件没刷新"**：表象是徽章不变，实际父组件 refresh 拿到了新数据、传给了子组件 props，是子组件内部丢了响应链
2. **`destructure props with defaults` 反模式**：`const { binding } = props` 同样丢响应式；解构后的 `binding` 是普通常量
3. **`toRefs(props)`** 可以保留响应式，但拿到的是 `Ref` 不是原值，模板里访问需要 .value，反而更绕；优先用 computed
4. **Vue 3.5+ Reactive Props Destructure** 编译时支持 `const { binding } = defineProps(...)` 保留响应式——但要确认项目 Vue 版本 ≥ 3.5 且开启 RFC 502 编译选项；本项目（Vue 3.x 未指定子版本）保守用 computed

## 证据/链接

- 实战案例：`frontend/src/components/SourceCard.vue` 在 v0.4 实现阶段定稿（commit `d3997d9`）时用了 `const source = props.binding.source` 模式，用户视觉验证时发现"编辑信息源→关闭启用→保存→徽章仍显示运行中"
- 修复 commit：`e736980`（同时引入 statusBadge 的 enabled 维度 + computed 改造 + watch 同步）
- Bugfix 详细记录：[Developer 日志 2026-05-31 §5a](../../progress/roles/developer.md)

## 后续动作

- 评估项目内其他 setup 组件是否有同类问题（grep `const .* = props\\.`，找到的视情况改 computed）
- 这类陷阱适合纳入团队"前端代码 Review checklist"——v0.4 实现阶段 R1/R2 Review 都没发现这条问题，说明 Review 时缺少对应检查点
