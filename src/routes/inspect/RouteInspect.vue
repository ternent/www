<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import ToolPage from "@/components/ToolPage.vue";
import InspectorApp from "@/modules/inspector/InspectorApp.vue";
const loadNotesInspection = async () =>
  (await import("@/modules/examples/inspection-preset")).loadNotesInspection();
const route = useRoute();
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
const example = computed(() => mounted.value && route.query.example === "notes");
const unknown = computed(
  () => mounted.value && route.query.example != null && route.query.example !== "notes",
);
</script>

<template>
  <ToolPage
    class="inspector-page"
    title="Document inspector"
    description="Explore JSON and verify signed history. Your file stays in your browser."
  >
    <p v-if="unknown" role="alert">
      This example is unavailable. <RouterLink to="/inspect">Open your own file</RouterLink>.
    </p>
    <KeepAlive :max="2">
      <InspectorApp
        v-if="!unknown"
        :key="example ? 'notes' : 'files'"
        :load-example="example ? loadNotesInspection : undefined"
        :example-label="example ? 'Notes example' : undefined"
      />
    </KeepAlive>
  </ToolPage>
</template>
