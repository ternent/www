<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  value: unknown;
  path: string[];
  label: string;
  selected: string[];
  depth: number;
}>();
const emit = defineEmits<{ select: [path: string[]] }>();
const open = ref(props.depth === 0);
const limit = ref(50);
const container = computed(() => props.value !== null && typeof props.value === "object");
const keys = computed(() => (container.value ? Object.keys(props.value as object) : []));
const selected = computed(() => JSON.stringify(props.selected) === JSON.stringify(props.path));
const preview = computed(() => {
  if (Array.isArray(props.value)) return `[${keys.value.length}]`;
  if (container.value) return `{${keys.value.length}}`;
  const text = typeof props.value === "string" ? JSON.stringify(props.value) : String(props.value);
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
});
const child = (key: string) => (props.value as Record<string, unknown>)[key];
</script>

<template>
  <details
    v-if="container"
    class="json-branch"
    :open="open"
    @toggle="open = ($event.target as HTMLDetailsElement).open"
  >
    <summary>
      <button
        class="json-select"
        :class="{ selected }"
        :aria-pressed="selected"
        @click.stop.prevent="emit('select', path)"
      >
        <span>{{ label }}</span><small>{{ preview }}</small>
      </button>
    </summary>
    <div v-if="open" class="json-children">
      <template v-if="depth < 64">
        <JsonNode
          v-for="key in keys.slice(0, limit)"
          :key="key"
          :value="child(key)"
          :path="[...path, key]"
          :label="key"
          :selected="props.selected"
          :depth="depth + 1"
          @select="emit('select', $event)"
        />
        <button v-if="keys.length > limit" class="json-more" @click="limit += 50">
          Show next {{ Math.min(50, keys.length - limit) }} of {{ keys.length }} items
        </button>
      </template>
      <p v-else class="tree-limit">Open Source to inspect deeper values.</p>
    </div>
  </details>
  <button
    v-else
    class="json-select json-leaf"
    :class="{ selected }"
    :aria-pressed="selected"
    @click="emit('select', path)"
  >
    <span>{{ label }}</span><small :class="typeof value">{{ preview }}</small>
  </button>
</template>
