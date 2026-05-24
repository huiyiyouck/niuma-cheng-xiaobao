<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <RouterLink to="/news" class="brand-link">🐂 牛马程小报</RouterLink>
        </div>
        <nav class="nav">
          <RouterLink to="/news" class="nav-link" activeClass="nav-link--active">浏览</RouterLink>
          <RouterLink to="/admin" class="nav-link" activeClass="nav-link--active">管理</RouterLink>
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
  background: #1a1a2e; border-bottom: none;
}
.topbar-inner {
  max-width: 1100px; margin: 0 auto;
  display: flex; gap: 16px; align-items: center;
  justify-content: space-between; padding: 12px 20px;
}
.brand-link {
  font-weight: 900; font-size: 16px; letter-spacing: -0.3px;
  color: #fff; text-decoration: none;
}
.nav { display: flex; gap: 12px; }
.nav-link {
  padding: 6px 0; font-size: 13px;
  font-weight: 600; color: rgba(255,255,255,0.65); text-decoration: none;
  border-bottom: 2px solid transparent; border-radius: 0;
  transition: color 0.15s, border-color 0.15s;
}
.nav-link:hover { color: rgba(255,255,255,0.9); }
.nav-link--active { color: #fff; border-bottom-color: #fff; }
.main-content { max-width: 1100px; margin: 0 auto; padding: 16px 20px 80px; }
</style>
