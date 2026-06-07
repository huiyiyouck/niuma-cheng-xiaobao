<script setup lang="ts">
import { ref } from "vue";
import type { DomainTag, SourceRole, AttentionLevel } from "@/lib/types";
import { createSource, checkDuplicateSource } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import SourceVerifyDialog from "@/components/SourceVerifyDialog.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import type { SourceVerifyResponse } from "@/lib/types";

const props = defineProps<{
  entryPoint: "library" | "space_management";
  targetSpaceId?: string;
  targetChannelId?: string | null;
}>();

const emit = defineEmits<{ created: [sourceId: string]; cancel: [] }>();

const toast = useToast();

const sourceType = ref<"rss">("rss");
const sourceIdentity = ref("");
const displayName = ref("");
const domainTags = ref<DomainTag[]>([]);
const sourceRole = ref<SourceRole>("other");
const contentTopics = ref<string[]>([]);
const attentionLevel = ref<AttentionLevel>("regular");
const notes = ref("");
const submitting = ref(false);
const showVerify = ref(false);

const DOMAIN_TAG_OPTIONS: DomainTag[] = ["AI", "财经", "开源", "科技", "其他"];
const ROLE_OPTIONS: { value: SourceRole; label: string }[] = [
  { value: "official", label: "官方" }, { value: "media", label: "媒体" },
  { value: "kol", label: "KOL" }, { value: "community", label: "社区" },
  { value: "research", label: "论文机构" }, { value: "other", label: "其他" },
];
const ATTENTION_OPTIONS: { value: AttentionLevel; label: string }[] = [
  { value: "core", label: "核心" }, { value: "regular", label: "常规" }, { value: "observe", label: "观察" },
];

function toggleDomainTag(tag: DomainTag) {
  if (domainTags.value.includes(tag)) domainTags.value = domainTags.value.filter(t => t !== tag);
  else domainTags.value = [...domainTags.value, tag];
}

