<script setup lang="ts">
import ToastContainer from "@/components/ToastContainer.vue";
import ModalContainer from "@/components/ModalContainer.vue";
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
  max-width: 960px; margin: 0 auto;
  display: flex; gap: 16px; align-items: center;
  justify-content: space-between; padding: 0 24px; height: 52px;
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
}
.nav-link:hover { color: var(--accent); }
.nav-link--active {
  color: var(--accent); background: var(--accent-light);
}
.main-content { max-width: 960px; margin: 0 auto; padding: 20px 24px 80px; }
</style>
