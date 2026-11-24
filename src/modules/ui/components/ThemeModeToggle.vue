<script setup lang="ts">
import { useThemeMode } from "@/modules/ui";
const { mode, toggleTheme } = useThemeMode();
</script>

<template>
  <button
    type="button"
    class="theme-mode-toggle w-10 h-10 p-2 inline-flex items-center justify-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-fg)] transition hover:bg-[var(--ui-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring)]"
    :aria-label="mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <svg
      aria-hidden="true"
      v-if="mode === 'light'"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <path
        d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
      />
    </svg>
    <svg
      aria-hidden="true"
      v-else
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>

<style scoped>
.theme-mode-toggle {
  width: 44px;
  height: 44px;
  padding: 10px;
  flex: 0 0 44px;
  border-radius: 50%;
}
.theme-mode-toggle svg {
  display: block;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
</style>
