import { createRouter, createWebHistory } from "vue-router";

const NewsPage = () => import("@/views/NewsPage.vue");
const AdminPage = () => import("@/views/AdminPage.vue");
const MonitoringPage = () => import("@/views/MonitoringPage.vue");
const SourceDetailPage = () => import("@/views/SourceDetailPage.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/news" },
    { path: "/news", component: NewsPage },
    { path: "/admin", component: AdminPage },
    { path: "/monitoring", component: MonitoringPage },
    // 旧路由兼容跳转（v0.5 -> v0.6 监控页合并）
    { path: "/alerts", redirect: "/monitoring?tab=alerts" },
    { path: "/logs", redirect: "/monitoring?tab=logs" },
    { path: "/sources/:id", component: SourceDetailPage },
  ],
});
