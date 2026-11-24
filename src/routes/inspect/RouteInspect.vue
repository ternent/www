<script setup lang="ts">
import InspectorApp from "@/modules/inspector/InspectorApp.vue";
</script>

<template>
  <main id="main-content" class="story inspector-page" tabindex="-1">
    <header class="inspector-heading">
      <h1 tabindex="-1">Document inspector</h1>
      <p>Explore JSON and verify signed history. Your file stays in your browser.</p>
    </header>
    <InspectorApp />
  </main>
</template>

<style scoped>
.inspector-page {
  padding-block: clamp(36px, 5vw, 64px) clamp(64px, 8vw, 104px);
}
.inspector-heading {
  margin-bottom: 32px;
}
.inspector-heading h1 {
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1.15;
  letter-spacing: -0.045em;
  font-weight: 500;
}
.inspector-heading p {
  margin: 12px 0 0;
  font-size: 16px;
  line-height: 1.7;
  color: var(--ui-fg-muted);
}
</style>
