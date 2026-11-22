<script setup lang="ts">
import { computed, ref, watch } from "vue";
import JsonNode from "./JsonNode.vue";
import { format } from "./types";

const props = defineProps<{ value: unknown }>();
const selection = ref<string[]>([]);
watch(
  () => props.value,
  () => {
    selection.value = [];
  },
);
const selected = computed(() => {
  let current = props.value;
  for (const key of selection.value) {
    if (!current || typeof current !== "object" || !Object.hasOwn(current, key)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
});
const pointer = computed(() =>
  selection.value.length
    ? "/" + selection.value.map((key) => key.replaceAll("~", "~0").replaceAll("/", "~1")).join("/")
    : "(root)",
);
</script>

<template>
  <section class="json-browser" aria-label="JSON browser">
    <div class="json-tree">
      <div class="section-heading">
        <h2>Document structure</h2>
        <span class="small muted">Select a value</span>
      </div>
      <JsonNode
        :value="value"
        :path="[]"
        label="$"
        :selected="selection"
        :depth="0"
        @select="selection = $event"
      />
    </div>
    <div class="json-value">
      <div class="section-heading">
        <h2>Selected value</h2>
        <span class="json-pointer mono">{{ pointer }}</span>
      </div>
      <pre class="code-block" tabindex="0">{{ format(selected).slice(0, 50_000) }}</pre>
      <p class="small muted">
        Value previews are limited to 50,000 characters. Parsed view uses JavaScript numbers and the
        last duplicate key. Source preserves your exact input.
      </p>
    </div>
  </section>
</template>
