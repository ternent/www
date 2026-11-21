<script setup lang="ts">
import LedgerPlayground from "@/modules/playground/LedgerPlayground.vue";
</script>

<template>
  <main id="main-content" class="story playground-page" tabindex="-1">
    <section id="playground" class="story-section playground-section">
      <div class="section-intro">
        <RouterLink class="text-link" to="/">← Back to the story</RouterLink>
        <p class="eyebrow">Examples</p>
        <h1 tabindex="-1">Keep the history. <br />Rebuild the state.</h1>
        <p>
          Clear the application state. Verify the encrypted history, decrypt its
          entries and watch a fresh runtime rebuild the data. All in your browser.
        </p>
      </div>
      <LedgerPlayground />
      <p class="playground-caption">
        Runs locally using Concord,
        <a href="https://www.npmjs.com/package/@ternent/ledger/v/0.1.8">@ternent/ledger 0.1.8</a>,
        Identity and Armour. <RouterLink to="/architecture">Explore the packages ↗</RouterLink>
      </p>
    </section>
  </main>
</template>

<style scoped>
.playground-section { border-top: 0; }
.section-intro > .text-link { display: inline-block; margin-bottom: var(--space-block); }
.playground-page h1 { font-size: clamp(36px, 5vw, 64px); margin-bottom: var(--space-heading); }
.playground-caption { margin: 24px 0 0; line-height: 1.7; }
</style>
