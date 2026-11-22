<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { appConfig } from "@/app/config/app.config";
import { useThemeMode } from "@/modules/ui";
import ArchitectureMap from "./ArchitectureMap.vue";
import { useStoryMotion } from "./useStoryMotion";

const { mode } = useThemeMode();
const mounted = ref(false);
const story = ref<HTMLElement | null>(null);
useStoryMotion(story);
const themeMode = computed(() => (mounted.value ? mode.value : appConfig.defaultThemeMode));
onMounted(() => {
  mounted.value = true;
});
const packages = [
  {
    id: "identity",
    name: "Identity",
    theme: "aurora",
    pkg: "@ternent/identity",
    title: "An identity you can take with you.",
    text: "Create a signing identity locally. Its public key lets other people check your signatures. Its private material lets you sign and derive encryption keys. You can export it and recover it with a mnemonic.",
    detail:
      "The stable identity model uses Ed25519 signatures, with derived X25519 and age-compatible encryption keys. A key identifies a signer. Connecting that signer to a person still needs a trusted introduction.",
    action: "Explore the demo identity",
    target: "/examples",
    source: "identity",
  },
  {
    id: "encryption",
    name: "Armour",
    theme: "armour",
    pkg: "@ternent/armour",
    title: "Private before it leaves your device.",
    text: "Encrypt the content for its intended recipients. Storage can hold the ciphertext, while the people with the matching keys can read it. The example encrypts each payload before storing its entry.",
    detail:
      "Armour provides age-compatible encryption for identities, recipients and passphrases. Signatures and public metadata remain visible. Encryption protects the payload rather than hiding the existence of the document.",
    action: "Inspect the encrypted payload",
    target: "/examples/json",
    source: "armour",
  },
  {
    id: "verification",
    name: "Seal",
    theme: "proof",
    pkg: "@ternent/seal",
    title: "Proof that travels with the file.",
    text: "A signature lets someone check whether content matches what a particular key signed. Seal packages that proof so it can travel with a file, a release or an exported history.",
    detail:
      "The same proof model is available through JavaScript, a command-line tool and a GitHub Action. Verification needs the content and public proof. It does not need the private signing key.",
    action: "Try changing a signed record",
    target: "/examples/verification",
    source: "seal",
  },
  {
    id: "history",
    name: "Ledger",
    theme: "ledger",
    pkg: "@ternent/ledger",
    title: "Keep the changes. Rebuild the view.",
    text: "Each change becomes an entry. A commit groups entries into signed, linked history. Replaying verified entries derives the current application state. Export the history to rebuild that state elsewhere.",
    detail:
      "Ledger handles append, commit, verification and replay. Concord adds application commands and replay plugins on top. Deterministic replay depends on using the same rules, and encrypted content requires the matching decryption capability.",
    action: "Follow the commit history",
    target: "/examples/history",
    source: "ledger",
  },
];
</script>
<template>
  <main id="main-content" ref="story" class="story" tabindex="-1">
    <section id="overview" class="story-hero" tabindex="-1">
      <p class="eyebrow">ternent.dev</p>
      <h1 tabindex="-1">
        <span class="hero-line">Software built on </span><em class="hero-line">signed history.</em>
      </h1>
      <p class="hero-description">
        Your data, your keys, your copy.<br />A different foundation for applications.
      </p>
      <div class="hero-actions">
        <RouterLink class="primary button" to="/examples">Try it in your browser ↘</RouterLink
        ><RouterLink to="/idea">Start with the idea ↓</RouterLink>
      </div>
      <p class="hero-footnote">
        Open-source tools for local-first, encrypted, verifiable software.
      </p>
    </section>
    <section id="idea" class="story-section idea-section">
      <div>
        <p class="eyebrow">The idea</p>
        <h2>Using an app shouldn't mean handing over everything.</h2>
      </div>
      <div class="prose">
        <p>
          Most of the software we use keeps our data in someone else's database. Our access, our
          history and our ability to leave depend on that service.
        </p>
        <p>
          This stack takes a different approach. Applications work with a portable history of signed
          changes. Sensitive content is encrypted on your device. You keep a copy that another
          application can verify and rebuild.
        </p>
        <p>
          Services can still help store and move that data. They need much less access to what's
          inside it.
        </p>
      </div>
    </section>
    <section id="how-it-works" class="story-section foundation-section">
      <header class="foundation-intro">
        <div>
          <p class="eyebrow">Under the surface</p>
          <h2>The history comes first.</h2>
        </div>
        <div class="prose">
          <p>
            An application's current state tells you where things stand. Its history tells you how
            they got there.
          </p>
          <p>
            Record changes in a signed, verifiable history, and that history becomes something you
            can keep, inspect and use to rebuild the application's state. Sensitive content can stay
            encrypted, readable only with the matching keys.
          </p>
        </div>
      </header>
      <ol class="flow">
        <li>
          <strong>Record</strong>
          <p>Capture a change as a structured entry.</p>
        </li>
        <li>
          <strong>Encrypt</strong>
          <p>Protect sensitive content for its intended recipients.</p>
        </li>
        <li>
          <strong>Commit</strong>
          <p>Group entries into signed, linked history.</p>
        </li>
        <li>
          <strong>Replay</strong>
          <p>Check the history and apply its entries to reconstruct the current state.</p>
        </li>
      </ol>
      <div class="foundation-diagram">
        <h3>A small set of building blocks.</h3>
        <ArchitectureMap :mode="themeMode" />
      </div>
    </section>
    <section
      v-for="item in packages"
      :id="item.id"
      :key="item.id"
      class="story-section concept-section"
      :data-theme="`${item.theme}-${themeMode}`"
    >
      <div>
        <p class="eyebrow">{{ item.name }}</p>
        <h2>{{ item.title }}</h2>
        <RouterLink class="text-link" :to="item.target">{{ item.action }} ↗</RouterLink>
      </div>
      <div class="prose">
        <p>{{ item.text }}</p>
        <p>{{ item.detail }}</p>
        <details>
          <summary>Developer details</summary>
          <p>
            <code>{{ item.pkg }}</code> is independently usable. See the package README for its
            published API and supported formats.
          </p>
          <div class="actions">
            <a :href="`https://www.npmjs.com/package/${item.pkg}?activeTab=readme`"
              >Published package ↗</a
            ><a :href="`https://github.com/ternent/core/tree/main/packages/${item.source}`"
              >Source on GitHub ↗</a
            >
          </div>
        </details>
      </div>
    </section>
    <section
      id="concord"
      class="story-section concept-section"
      :data-theme="`concord-${themeMode}`"
    >
      <div>
        <p class="eyebrow">Concord</p>
        <h2>Bring the pieces into an application.</h2>
      </div>
      <div class="prose">
        <p>
          Concord connects domain commands, commit boundaries and replay plugins. Your application
          dispatches domain commands and queries state derived from verified history.
        </p>
        <p>
          Identity supplies the keys. Armour encrypts content. Seal supplies portable proofs. Ledger
          records and replays the history. Concord coordinates the application.
        </p>
        <p>
          The example runs the published alpha packages, using Concord commands and replay on
          Ledger's signed history.
        </p>
        <a href="https://www.npmjs.com/package/@ternent/concord?activeTab=readme"
          >Explore the published Concord package ↗</a
        >
      </div>
    </section>
    <section id="open-source" class="story-section concept-section">
      <div>
        <p class="eyebrow">Built in the open</p>
        <h2>Follow the code.</h2>
      </div>
      <div class="prose">
        <p>
          The libraries and examples are open source. This site uses the published alpha packages.
          Their READMEs describe the current APIs; main branches can contain work in progress.
        </p>
        <div class="source-links">
          <a href="https://github.com/ternent/core"
            ><strong>ternent/core ↗</strong><span>The five core libraries</span></a
          ><a href="https://github.com/ternent/www"
            ><strong>ternent/www ↗</strong><span>This website and examples</span></a
          ><a href="https://github.com/samternent/home"
            ><strong>samternent/home ↗</strong
            ><span>Earlier applications, experiments and implementations</span></a
          >
        </div>
      </div>
    </section>
    <section id="about" class="story-section about-section">
      <p class="eyebrow">Work with the architecture</p>
      <h2>Build software around<br />data people can own.</h2>
      <p>Discuss an integration, explore the libraries or contribute to the open-source stack.</p>
      <a class="text-link" href="mailto:sam@ternent.dev">sam@ternent.dev ↗</a>
    </section>
  </main>
