<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Newspaper, Activity } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import ToastContainer from "@/components/ToastContainer.vue";
import ModalContainer from "@/components/ModalContainer.vue";

const route = useRoute();

// 前端先行阶段：未处理告警数用 mock；接后端后改为 GET /v1/alerts/unread-count 轮询
const unhandledAlertsCount = 3;

const isActive = (path: string) => {
  if (path === "/news") {
    return route.path === "/" || route.path === "/news";
  }
  return route.path.startsWith(path);
};

const navLinkClass = (path: string, extra = "") =>
  cn(
    "px-4 py-2 rounded-md transition-colors",
    extra,
    isActive(path)
      ? "bg-secondary text-secondary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
</script>

<template>
  <ToastContainer />
  <ModalContainer />
  <div class="flex h-screen flex-col bg-background">
    <!-- Top Navigation -->
    <header class="border-b border-border bg-card">
      <div class="flex h-14 items-center px-6">
        <div class="flex items-center gap-2 mr-8">
          <Newspaper class="h-5 w-5" />
          <span class="font-medium">牛马程小报</span>
        </div>

        <nav class="flex gap-1">
          <RouterLink to="/news" :class="navLinkClass('/news')">浏览</RouterLink>
          <RouterLink to="/admin" :class="navLinkClass('/admin')">管理</RouterLink>
          <RouterLink to="/monitoring" :class="navLinkClass('/monitoring', 'relative')">
            <span class="flex items-center gap-2">
              <Activity class="h-4 w-4" />
              监控
              <span
                v-if="unhandledAlertsCount > 0"
                class="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center"
              >
                {{ unhandledAlertsCount }}
              </span>
            </span>
          </RouterLink>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <RouterView />
    </main>
  </div>
</template>
