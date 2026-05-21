<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <RouterLink to="/news" class="brand-link">🐂 牛马程小报</RouterLink>
        </div>
        <nav class="nav">
          <RouterLink to="/news" class="nav-link" active-class="nav-link--active">浏览</RouterLink>
          <RouterLink to="/admin" class="nav-link" active-class="nav-link--active">管理</RouterLink>
        </nav>
      </div>
    </header>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; background: var(--bg-page); }
.topbar {
  position: sticky; top: 0; z-index: 20;
  background: var(--card); border-bottom: 1px solid var(--border);
}
.topbar-inner {
  max-width: 1100px; margin: 0 auto;
  display: flex; gap: 16px; align-items: center;
  justify-content: space-between; padding: 12px 20px;
}
.brand-link {
  font-weight: 900; font-size: 16px; letter-spacing: -0.3px;
  color: var(--text); text-decoration: none;
}
.nav { display: flex; gap: 8px; }
.nav-link {
  padding: 6px 14px; border-radius: 999px; font-size: 12px;
  font-weight: 600; color: var(--muted); text-decoration: none;
}
.nav-link:hover { background: #f1f5f9; color: var(--text); }
.nav-link--active { background: #eff6ff; color: var(--primary); }
.main-content { max-width: 1100px; margin: 0 auto; padding: 16px 20px 80px; }
</style>
