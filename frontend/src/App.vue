<script setup lang="ts">
import { onMounted, ref } from "vue";
import ToastContainer from "@/components/ToastContainer.vue";
import ModalContainer from "@/components/ModalContainer.vue";
import { getUnprocessedAlertCount } from "@/lib/api";

// v0.5: 导航项从 3 项扩展为 4 项：浏览 | 管理 | 系统日志 | 告警
// AlertNavBadge：显示未处理告警计数

const unprocessedCount = ref(0);

async function loadAlertCount() {
  try {
    const res = await getUnprocessedAlertCount();
    unprocessedCount.value = res.count;
  } catch { /* 静默失败 */ }
}

onMounted(() => {
  loadAlertCount();
  // 每 60s 轮询更新告警计数
  setInterval(loadAlertCount, 60000);
});
</script>

<template>
  <ToastContainer />
  <ModalContainer />
  <div class="shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <RouterLink to="/news" class="brand-link">🐂 牛马程小报</RouterLink>
        </div>
        <nav class="nav">
          <RouterLink to="/news" class="nav-link" activeClass="nav-link--active">浏览</RouterLink>
          <RouterLink to="/admin" class="nav-link" activeClass="nav-link--active">管理</RouterLink>
          <RouterLink to="/logs" class="nav-link" activeClass="nav-link--active">系统日志</RouterLink>
          <RouterLink to="/alerts" class="nav-link nav-link--alert" activeClass="nav-link--active">
            告警
            <span v-if="unprocessedCount > 0" class="alert-badge">{{ unprocessedCount }}</span>
          </RouterLink>
        </nav>
      </div>
    </header>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; background: var(--bg); }
.topbar {
  position: sticky; top: 0; z-index: 20;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.topbar-inner {
  width: 100%;
  max-width: none;
  margin: 0;
  display: flex; gap: 16px; align-items: center;
  justify-content: space-between; padding: 0 32px; height: 52px;
}
.brand-link {
  font-weight: 800; font-size: 16px; letter-spacing: -0.3px;
  color: var(--text); text-decoration: none;
}
.nav { display: flex; gap: 4px; }
.nav-link {
  padding: 6px 12px; font-size: 13px; font-weight: 600;
  color: var(--text-muted); text-decoration: none;
  border-radius: 8px; transition: color 0.15s, background 0.15s;
  display: flex; align-items: center; gap: 6px;
  position: relative;
}
.nav-link:hover { color: var(--accent); }
.nav-link--active {
  color: var(--accent); background: var(--accent-light);
}

/* v0.5: 告警角标 */
.alert-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--danger);
  color: #FFF;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

.main-content {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 20px 32px 80px;
}

/* v0.5: 响应式 */
@media (max-width: 1120px) {
  .topbar-inner { padding: 0 20px; }
  .main-content { padding: 16px 20px 80px; }
}
@media (max-width: 480px) {
  .topbar-inner { padding: 0 12px; }
  .main-content { padding: 12px 12px 80px; }
  .nav-link { padding: 5px 8px; font-size: 11px; }
  .brand-link { font-size: 14px; }
}
</style>
