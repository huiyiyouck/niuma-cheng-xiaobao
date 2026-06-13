<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronRight, AlertTriangle, Trash2, Edit, Plus } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

// 抽屉/弹窗状态（编辑 / 删除 / 添加位置 抽屉与 AdminPage 共用，统一实现，见下方 TODO）
const editDrawer = ref(false);
const deleteDialog = ref(false);
const addPlacementDrawer = ref(false);

// Mock data（前端先行；接后端后改为 GET /v1/sources/:id）
const source = {
  id,
  displayName: "TechCrunch",
  type: "RSS",
  identity: "https://techcrunch.com/feed/",
  createdAt: "2024-03-15",
  availability: "normal" as "normal" | "needs-fix" | "source-error" | "removed",
  isRunning: true,
  lastFetch: "10分钟前",
  failureCount: 0,
  totalNews: 1247,
  strategy: "每30分钟",
  tags: ["科技", "创业"],
  role: "媒体",
  priority: "高",
  topic: "科技行业新闻与创业公司动态",
  notes: "主要关注美国科技行业新闻",
};

const recentNews = [
  { id: "1", title: "OpenAI 发布 GPT-5 预览版，性能提升显著", publishedAt: "2天前", score: 8.5 },
  { id: "2", title: "AI 安全研究新进展：对抗性攻击防御框架", publishedAt: "3天前", score: 7.8 },
  { id: "3", title: "Anthropic 发布 Claude 3.5 Sonnet 更新", publishedAt: "5天前", score: 8.2 },
  { id: "4", title: "Meta 开源新一代多模态模型", publishedAt: "6天前", score: 7.5 },
];

const placements = [
  { id: "1", space: "科技", channel: "全部", enabled: true },
  { id: "2", space: "科技", channel: "创业公司", enabled: true },
  { id: "3", space: "AI", channel: "行业资讯", enabled: false },
];

const placementStats = { total: 3, enabled: 2, disabled: 1, spaces: 2 };

const isError = computed(() => source.availability === "source-error");
const needsFix = computed(() => source.availability === "needs-fix");

const availabilityClass = computed(() =>
  source.availability === "normal"
    ? "bg-green-100 text-green-800"
    : source.availability === "needs-fix"
      ? "bg-orange-100 text-orange-800"
      : source.availability === "source-error"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800",
);
const availabilityLabel = computed(() =>
  source.availability === "normal"
    ? "正常"
    : source.availability === "needs-fix"
      ? "待修复"
      : source.availability === "source-error"
        ? "来源异常"
        : "已移除",
);

