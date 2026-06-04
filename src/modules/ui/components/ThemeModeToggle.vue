<script setup lang="ts">
import { shallowRef } from "vue";
import { useThemeMode } from "@/modules/ui";

const props = defineProps({
  size: {
    type: String,
    default: "md",
    validator: (value) => ["xs", "sm", "md", "lg"].includes(value),
  },
  showDropdown: {
    type: Boolean,
    default: false,
  },
});

const { mode } = useThemeMode();


function getSystemMode() {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "light";
}

const internalMode = shallowRef(getSystemMode());

function getDocumentThemeAttribute() {
  if (typeof document === "undefined") return "";
  return document.documentElement.getAttribute("data-theme") || "";
}

function getThemePrefix() {
  if (typeof document === "undefined") return "";

  const root = document.documentElement;
  if (root.dataset.themePrefix) return root.dataset.themePrefix;

  const currentTheme = getDocumentThemeAttribute();
  const match = currentTheme.match(/^(.*)-(light|dark)$/);
  return match?.[1] || "";
}

function getThemeStorageKey() {
  if (typeof document === "undefined") return "";
  return document.documentElement.dataset.themeStorageKey || "";
}

function getDocumentMode() {
  const currentTheme = getDocumentThemeAttribute();
  if (currentTheme.endsWith("-dark")) return "dark";
  if (currentTheme.endsWith("-light")) return "light";
  return getSystemMode();
}

internalMode.value = getDocumentMode();

function persistDocumentMode(nextMode) {
  const storageKey = getThemeStorageKey();
  if (!storageKey || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, nextMode);
  } catch {}
}

function applyDocumentMode(nextMode) {
  if (typeof document === "undefined") return;

  const prefix = getThemePrefix();
  if (prefix) {
    document.documentElement.setAttribute("data-theme", `${prefix}-${nextMode}`);
  }

  persistDocumentMode(nextMode);
  internalMode.value = nextMode;
}

function toggleMode() {
  mode.value = mode.value === "dark" ? "light" : "dark";
  applyDocumentMode(mode.value);
}


</script>

<template>
  <button
    type="button"
    class="w-10 h-10 p-2 inline-flex items-center justify-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-fg)] transition hover:bg-[var(--ui-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring)]"
    :aria-label="mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleMode"
  >
    <svg
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
