<script setup lang="ts">
import { ref } from "vue";
import type { ChannelSourceWithSource, Alert, UUID } from "@/lib/types";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
import { requestJson } from "@/lib/http";

const props = defineProps<{
  binding: ChannelSourceWithSource;
  alerts: Alert[];
  editing: boolean;
}>();

const emit = defineEmits<{
  edit: [];
  cancel: [];
  saved: [];
  refresh: [];
}>();

const toast = useToast();
const modal = useModal();

const editSubChannelId = ref(props.binding.channel_source.sub_channel_id);
const editFetchInterval = ref((props.binding.channel_source.fetch_policy as any)?.interval_seconds || 600);
const editMaxItems = ref((props.binding.channel_source.fetch_policy as any)?.max_items || 20);
const editEnabled = ref(props.binding.channel_source.enabled);

const source = props.binding.source;
const cs = props.binding.channel_source;

function typeBadgeClass(t: string) {
  if (t === "x_twitter") return "badge badge--twitter";
  if (t === "rss") return "badge badge--rss";
  return "badge badge--other";
}
function typeLabel(t: string) {
  const map: Record<string, string> = { x_twitter: "X/Twitter", rss: "RSS" };
  return map[t] || t || "Other";
}
function statusBadgeClass(s: string) {
  if (s === "active" || s === "running") return "badge badge--active";
  if (s === "paused") return "badge badge--paused";
  if (s === "error") return "badge badge--error";
  return "badge badge--muted";
}
function statusLabel(s: string) {
  const map: Record<string, string> = { active: "● 运行中", running: "● 运行中", paused: "⏸ 已暂停", error: "⚠ 错误" };
  return map[s] || "未验证";
}

