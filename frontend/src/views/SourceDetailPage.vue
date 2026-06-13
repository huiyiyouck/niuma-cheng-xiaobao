<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronRight, AlertTriangle, Trash2, Edit, Plus } from "lucide-vue-next";
import { getSource, deleteSource } from "@/lib/api";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog.vue";

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const editDrawer = ref(false);
const deleteDialog = ref(false);
const addPlacementDrawer = ref(false);
const loading = ref(true);

// 显示模型（字段名沿用原型 template）
const source = ref<any>({
  displayName: "", type: "", identity: "", createdAt: "",
  availability: "normal", isRunning: false, lastFetch: "-", failureCount: 0,
  totalNews: 0, strategy: "-", tags: [], role: "-", priority: "-", topic: "-", notes: "-",
});
const placements = ref<Array<{ id: string; space: string; channel: string; enabled: boolean }>>([]);

const placementStats = computed(() => {
  const list = placements.value;
  return {
    total: list.length,
    enabled: list.filter((p) => p.enabled).length,
    disabled: list.filter((p) => !p.enabled).length,
    spaces: new Set(list.map((p) => p.space)).size,
  };
});

const isError = computed(() => source.value.availability === "source-error");
const needsFix = computed(() => source.value.availability === "needs-fix");
const availabilityClass = computed(() =>
  source.value.availability === "normal" ? "bg-green-100 text-green-800"
    : source.value.availability === "needs-fix" ? "bg-orange-100 text-orange-800"
      : source.value.availability === "source-error" ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800",
);
const availabilityLabel = computed(() =>
  source.value.availability === "normal" ? "正常"
    : source.value.availability === "needs-fix" ? "待修复"
      : source.value.availability === "source-error" ? "来源异常" : "已移除",
);

