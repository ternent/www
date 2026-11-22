<script setup lang="ts">
import Logo from "@/components/BrandLogo.vue";
import ThemeModeToggle from "@/modules/ui/components/ThemeModeToggle.vue";
defineProps<{ active: "examples" | "inspect" }>();
</script>
<template>
  <header class="workbench-header">
    <nav class="workbench-breadcrumb" aria-label="Tools">
      <RouterLink class="workbench-brand" to="/" aria-label="ternent.dev home">
        <Logo aria-hidden="true" />
      </RouterLink>
      <span class="breadcrumb-divider" aria-hidden="true">/</span>
      <RouterLink
        class="workbench-wordmark"
        to="/examples"
        :aria-current="active === 'examples' ? 'page' : undefined"
        >Examples</RouterLink
      >
      <RouterLink
        class="workbench-wordmark"
        to="/inspect"
        :aria-current="active === 'inspect' ? 'page' : undefined"
        >Inspector</RouterLink
      >
      <span class="workbench-preview">Alpha</span>
    </nav>
    <div class="workbench-header-actions">
      <RouterLink to="/">About Ternent <span aria-hidden="true">↗</span></RouterLink>
      <a
        :href="`https://github.com/ternent/www/tree/main/src/modules/${active === 'inspect' ? 'inspector' : 'examples'}`"
        aria-label="Source on GitHub"
        >Source <span aria-hidden="true">↗</span></a
      >
      <ThemeModeToggle />
    </div>
  </header>
</template>
<style>
.workbench-header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
  position: relative;
  z-index: 30;
}
.workbench-breadcrumb,
.workbench-header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}
.workbench-header a {
  text-decoration: none;
}
.workbench-brand {
  display: flex;
  align-items: center;
}
.workbench-brand svg {
  width: 32px;
  height: 32px;
}
.breadcrumb-divider {
  color: var(--ui-border);
  font-size: 24px;
  font-weight: 300;
}
.workbench-wordmark {
  font-size: 16px;
  font-weight: 550;
  letter-spacing: -0.3px;
}
.workbench-preview {
  border: 1px solid var(--ui-border);
  border-radius: 5px;
  padding: 2px 6px;
  color: var(--ui-fg-muted);
  font-size: 11px;
}
.workbench-header-actions {
  gap: 24px;
  color: var(--ui-fg-muted);
  font-size: 13px;
}
.workbench-wordmark[aria-current="page"] {
  color: var(--ui-fg);
}
.workbench-wordmark:not([aria-current="page"]) {
  color: var(--ui-fg-muted);
}
.workbench-header-actions a:hover {
  color: var(--ui-fg);
}
.workbench-header .theme-mode-toggle {
  min-width: 34px;
  min-height: 34px;
}
@media (max-width: 650px) {
  .workbench-header {
    height: 58px;
    padding: 0 16px;
    gap: 12px;
  }
  .workbench-breadcrumb {
    gap: 12px;
  }
  .workbench-preview,
  .breadcrumb-divider {
    display: none;
  }
  .workbench-brand svg {
    width: 26px;
    height: 26px;
  }
  .workbench-wordmark {
    font-size: 13px;
  }
  .workbench-header-actions {
    gap: 12px;
  }
  .workbench-header-actions > a {
    display: none;
  }
}
</style>
