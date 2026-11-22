<script setup lang="ts">
import Examples from "@/modules/examples/Examples.vue";
</script>

<template>
  <main id="main-content" class="examples-page" tabindex="-1">
    <h1 class="sr-only" tabindex="-1">Examples — encrypted notes</h1>
    <Examples />
  </main>
</template>

<style scoped>
.examples-page {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
}
</style>
