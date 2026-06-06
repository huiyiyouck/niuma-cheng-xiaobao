import { createRouter, createWebHistory } from "vue-router";

const NewsPage = () => import("@/views/NewsPage.vue");
const AdminPage = () => import("@/views/AdminPage.vue");
const LogsPage = () => import("@/views/LogsPage.vue");
const AlertsPage = () => import("@/views/AlertsPage.vue");
const SourceDetailPage = () => import("@/views/SourceDetailPage.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/news" },
    { path: "/news", component: NewsPage },
    { path: "/admin", component: AdminPage },
    { path: "/logs", component: LogsPage },
    { path: "/alerts", component: AlertsPage },
    { path: "/sources/:id", component: SourceDetailPage },
  ],
});
