<script setup lang="ts">
import ToolPage from "@/components/ToolPage.vue";
import Examples from "@/modules/examples/Examples.vue";
</script>

<template>
  <ToolPage
    class="examples-page"
    title="Examples"
    description="Try encrypted notes, switch readers and inspect the signed document."
  >
    <Examples />
  </ToolPage>
</template>
