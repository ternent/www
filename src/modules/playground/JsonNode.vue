<script setup lang="ts">
import { computed } from "vue";
defineOptions({ name: "JsonNode" });
const props = defineProps<{ label: string; value: unknown; depth?: number }>();
const children = computed(() =>
  props.value !== null && typeof props.value === "object" ? Object.entries(props.value) : null,
);
</script>
<template>
  <details v-if="children" :open="(depth ?? 0) < 2" class="json-node">
    <summary>
      <span>{{ label }}</span>
      <small>{{
        Array.isArray(value) ? `[${children.length}]` : "object · " + children.length
      }}</small>
    </summary>
    <JsonNode
      v-for="[key, item] in children"
      :key="key"
      :label="key"
      :value="item"
      :depth="(depth ?? 0) + 1"
    />
  </details>
  <div v-else class="json-leaf">
    <span>{{ label }}</span
    ><code>{{ JSON.stringify(value) }}</code>
  </div>
</template>
