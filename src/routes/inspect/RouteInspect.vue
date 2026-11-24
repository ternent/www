<script setup lang="ts">
import ToolPage from "@/components/ToolPage.vue";
import InspectorApp from "@/modules/inspector/InspectorApp.vue";
</script>

<template>
  <ToolPage
    class="inspector-page"
    title="Document inspector"
    description="Explore JSON and verify signed history. Your file stays in your browser."
  >
    <InspectorApp />
  </ToolPage>
</template>
