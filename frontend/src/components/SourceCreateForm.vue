<script setup lang="ts">
import { ref, computed } from "vue";
import type { DomainTag, SourceRole, AttentionLevel } from "@/lib/types";
import { createSource, checkDuplicateSource } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import SourceVerifyDialog from "@/components/SourceVerifyDialog.vue";
import type { SourceVerifyResponse } from "@/lib/types";

// v0.5: Source 创建表单，支持双路径创建
// entryPoint: library -> 从信息源库创建
//            space_management -> 从空间管理页创建（支持目标空间/频道）
const props = defineProps<{
  entryPoint: "library" | "space_management";
  targetSpaceId?: string;
  targetChannelId?: string | null;
}>();

const emit = defineEmits<{
  created: [sourceId: string];
  cancel: [];
}>();

const toast = useToast();

const sourceType = ref<"x_twitter" | "rss">("rss");
const sourceIdentity = ref("");
const displayName = ref("");
const domainTags = ref<DomainTag[]>([]);
const sourceRole = ref<SourceRole>("official");
const contentTopics = ref<string[]>([]);
const attentionLevel = ref<AttentionLevel>("regular");
const notes = ref("");

const submitting = ref(false);
const showVerify = ref(false);

// 可用性状态控制：身份字段的可编辑性
// 创建阶段始终可编辑
const identityEditable = computed(() => true);

const DOMAIN_TAG_OPTIONS: { value: DomainTag; label: string }[] = [
  { value: "AI", label: "AI" },
  { value: "财经", label: "财经" },
  { value: "开源", label: "开源" },
  { value: "科技", label: "科技" },
  { value: "其他", label: "其他" },
];

const ROLE_OPTIONS: { value: SourceRole; label: string }[] = [
  { value: "official", label: "官方" },
  { value: "media", label: "媒体" },
  { value: "kol", label: "KOL" },
  { value: "community", label: "社区" },
  { value: "paper_institute", label: "论文机构" },
  { value: "other", label: "其他" },
];

const ATTENTION_OPTIONS: { value: AttentionLevel; label: string }[] = [
  { value: "core", label: "核心" },
  { value: "regular", label: "常规" },
  { value: "observe", label: "观察" },
];

function toggleDomainTag(tag: DomainTag) {
  if (domainTags.value.includes(tag)) {
    domainTags.value = domainTags.value.filter(t => t !== tag);
  } else {
    domainTags.value = [...domainTags.value, tag];
  }
}

async function doSubmit() {
  if (!sourceIdentity.value.trim()) { toast.error("请输入来源身份"); return; }
  if (!displayName.value.trim()) { toast.error("请输入展示名称"); return; }
  if (domainTags.value.length === 0) { toast.error("请选择至少一个领域标签"); return; }

  // 去重检查
  try {
    const dup = await checkDuplicateSource({
      type: sourceType.value,
      source_identity: sourceIdentity.value.trim(),
    });
    if (dup.is_duplicate) {
      toast.error("该来源已存在，请勿重复创建");
      return;
    }
  } catch { /* 检查失败不阻塞创建 */ }

  submitting.value = true;
  try {
    const source = await createSource({
      type: sourceType.value,
      source_identity: sourceIdentity.value.trim(),
      display_name: displayName.value.trim(),
      domain_tags: domainTags.value,
      source_role: sourceRole.value,
      content_topics: contentTopics.value,
      attention_level: attentionLevel.value,
      notes: notes.value.trim() || undefined,
    });
    toast.success("信息源已创建");
    emit("created", source.id);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    submitting.value = false;
  }
}

function onVerified(result: SourceVerifyResponse) {
  showVerify.value = false;
  // 验证成功后可以自动填充展示名称
  if (!displayName.value && result.account_name) {
    displayName.value = result.account_name;
  }
  if (!displayName.value && result.site_title) {
    displayName.value = result.site_title;
  }
}
</script>