function handleConfirmDelete() {
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
                <button
                  @click="editDrawer = true"
                  class="px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-accent text-sm"
                >
                  <Edit class="h-4 w-4 inline mr-1" />
                  {{ needsFix || isError ? "修改身份并重新验证" : "编辑" }}
                </button>
                <button
                  @click="deleteDialog = true"
                  class="px-3 py-1.5 bg-destructive text-destructive-foreground rounded hover:opacity-90 text-sm"
                >
                  <Trash2 class="h-4 w-4 inline mr-1" />
                  删除
                </button>
              </div>
            </div>

            <div v-if="isError" class="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle class="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div class="text-sm text-yellow-800">
                <strong>注意：</strong>此信息源当前处于异常状态，可能无法正常抓取内容。请检查并更新来源身份。
              </div>
            </div>
          </div>

          <!-- Basic Info -->
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="mb-4">基本资料</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-muted-foreground mb-1">来源身份</div>
                <div class="font-mono text-sm break-all">{{ source.identity }}</div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground mb-1">展示名称</div>
                <div>{{ source.displayName }}</div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground mb-1">类型</div>
                <div>{{ source.type }}</div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground mb-1">创建时间</div>
                <div>{{ source.createdAt }}</div>
              </div>
            </div>
          </div>

          <!-- Tags & Notes -->
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="mb-4">标签与备注</h3>
            <div class="space-y-4">
              <div>
                <div class="text-sm text-muted-foreground mb-2">领域标签</div>
                <div class="flex gap-2">
                  <span
                    v-for="tag in source.tags"
                    :key="tag"
                    class="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="text-sm text-muted-foreground mb-1">来源角色</div>
                  <div>{{ source.role }}</div>
                </div>
                <div>
                  <div class="text-sm text-muted-foreground mb-1">关注级别</div>
                  <div>{{ source.priority }}</div>
                </div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground mb-1">内容主题</div>
                <div>{{ source.topic }}</div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground mb-1">备注</div>
                <div class="text-sm">{{ source.notes }}</div>
              </div>
            </div>
          </div>

          <!-- Fetch Status -->
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="mb-4">抓取状态</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-muted-foreground mb-1">最近抓取</div>
                <div>{{ source.lastFetch }}</div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground mb-1">连续失败次数</div>
                <div>{{ source.failureCount }}</div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground mb-1">历史新闻数</div>
                <div>{{ source.totalNews }}</div>
              </div>
              <div>
                <div class="text-sm text-muted-foreground mb-1">抓取策略</div>
                <div>{{ source.strategy }}</div>
              </div>
            </div>
          </div>

          <!-- Recent News Timeline -->
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="mb-4">最近一周新闻</h3>
            <div class="space-y-4">
              <div v-for="(news, idx) in recentNews" :key="news.id" class="flex gap-4">
                <div class="flex flex-col items-center">
                  <div class="w-2 h-2 rounded-full bg-primary" />
                  <div v-if="idx < recentNews.length - 1" class="w-0.5 h-full bg-border mt-2" />
                </div>
                <div class="flex-1 pb-4">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h4 class="font-medium text-sm">{{ news.title }}</h4>
                    <span class="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded shrink-0">{{ news.score }}</span>
                  </div>
                  <div class="text-xs text-muted-foreground">{{ news.publishedAt }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">
          <!-- Usage Stats -->
          <div class="bg-card border border-border rounded-lg p-6">
            <h3 class="mb-4">使用概况</h3>
            <div class="grid grid-cols-2 gap-3">
              <div class="text-center p-3 bg-muted/50 rounded">
                <div class="text-2xl font-semibold">{{ placementStats.total }}</div>
                <div class="text-xs text-muted-foreground mt-1">展示位置</div>
              </div>
              <div class="text-center p-3 bg-muted/50 rounded">
                <div class="text-2xl font-semibold">{{ placementStats.enabled }}</div>
                <div class="text-xs text-muted-foreground mt-1">启用</div>
              </div>
              <div class="text-center p-3 bg-muted/50 rounded">
                <div class="text-2xl font-semibold">{{ placementStats.disabled }}</div>
                <div class="text-xs text-muted-foreground mt-1">暂停</div>
              </div>
              <div class="text-center p-3 bg-muted/50 rounded">
                <div class="text-2xl font-semibold">{{ placementStats.spaces }}</div>
                <div class="text-xs text-muted-foreground mt-1">涉及空间</div>
              </div>
            </div>
          </div>

          <!-- Placements -->
          <div class="bg-card border border-border rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h3>展示位置</h3>
              <button
                @click="addPlacementDrawer = true"
                class="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Plus class="h-3 w-3" />
                添加位置
              </button>
            </div>
            <div class="space-y-3">
              <div v-for="placement in placements" :key="placement.id" class="border border-border rounded-lg p-3">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1">
                    <div class="font-medium text-sm">{{ placement.space }}</div>
                    <div class="text-sm text-muted-foreground">{{ placement.channel }}</div>
                  </div>
                  <span
                    :class="['px-2 py-0.5 text-xs rounded', placement.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800']"
                  >
                    {{ placement.enabled ? "启用" : "暂停" }}
                  </span>
                </div>
                <div class="flex gap-2">
                  <button class="text-xs text-muted-foreground hover:text-foreground">
                    {{ placement.enabled ? "暂停" : "恢复" }}
                  </button>
                  <span class="text-muted-foreground">·</span>
                  <button class="text-xs text-destructive hover:underline">移除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TODO(前端待续): 编辑/删除/添加位置 抽屉与 AdminPage 共用，做 AdminPage 时统一实现后接入 -->
    <!-- editDrawer / deleteDialog / addPlacementDrawer 状态已就绪 -->
  </div>
</template>
