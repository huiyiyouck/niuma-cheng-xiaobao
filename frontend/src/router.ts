import { createRouter, createWebHistory } from "vue-router";

const NewsPage = () => import("@/views/NewsPage.vue");
const AdminPage = () => import("@/views/AdminPage.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/news" },
    { path: "/news", component: NewsPage },
    { path: "/admin", component: AdminPage },
  ],
});

