<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { onClickOutside } from "@vueuse/core";

const emit = defineEmits<{ navigate: [] }>();
const route = useRoute();
const disclosure = ref<HTMLDetailsElement | null>(null);
const tools = [
  { label: "Examples", path: "/examples" },
  { label: "Document inspector", path: "/inspect" },
];
const active = (path: string) => route.path === path || route.path.startsWith(`${path}/`);
const toolsActive = computed(() => tools.some((tool) => active(tool.path)));
function close(restoreFocus = false) {
  if (!disclosure.value) return;
  disclosure.value.open = false;
  if (restoreFocus) disclosure.value.querySelector("summary")?.focus();
}
function navigate() {
  close();
  emit("navigate");
}
function focusOut(event: FocusEvent) {
  if (!disclosure.value?.contains(event.relatedTarget as Node | null)) close();
}
watch(
  () => route.fullPath,
  () => close(),
);
onClickOutside(disclosure, () => close());
</script>

<template>
  <details
    ref="disclosure"
    class="header-tools"
    @keydown.esc.stop.prevent="close(true)"
    @focusout="focusOut"
  >
    <summary :class="{ active: toolsActive }">
      Tools
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </summary>
    <ul class="tool-links">
      <li v-for="tool in tools" :key="tool.path">
        <RouterLink
          :to="tool.path"
          :aria-current="active(tool.path) ? 'page' : undefined"
          @click="navigate"
        >
          {{ tool.label }}
        </RouterLink>
      </li>
    </ul>
  </details>
</template>

<style scoped>
.header-tools {
  position: relative;
}
summary {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding-block: 12px;
  list-style: none;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
}
summary::-webkit-details-marker {
  display: none;
}
summary.active,
summary:hover {
  color: var(--ui-secondary);
}
summary svg {
  width: 14px;
  height: 14px;
}
.header-tools[open] summary svg {
  transform: rotate(180deg);
}
.tool-links {
  position: absolute;
  top: calc(100% + 8px);
  right: -12px;
  z-index: 1;
  min-width: 220px;
  margin: 0;
  padding: 8px;
  list-style: none;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: var(--ui-bg);
  box-shadow: 0 8px 24px #00000012;
}
.tool-links a {
  display: flex;
  width: 100%;
  padding: 10px 12px;
  border-radius: 4px;
  white-space: nowrap;
}
.tool-links a:hover,
.tool-links a[aria-current] {
  background: var(--ui-surface);
  color: var(--ui-secondary);
}
.tool-links a[aria-current]::after {
  display: none;
}
summary:focus-visible,
.tool-links a:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 3px;
}
@media (max-width: 750px) {
  .header-tools {
    grid-column: 1 / -1;
  }
  summary {
    padding: 10px;
  }
  .tool-links {
    position: static;
    min-width: 0;
    padding: 0 8px 8px;
    border: 0;
    box-shadow: none;
  }
}
</style>