<template>
  <div class="create-form">
    <h3 class="form-title">{{ entryPoint === 'library' ? '新建信息源' : '添加信息源' }}</h3>

    <!-- 第 1 行：类型 + 身份 -->
    <div class="form-row">
      <label class="form-label">
        类型
        <select v-model="sourceType" class="select" style="min-width:120px">
          <option value="rss">RSS</option>
          <option value="x_twitter">X/Twitter</option>
        </select>
      </label>
      <label class="form-label" style="flex:1">
        来源身份
        <input
          class="input"
          v-model="sourceIdentity"
          :placeholder="sourceType === 'x_twitter' ? 'X 用户名 (如 @OpenAI)' : 'RSS URL'"
          :disabled="!identityEditable"
        />
      </label>
    </div>

    <!-- 第 2 行：展示名称 -->
    <div class="form-row">
      <label class="form-label" style="flex:1">
        展示名称
        <input class="input" v-model="displayName" placeholder="显示在页面上的名称" />
      </label>
      <button class="btn verify-btn" @click="showVerify = true" type="button">验证来源</button>
    </div>

    <!-- 领域标签（多选） -->
    <div class="form-group">
      <span class="form-label-text">领域标签</span>
      <div class="pill-options">
        <button
          v-for="opt in DOMAIN_TAG_OPTIONS" :key="opt.value"
          class="option-pill" :class="{ active: domainTags.includes(opt.value) }"
          @click="toggleDomainTag(opt.value)" type="button"
        >{{ opt.label }}</button>
      </div>
    </div>

    <!-- 来源角色（单选） -->
    <div class="form-group">
      <span class="form-label-text">来源角色</span>
      <div class="pill-options">
        <button
          v-for="opt in ROLE_OPTIONS" :key="opt.value"
          class="option-pill" :class="{ active: sourceRole === opt.value }"
          @click="sourceRole = opt.value" type="button"
        >{{ opt.label }}</button>
      </div>
    </div>

    <!-- 关注级别（单选） -->
    <div class="form-group">
      <span class="form-label-text">关注级别</span>
      <div class="pill-options">
        <button
          v-for="opt in ATTENTION_OPTIONS" :key="opt.value"
          class="option-pill" :class="{ active: attentionLevel === opt.value }"
          @click="attentionLevel = opt.value" type="button"
        >{{ opt.label }}</button>
      </div>
    </div>

    <!-- 内容主题（自由标签） -->
    <div class="form-group">
      <span class="form-label-text">内容主题（可选）</span>
      <div class="free-input-row">
        <input
          class="input"
          placeholder="输入主题后按回车添加"
          @keydown.enter="(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            if (v && !contentTopics.includes(v)) contentTopics.push(v);
            (e.target as HTMLInputElement).value = '';
          }"
        />
      </div>
      <div v-if="contentTopics.length > 0" class="free-tags">
        <span v-for="t in contentTopics" :key="t" class="free-tag">
          {{ t }}
          <button class="free-tag-remove" @click="contentTopics = contentTopics.filter(x => x !== t)" type="button">×</button>
        </span>
      </div>
    </div>

    <!-- 备注 -->
    <div class="form-group">
      <label class="form-label-text">备注（可选）</label>
      <textarea class="textarea" v-model="notes" placeholder="关于该来源的备注信息…" rows="2"></textarea>
    </div>

    <!-- 目标信息（空间管理入口时显示） -->
    <div v-if="entryPoint === 'space_management'" class="form-target">
      <span class="muted">将添加到：</span>
      <span v-if="targetChannelId">目标频道</span>
      <span v-else>空间根节点</span>
      <span class="muted" style="font-size:10px">（创建成功后可定义更多展示位置）</span>
    </div>

    <!-- 按钮 -->
    <div class="form-actions">
      <button class="btn" @click="emit('cancel')" :disabled="submitting">取消</button>
      <button class="btn primary" :disabled="submitting" @click="doSubmit">
        {{ submitting ? '创建中…' : '创建信息源' }}
      </button>
    </div>

    <!-- 验证弹窗 -->
    <SourceVerifyDialog
      v-if="showVerify"
      :sourceType="sourceType"
      :sourceIdentity="sourceIdentity"
      @close="showVerify = false"
      @verified="onVerified"
    />
  </div>
</template>

<style scoped>
.create-form {
  background: var(--card);
  border: 2px dashed var(--accent);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: slideDown 0.25s ease-out;
}
.form-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
}
.form-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.form-label {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-label .input, .form-label .select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 13px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label-text {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}
.pill-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.option-pill {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.option-pill:hover { border-color: var(--accent); color: var(--accent); }
.option-pill.active { background: var(--accent); color: #FFF; border-color: var(--accent); }
.free-input-row { display: flex; gap: 6px; }
.free-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.free-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: var(--accent-light); color: var(--accent);
  border: 1px solid rgba(52,152,219,0.2);
}
.free-tag-remove { border: none; background: none; color: var(--accent); cursor: pointer; font-size: 14px; padding: 0; line-height: 1; }
.form-target {
  padding: 8px 12px;
  background: #F8FAFB;
  border-radius: 8px;
  font-size: 12px;
  display: flex;
  gap: 6px;
  align-items: center;
}
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--card);
  cursor: pointer;
}
.btn.primary {
  background: var(--accent);
  color: #FFF;
  border-color: var(--accent);
}
.btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }
.verify-btn {
  padding: 8px 16px;
  font-size: 12px;
  flex-shrink: 0;
}
.textarea {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 13px;
  resize: vertical;
  outline: none;
  font-family: inherit;
}
.textarea:focus {
  border-color: rgba(52,152,219,0.35);
  box-shadow: 0 0 0 4px rgba(52,152,219,0.08);
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