async function doSubmit() {
  if (!sourceIdentity.value.trim()) { toast.error("请输入来源身份"); return; }
  if (!displayName.value.trim()) { toast.error("请输入展示名称"); return; }
  if (domainTags.value.length === 0) { toast.error("请选择至少一个领域标签"); return; }
  try {
    const dup = await checkDuplicateSource({ type: sourceType.value, source_identity: sourceIdentity.value.trim() });
    if (dup.is_duplicate) { toast.error("该来源已存在，请勿重复创建"); return; }
  } catch { /* 不阻塞 */ }
  submitting.value = true;
  try {
    const source = await createSource({
      type: sourceType.value, source_identity: sourceIdentity.value.trim(),
      display_name: displayName.value.trim(), domain_tags: domainTags.value,
      source_role: sourceRole.value, content_topics: contentTopics.value,
      attention_level: attentionLevel.value, notes: notes.value.trim() || undefined,
    });
    toast.success("信息源已创建");
    emit("created", source.id);
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  finally { submitting.value = false; }
}

function onVerified(result: SourceVerifyResponse) {
  showVerify.value = false;
  if (!displayName.value && result.account_name) displayName.value = result.account_name;
  if (!displayName.value && result.site_title) displayName.value = result.site_title;
}
</script>

<template>
  <div class="create-form">
    <!-- 类型 + 身份 + 展示名称 -->
    <div class="field">
      <label class="f-label">类型</label>
      <select v-model="sourceType" class="f-select">
        <option value="rss">RSS</option>
      </select>
    </div>

    <div class="field">
      <label class="f-label">来源身份（URL / 账号）</label>
      <input class="f-input" v-model="sourceIdentity" placeholder="https://example.com/feed.xml" />
    </div>

    <div class="field">
      <label class="f-label">展示名称</label>
      <div class="f-row">
        <input class="f-input f-flex" v-model="displayName" placeholder="显示在页面上的名称" />
        <BaseButton size="sm" @click="showVerify = true">验证</BaseButton>
      </div>
    </div>

    <!-- 领域标签 -->
    <div class="field">
      <label class="f-label">领域标签</label>
      <div class="pill-row">
        <button v-for="t in DOMAIN_TAG_OPTIONS" :key="t" class="pill" :class="{ on: domainTags.includes(t) }" @click="toggleDomainTag(t)" type="button">{{ t }}</button>
      </div>
    </div>

    <!-- 来源角色 -->
    <div class="field">
      <label class="f-label">来源角色</label>
      <div class="pill-row">
        <button v-for="r in ROLE_OPTIONS" :key="r.value" class="pill" :class="{ on: sourceRole === r.value }" @click="sourceRole = r.value" type="button">{{ r.label }}</button>
      </div>
    </div>

    <!-- 关注级别 -->
    <div class="field">
      <label class="f-label">关注级别</label>
      <div class="pill-row">
        <button v-for="l in ATTENTION_OPTIONS" :key="l.value" class="pill" :class="{ on: attentionLevel === l.value }" @click="attentionLevel = l.value" type="button">{{ l.label }}</button>
      </div>
    </div>

    <!-- 内容主题 -->
    <div class="field">
      <label class="f-label">内容主题（可选）</label>
      <input class="f-input" placeholder="输入后回车添加" @keydown.enter="(e) => { const v = (e.target as HTMLInputElement).value.trim(); if (v && !contentTopics.includes(v)) contentTopics.push(v); (e.target as HTMLInputElement).value = ''; }" />
      <div v-if="contentTopics.length > 0" class="tag-row">
        <span v-for="t in contentTopics" :key="t" class="tag">
          {{ t }}<button class="tag-x" @click="contentTopics = contentTopics.filter(x => x !== t)" type="button">&times;</button>
        </span>
      </div>
    </div>

    <!-- 备注 -->
    <div class="field">
      <label class="f-label">备注（可选）</label>
      <textarea class="f-textarea" v-model="notes" placeholder="关于该来源的备注…" rows="2" />
    </div>

    <!-- 目标提示 -->
    <div v-if="entryPoint === 'space_management'" class="target-hint">
      创建后将自动添加到{{ targetChannelId ? '当前频道' : '空间根节点' }}
    </div>

    <!-- 操作 -->
    <div class="form-footer">
      <BaseButton :disabled="submitting" @click="emit('cancel')">取消</BaseButton>
      <BaseButton variant="primary" :disabled="submitting" @click="doSubmit">
        {{ submitting ? '创建中…' : '创建信息源' }}
      </BaseButton>
    </div>

    <SourceVerifyDialog
      v-if="showVerify" :sourceType="sourceType" :sourceIdentity="sourceIdentity"
      @close="showVerify = false" @verified="onVerified"
    />
  </div>
</template>

<style scoped>
.create-form { display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 5px; }
.f-label { font-size: 11px; font-weight: 700; color: var(--text-muted); }
.f-input {
  padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 13px; font-family: inherit; background: var(--card); color: var(--text);
  outline: none; transition: 0.15s;
}
.f-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(52,152,219,0.08); }
.f-flex { flex: 1; }
.f-select {
  padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 13px; font-family: inherit; background: var(--card); max-width: 140px;
}
.f-textarea {
  padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 13px; font-family: inherit; resize: vertical; outline: none;
}
.f-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(52,152,219,0.08); }
.f-row { display: flex; gap: 8px; align-items: center; }

/* Pills */
.pill-row { display: flex; gap: 6px; flex-wrap: wrap; }
.pill {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
  border: 1px solid var(--border); background: var(--card); color: var(--text-secondary);
  cursor: pointer; font-family: inherit; transition: 0.15s;
}
.pill:hover { border-color: var(--accent); color: var(--accent); }
.pill.on { background: var(--accent); color: #FFF; border-color: var(--accent); }

/* Tags */
.tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: var(--accent-light); color: var(--accent);
}
.tag-x { border: none; background: none; color: var(--accent); cursor: pointer; font-size: 14px; padding: 0; line-height: 1; }

.target-hint {
  padding: 8px 12px; background: var(--accent-light); border-radius: 8px;
  font-size: 12px; color: var(--accent); font-weight: 600;
}

.form-footer { display: flex; gap: 8px; justify-content: flex-end; padding-top: 6px; border-top: 1px solid var(--border-light); }
</style>
