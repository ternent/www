<script setup lang="ts">
import { computed } from "vue";
import DemoIdentityDialog from "@/modules/demo-identity/components/DemoIdentityDialog.vue";
import { useDemoIdentityApi } from "@/modules/demo-identity";
import { Button, Card } from "@ternent/ui/primitives";

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
  <main class="min-h-[calc(100vh-8rem)] bg-[var(--ui-bg)] px-4 py-10 text-[var(--ui-fg)]">
    <section class="mx-auto flex w-full max-w-5xl flex-col gap-6" data-theme="aurora-light">
      <div class="space-y-2">
        <p class="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ui-primary)]">
          Identity demo
        </p>
        <h1 class="m-0 text-4xl font-semibold text-[var(--ui-fg)]">Local identity flow</h1>
        <p class="m-0 max-w-2xl text-base text-[var(--ui-fg-muted)]">
          A route-mounted copy of the Solid app identity dialog for create, recover, and login
          flows.
        </p>
      </div>

      <nav class="flex flex-wrap gap-2" aria-label="Identity demo routes">
        <Button as="RouterLink" to="/demo/identity/create" variant="secondary" size="sm">
          Create
        </Button>
        <Button as="RouterLink" to="/demo/identity/recover" variant="secondary" size="sm">
          Recover
        </Button>
        <Button as="RouterLink" to="/demo/identity/login" variant="secondary" size="sm">
          Login
        </Button>
      </nav>

      <Card v-if="demoIdentity.activeIdentity.value" padding="md" variant="showcase">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="m-0 text-sm text-[var(--ui-fg-muted)]">Active identity</p>
            <p class="m-0 text-lg font-semibold text-[var(--ui-fg)]">{{ activeIdentityLabel }}</p>
          </div>
          <Button variant="tertiary" size="sm" @click="lockIdentity">Lock identity</Button>
        </div>
      </Card>

      <DemoIdentityDialog :route-mode="props.mode" />
    </section>
  </main>
</template>
