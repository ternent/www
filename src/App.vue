<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Logo } from "@ternent/ui/patterns";
import { Button, Popover } from "@ternent/ui/primitives";
import ThemeModeToggle from "@/modules/ui/components/ThemeModeToggle.vue";
import { useThemeMode } from "@/modules/ui";

type HeaderTheme = "aurora" | "concord" | "ledger" | "proof" | "armour";

const route = useRoute();
const { mode } = useThemeMode();
const architectureLinks = [
  { label: "Concord", to: "/concord", theme: "concord" as HeaderTheme },
  { label: "Ledger", to: "/ledger", theme: "ledger" as HeaderTheme },
  { label: "Seal", to: "/seal", theme: "proof" as HeaderTheme },
  { label: "Armour", to: "/armour", theme: "armour" as HeaderTheme },
  { label: "Identity", to: "/settings/identity", theme: "aurora" as HeaderTheme },
];

const defaultHeaderItem = { label: "Explore architecture", theme: "aurora" as HeaderTheme };

const activeHeaderItem = computed(() => {
  const match = architectureLinks.find(
    (link) => route.path === link.to || route.path.startsWith(`${link.to}/`),
  );
  if (match) return match;
  if (route.path === "/") return defaultHeaderItem;
  return defaultHeaderItem;
});

const activeHeaderTheme = computed(() => `${activeHeaderItem.value.theme}-${mode.value}`);
</script>
<template>
  <div class="min-h-screen">
    <div
      class="sticky top-0 z-50 h-16 w-full border-b border-[var(--ui-border)] bg-[var(--ui-bg)]/90 p-4 backdrop-blur"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between">
        <RouterLink to="/" class="flex items-end gap-3 no-underline">
          <Logo class="!size-8" />
        </RouterLink>

        <nav class="flex items-center gap-3 text-sm">
          <Popover placement="bottom-end">
            <template #trigger>
              <Button
                :data-theme="activeHeaderTheme"
                variant="secondary"
                size="sm"
                class="!border-[color:color-mix(in_srgb,var(--ui-primary)_34%,var(--ui-border))] !bg-[color:color-mix(in_srgb,var(--ui-primary)_14%,var(--ui-bg))] !text-[var(--ui-fg)]"
              >
                {{ activeHeaderItem.label }}
              </Button>
            </template>

            <div class="grid min-w-[12rem] gap-1">
              <RouterLink
                v-for="link in architectureLinks"
                :key="link.to"
                :to="link.to"
                class="rounded-md px-3 py-2 text-sm text-[var(--ui-fg)] no-underline hover:bg-[var(--ui-surface)]"
              >
                {{ link.label }}
              </RouterLink>
            </div>
          </Popover>
        </nav>
      </div>
    </div>

    <RouterView />

    <footer class="px-4 py-6 bg-[var(--ui-bg)]/90 backdrop-blur border-t border-[var(--ui-border)]">
      <div
        class="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-[var(--ui-fg-muted)] mx-auto max-w-6xl"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span>ternent.dev</span>
          <span class="opacity-60">•</span>
          <span>© 2026</span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ThemeModeToggle />
          <!-- <Button as="RouterLink" to="/concord" variant="plain-secondary" size="sm">Concord</Button>
          <Button as="RouterLink" to="/ledger" variant="plain-secondary" size="sm">Ledger</Button>
          <Button as="RouterLink" to="/seal" variant="plain-secondary" size="sm">Seal</Button>
          <Button as="RouterLink" to="/armour" variant="plain-secondary" size="sm">Armour</Button> -->
        </div>
      </div>
    </footer>
  </div>
</template>
