<script setup lang="ts">
import { computed } from "vue";
import DemoIdentityDialog from "@/modules/demo-identity/components/DemoIdentityDialog.vue";
import { useDemoIdentityApi } from "@/modules/demo-identity";

const props = defineProps<{
  mode: "create" | "recover" | "login";
}>();

const demoIdentity = useDemoIdentityApi();
const activeIdentityLabel = computed(() => demoIdentity.activeIdentity.value?.label ?? "Identity");

async function lockIdentity(): Promise<void> {
  await demoIdentity.identity.lock();
}
</script>

<template>
  <main
    id="main-content"
    tabindex="-1"
    class="min-h-[calc(100vh-8rem)] bg-[var(--ui-bg)] px-4 py-10 text-[var(--ui-fg)]"
  >
    <section class="mx-auto flex w-full max-w-5xl flex-col gap-6" data-theme="aurora-light">
      <div class="space-y-2">
        <p class="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ui-primary)]">
          Identity demo
        </p>
        <h1 class="m-0 text-4xl font-semibold text-[var(--ui-fg)]">Local identity flow</h1>
        <p class="m-0 max-w-2xl text-base text-[var(--ui-fg-muted)]">
          Create, recover or unlock a signing identity locally. Private identity material is
          encrypted in this browser.
        </p>
      </div>

      <nav class="flex flex-wrap gap-2" aria-label="Identity demo routes">
        <RouterLink to="/demo/identity/create" class="button"> Create </RouterLink>
        <RouterLink to="/demo/identity/recover" class="button"> Recover </RouterLink>
        <RouterLink to="/demo/identity/login" class="button"> Login </RouterLink>
      </nav>

      <div v-if="demoIdentity.activeIdentity.value" class="identity-panel">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="m-0 text-sm text-[var(--ui-fg-muted)]">Active identity</p>
            <p class="m-0 text-lg font-semibold text-[var(--ui-fg)]">{{ activeIdentityLabel }}</p>
          </div>
          <button @click="lockIdentity" class="button" type="button">Lock identity</button>
        </div>
      </div>

      <DemoIdentityDialog :route-mode="props.mode" />
    </section>
  </main>
</template>
