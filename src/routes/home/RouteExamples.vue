<script setup lang="ts">
import Examples from "@/modules/examples/Examples.vue";
import { packageVersions } from "@/app/config/packages";
</script>

<template>
  <main id="main-content" class="story examples-page" tabindex="-1">
    <section id="examples" class="story-section examples-section">
      <div class="section-intro">
        <RouterLink class="text-link" to="/">← Back to the story</RouterLink>
        <p class="eyebrow">Examples</p>
        <h1 tabindex="-1">Keep the history. <br />Rebuild the state.</h1>
        <p>
          Read the same signed document with different identities. Inspect encrypted entries, stage
          and commit changes, verify history and reopen an exported file. All in your browser.
        </p>
      </div>
      <Examples />
      <p class="examples-caption">
        Runs locally using Concord,
        <a :href="`https://www.npmjs.com/package/@ternent/ledger/v/${packageVersions.ledger}`"
          >@ternent/ledger {{ packageVersions.ledger }}</a
        >, Identity and Armour. <RouterLink to="/architecture">Explore the packages ↗</RouterLink>
      </p>
    </section>
  </main>
</template>

<style scoped>
.examples-section {
  border-top: 0;
}
.section-intro > .text-link {
  display: inline-block;
  margin-bottom: var(--space-block);
}
.examples-page h1 {
  font-size: clamp(36px, 5vw, 64px);
  margin-bottom: var(--space-heading);
}
.examples-caption {
  margin: 24px 0 0;
  line-height: 1.7;
}
</style>