async function onSave() {
  try {
    await requestJson(`/v1/channel-sources/${cs.id}`, {
      method: "PUT",
      body: {
        sub_channel_id: editSubChannelId.value || null,
        fetch_policy: { interval_seconds: editFetchInterval.value, max_items: editMaxItems.value },
        enabled: editEnabled.value,
      },
    });
    toast.success("已保存");
    emit("saved");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function onDelete() {
  const ok = await modal.confirm(
    "删除信息源",
    `确定删除 <strong>${source.display_name}</strong> 吗？关联的抓取数据也将被清除，此操作不可撤销。`,
    { confirmText: "确认删除", danger: true },
  );
  if (!ok) return;
  try {
    await requestJson(`/v1/sources/${source.id}`, { method: "DELETE" });
    toast.success("已删除");
    emit("refresh");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function onUnbind() {
  const ok = await modal.confirm("解除绑定", `确定解除 <strong>${source.display_name}</strong> 的绑定？Source 本身将保留。`, { danger: true });
  if (!ok) return;
  try {
    await requestJson(`/v1/channel-sources/${cs.id}`, { method: "DELETE" });
    toast.success("已解绑");
    emit("refresh");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

async function updateAlertStatus(alertId: UUID, status: string) {
  try {
    await requestJson(`/v1/alerts/${alertId}`, { method: "PATCH", body: { status } });
    emit("refresh");
  } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
}

const cardAlerts = props.alerts.slice(0, 3);
</script>

<template>
  <div class="scard" :class="{ 'scard--editing': editing, 'scard--alert': cardAlerts.length > 0 }">
    <!-- 第 1 行：名称 + 类型 + 状态 -->
    <div class="scard-row1">
      <template v-if="editing">
        <input class="input" v-model="source.display_name" style="flex:1;min-width:0" />
      </template>
      <template v-else>
        <span class="scard-name">{{ source.display_name }}</span>
      </template>
      <span :class="typeBadgeClass(source.type)">{{ typeLabel(source.type) }}</span>
      <span :class="statusBadgeClass(source.status)">{{ statusLabel(source.status) }}</span>
    </div>

    <!-- 第 2 行：子频道 + 抓取参数 -->
    <div class="scard-row2">
      <template v-if="editing">
        <div class="edit-grid">
          <label>抓取间隔(秒) <input class="input" type="number" v-model.number="editFetchInterval" min="60" /></label>
          <label>最大条数 <input class="input" type="number" v-model.number="editMaxItems" min="1" max="100" /></label>
          <label>启用 <input type="checkbox" v-model="editEnabled" /></label>
        </div>
      </template>
      <template v-else>
        <span v-if="cs.sub_channel_id">子频道归属</span>
        <span>抓取间隔 {{ (cs.fetch_policy as any)?.interval_seconds || 600 }}s</span>
        <span>· 最多 {{ (cs.fetch_policy as any)?.max_items || 20 }} 条</span>
      </template>
    </div>

    <!-- 第 3 行：抓取状态 + 操作 -->
    <div class="scard-row3">
      <template v-if="!editing">
        <span>最后抓取: —</span>
        <span>状态: {{ source.status }}</span>
      </template>
      <div class="scard-actions">
        <template v-if="editing">
          <button class="btn-sm primary" @click="onSave">保存</button>
          <button class="btn-sm" @click="$emit('cancel')">取消</button>
        </template>
        <template v-else>
          <button class="btn-sm" @click="$emit('edit')">编辑</button>
          <button class="btn-sm" style="color:var(--danger)" @click="onDelete">删除</button>
          <button class="btn-sm" @click="onUnbind">解绑</button>
        </template>
      </div>
    </div>

    <!-- 告警内联条 -->
    <div v-if="cardAlerts.length > 0" class="scard-alerts">
      <div v-for="a in cardAlerts" :key="a.id" class="alert-line">
        <span class="alert-status" :class="'alert-status--' + a.status">{{ a.status === 'active' ? '● 未处理' : a.status === 'acknowledged' ? '● 已确认' : '● 已解决' }}</span>
        <span class="alert-msg">{{ a.message }}</span>
        <template v-if="a.status === 'active'">
          <button class="btn-xs" @click="updateAlertStatus(a.id, 'acknowledged')">标记已确认</button>
        </template>
        <template v-if="a.status === 'active' || a.status === 'acknowledged'">
          <button class="btn-xs" style="color:var(--text-muted)" @click="updateAlertStatus(a.id, 'resolved')">标记已解决</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scard {
  border: 1px solid var(--border-light); border-radius: 12px; padding: 16px 20px;
  background: var(--card); display: flex; flex-direction: column; gap: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.scard:hover { border-color: #CBD5E1; box-shadow: var(--shadow-soft); }
.scard--alert { border-left: 3px solid var(--warning); }
.scard--editing { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(52,152,219,0.08); }
.scard-row1 { display: flex; gap: 10px; align-items: center; }
.scard-name { font-size: 14px; font-weight: 700; color: var(--text); }
.scard-row2 { font-size: 11px; color: var(--text-secondary); }
.scard-row3 { display: flex; align-items: center; font-size: 11px; color: var(--text-muted); }
.scard-actions { margin-left: auto; display: flex; gap: 6px; }

.badge {
  display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700;
}
.badge--twitter { background: var(--accent-light); color: var(--accent); }
.badge--rss { background: var(--warning-light); color: var(--warning); }
.badge--other { background: #F1F5F9; color: #64748b; }
.badge--active { background: var(--success-light); color: var(--success); }
.badge--paused { background: #F1F5F9; color: var(--text-muted); }
.badge--error { background: var(--danger-light); color: var(--danger); }
.badge--muted { background: #F1F5F9; color: var(--text-muted); }

.edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.edit-grid label { font-size: 11px; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px; }
.edit-grid .input { padding: 6px 10px; font-size: 12px; border-radius: 8px; border: 1px solid var(--border); }

.scard-alerts { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
.alert-line {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px;
  background: var(--warning-light); border-radius: 8px; font-size: 11px;
}
.alert-status { font-size: 10px; font-weight: 700; }
.alert-status--active { color: var(--danger); }
.alert-status--acknowledged { color: var(--warning); }
.alert-status--resolved { color: var(--text-muted); }
.alert-msg { flex: 1; color: #92400e; }
.btn-xs { padding: 2px 8px; font-size: 10px; border-radius: 4px; border: none; background: none; cursor: pointer; color: var(--warning); }
.btn-xs:hover { text-decoration: underline; }
.btn-sm {
  padding: 4px 10px; font-size: 11px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--card); cursor: pointer; color: var(--text-secondary);
}
.btn-sm:hover { background: #F4F5F7; }
.btn-sm.primary { background: rgba(52,152,219,0.08); border-color: rgba(52,152,219,0.25); color: var(--accent); }
</style>