</template>

<style scoped>
.foundation-intro {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: var(--space-column);
  row-gap: 32px;
  align-items: start;
}
.foundation-intro h2 {
  max-width: 9ch;
  margin-bottom: 0;
}
.foundation-intro .prose p:last-child {
  margin-bottom: 0;
}
.foundation-section .flow {
  counter-reset: step;
  margin: var(--space-block) 0 0;
  gap: 32px;
}
.foundation-section .flow li {
  counter-increment: step;
  border-top: 1px solid var(--ui-border);
  padding: 20px 0 0;
}
.foundation-section .flow li::before {
  content: counter(step, decimal-leading-zero);
  display: block;
  margin-bottom: 18px;
  color: var(--ui-secondary);
  font:
    12px/1.4 ui-monospace,
    monospace;
}
.foundation-section .flow p {
  margin: 12px 0 0;
  max-width: 27ch;
}
.foundation-diagram {
  padding: var(--space-chapter) 0 0;
}
.foundation-section .foundation-diagram h3 {
  margin: 0;
  text-align: center;
  text-wrap: balance;
  font-size: clamp(34px, 4.8vw, 60px);
  line-height: 1.15;
  font-weight: 450;
  letter-spacing: -0.04em;
}
.foundation-diagram :deep(.architecture-map) {
  margin-top: var(--space-block);
}
@media (max-width: 900px) {
  .foundation-section .flow {
    gap: 24px;
  }
}
@media (max-width: 650px) {
  .foundation-intro {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .foundation-intro h2 {
    max-width: none;
  }
  .foundation-section .flow {
    gap: 32px 20px;
  }
}
</style>