function fmtAgo(iso?: string): string {
  if (!iso) return "从未";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

onMounted(async () => {
  try {
    const s: any = await getSource(id);
    source.value = {
      displayName: s.display_name ?? s.source_identity ?? "未知来源",
      type: s.type ?? "-",
      identity: s.source_identity ?? "-",
      createdAt: s.created_at ? new Date(s.created_at).toLocaleDateString("zh-CN") : "-",
      availability: s.availability_status ?? "normal",
      isRunning: !s.paused,
      lastFetch: fmtAgo(s.last_fetched_at),
      failureCount: s.consecutive_failures ?? 0,
      totalNews: s.total_news_count ?? 0,
      strategy: s.fetch_config?.every_seconds ? `每 ${Math.round(s.fetch_config.every_seconds / 60)} 分钟` : "-",
      tags: Array.isArray(s.domain_tags) ? s.domain_tags : [],
      role: s.source_role ?? "-",
      priority: s.attention_level ?? "-",
      topic: Array.isArray(s.content_topics) && s.content_topics.length
        ? s.content_topics.join("、")
        : (typeof s.content_topics === "string" && s.content_topics ? s.content_topics : "-"),
      notes: s.notes ?? "-",
    };
    placements.value = (s.display_positions ?? []).map((p: any) => ({
      id: p.id, space: p.space_name ?? "-", channel: p.channel_name ?? "全部", enabled: !!p.enabled,
    }));
  } catch { /* 保持占位 */ } finally {
    loading.value = false;
  }
});

async function handleConfirmDelete() {
  try {
    await deleteSource(id);
  } catch { /* ignore */ }
  deleteDialog.value = false;
  router.push("/admin?tab=source-library");
}
</script>

<template>
  <div class="h-full overflow-auto">
    <div class="max-w-7xl mx-auto p-6">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <RouterLink to="/admin?tab=source-library" class="hover:text-foreground">管理</RouterLink>
        <ChevronRight class="h-4 w-4" />
        <RouterLink to="/admin?tab=source-library" class="hover:text-foreground">信息源库</RouterLink>
        <ChevronRight class="h-4 w-4" />
        <span class="text-foreground">{{ source.displayName }}</span>
      </div>

      <div class="grid grid-cols-3 gap-6">
        <!-- Left Column -->
        <div class="col-span-2 space-y-6">
          <!-- Header -->
          <div class="bg-card border border-border rounded-lg p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <h1>{{ source.displayName }}</h1>
                <span class="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">{{ source.type }}</span>
                <span :class="['px-2 py-0.5 text-xs rounded', availabilityClass]">{{ availabilityLabel }}</span>
                <div class="flex items-center gap-1.5">
                  <div :class="['h-2 w-2 rounded-full', source.isRunning ? 'bg-green-500' : 'bg-gray-400']" />
                  <span class="text-sm text-muted-foreground">{{ source.isRunning ? "抓取中" : "已停止" }}</span>
                </div>
              </div>
              <div class="flex gap-2">
                <button @click="editDrawer = true" class="px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-accent text-sm">
                  <Edit class="h-4 w-4 inline mr-1" />{{ needsFix || isError ? "修改身份并重新验证" : "编辑" }}
                </button>
                <button @click="deleteDialog = true" class="px-3 py-1.5 bg-destructive text-destructive-foreground rounded hover:opacity-90 text-sm">
                  <Trash2 class="h-4 w-4 inline mr-1" />删除
                </button>
              </div>
            </div>
            <div v-if="isError" class="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle class="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div class="text-sm text-yellow-800"><strong>注意：</strong>此信息源当前处于异常状态，可能无法正常抓取内容。请检查并更新来源身份。</div>
            </div>
          </div>

          <!-- Basic Info -->
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="mb-4">基本资料</h3>
            <div class="grid grid-cols-2 gap-4">
              <div><div class="text-sm text-muted-foreground mb-1">来源身份</div><div class="font-mono text-sm break-all">{{ source.identity }}</div></div>
              <div><div class="text-sm text-muted-foreground mb-1">展示名称</div><div>{{ source.displayName }}</div></div>
              <div><div class="text-sm text-muted-foreground mb-1">类型</div><div>{{ source.type }}</div></div>
              <div><div class="text-sm text-muted-foreground mb-1">创建时间</div><div>{{ source.createdAt }}</div></div>
            </div>
          </div>

          <!-- Tags & Notes -->
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="mb-4">标签与备注</h3>
            <div class="space-y-4">
              <div>
                <div class="text-sm text-muted-foreground mb-2">领域标签</div>
                <div class="flex gap-2 flex-wrap">
                  <span v-for="tag in source.tags" :key="tag" class="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm">{{ tag }}</span>
                  <span v-if="!source.tags.length" class="text-sm text-muted-foreground">无</span>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div><div class="text-sm text-muted-foreground mb-1">来源角色</div><div>{{ source.role }}</div></div>
                <div><div class="text-sm text-muted-foreground mb-1">关注级别</div><div>{{ source.priority }}</div></div>
              </div>
              <div><div class="text-sm text-muted-foreground mb-1">内容主题</div><div>{{ source.topic }}</div></div>
              <div><div class="text-sm text-muted-foreground mb-1">备注</div><div class="text-sm">{{ source.notes }}</div></div>
            </div>
          </div>

          <!-- Fetch Status -->
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="mb-4">抓取状态</h3>
            <div class="grid grid-cols-2 gap-4">
              <div><div class="text-sm text-muted-foreground mb-1">最近抓取</div><div>{{ source.lastFetch }}</div></div>
              <div><div class="text-sm text-muted-foreground mb-1">连续失败次数</div><div>{{ source.failureCount }}</div></div>
              <div><div class="text-sm text-muted-foreground mb-1">历史新闻数</div><div>{{ source.totalNews }}</div></div>
              <div><div class="text-sm text-muted-foreground mb-1">抓取策略</div><div>{{ source.strategy }}</div></div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">
          <!-- Usage Stats -->
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="mb-4">使用概况</h3>
            <div class="grid grid-cols-2 gap-3">
              <div class="text-center p-3 bg-muted/50 rounded"><div class="text-2xl font-semibold">{{ placementStats.total }}</div><div class="text-xs text-muted-foreground mt-1">展示位置</div></div>
              <div class="text-center p-3 bg-muted/50 rounded"><div class="text-2xl font-semibold">{{ placementStats.enabled }}</div><div class="text-xs text-muted-foreground mt-1">启用</div></div>
              <div class="text-center p-3 bg-muted/50 rounded"><div class="text-2xl font-semibold">{{ placementStats.disabled }}</div><div class="text-xs text-muted-foreground mt-1">暂停</div></div>
              <div class="text-center p-3 bg-muted/50 rounded"><div class="text-2xl font-semibold">{{ placementStats.spaces }}</div><div class="text-xs text-muted-foreground mt-1">涉及空间</div></div>
            </div>
          </div>

          <!-- Placements -->
          <div class="bg-card border border-border rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h3>展示位置</h3>
              <button @click="addPlacementDrawer = true" class="text-sm text-primary hover:underline flex items-center gap-1"><Plus class="h-3 w-3" />添加位置</button>
            </div>
            <div class="space-y-3">
              <div v-if="!placements.length" class="text-sm text-muted-foreground text-center py-4">暂无展示位置</div>
              <div v-for="placement in placements" :key="placement.id" class="border border-border rounded-lg p-3">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1">
                    <div class="font-medium text-sm">{{ placement.space }}</div>
                    <div class="text-sm text-muted-foreground">{{ placement.channel }}</div>
                  </div>
                  <span :class="['px-2 py-0.5 text-xs rounded', placement.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800']">{{ placement.enabled ? "启用" : "暂停" }}</span>
                </div>
                <div class="flex gap-2">
                  <button class="text-xs text-muted-foreground hover:text-foreground">{{ placement.enabled ? "暂停" : "恢复" }}</button>
                  <span class="text-muted-foreground">·</span>
                  <button class="text-xs text-destructive hover:underline">移除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认（接真实 deleteSource）；编辑/添加位置抽屉待精修 -->
    <DeleteConfirmDialog
      :open="deleteDialog"
      :data="{ type: 'source', name: source.displayName, placementCount: placements.length, newsCount: source.totalNews }"
      @close="deleteDialog = false"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
