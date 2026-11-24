<script setup lang="ts">
defineProps<{ title: string; description: string }>();
</script>

<template>
  <main id="main-content" class="story tool-page" tabindex="-1">
    <header class="tool-heading">
      <h1 tabindex="-1">{{ title }}</h1>
      <p>{{ description }}</p>
    </header>
    <slot />
  </main>
</template>

<style scoped>
.tool-page {
  min-width: 0;
  padding-block: clamp(36px, 5vw, 64px) clamp(64px, 8vw, 104px);
}
.tool-heading {
  margin-bottom: 32px;
}
.tool-heading h1 {
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1.15;
  letter-spacing: -0.045em;
  font-weight: 500;
}
.tool-heading p {
  margin: 12px 0 0;
  font-size: 16px;
  line-height: 1.7;
  color: var(--ui-fg-muted);
}
</style>
