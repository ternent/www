<script setup lang="ts">
import type { ThemeMode } from "@/app/config/app.config";

defineProps<{ mode: ThemeMode }>();
</script>

<template>
  <nav
    class="architecture-map"
    aria-label="Runtime building blocks"
    aria-describedby="architecture-map-description"
  >
    <p id="architecture-map-description" class="sr-only">
      Concord coordinates commands and replay over Ledger. Seal supplies proofs, Armour encrypts
      content and Identity supplies the keys. Follow each link to its explanation.
    </p>
    <RouterLink
      class="architecture-node architecture-node-wide"
      data-node="concord"
      to="/concord"
      :data-theme="`concord-${mode}`"
    >
      <span class="node-role">Application runtime</span>
      <strong>Concord</strong><span class="node-description">Commands and replay</span>
      <span class="node-detail" aria-hidden="true">↗</span>
    </RouterLink>
    <div class="architecture-line" aria-hidden="true"></div>
    <RouterLink
      class="architecture-node architecture-node-wide"
      data-node="ledger"
      to="/ledger"
      :data-theme="`ledger-${mode}`"
    >
      <span class="node-role">History</span>
      <strong>Ledger</strong><span class="node-description">Signed, append-only history</span>
      <span class="node-detail" aria-hidden="true">↗</span>
    </RouterLink>
    <div class="architecture-branch" aria-hidden="true"></div>
    <RouterLink class="architecture-node" data-node="seal" to="/seal" :data-theme="`proof-${mode}`">
      <span class="node-role">Verification</span>
      <strong>Seal</strong><span class="node-description">Portable proofs</span>
      <span class="node-detail" aria-hidden="true">↗</span>
    </RouterLink>
    <RouterLink class="architecture-node" data-node="armour" to="/armour" :data-theme="`armour-${mode}`">
      <span class="node-role">Privacy</span>
      <strong>Armour</strong><span class="node-description">Client-side encryption</span>
      <span class="node-detail" aria-hidden="true">↗</span>
    </RouterLink>
    <div class="architecture-branch architecture-branch-join" aria-hidden="true"></div>
    <RouterLink
      class="architecture-node architecture-node-wide"
      data-node="identity"
      to="/identity"
      :data-theme="`aurora-${mode}`"
    >
      <span class="node-role">Trust foundation</span>
      <strong>Identity</strong><span class="node-description">Portable signing keys</span>
      <span class="node-detail" aria-hidden="true">↗</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.architecture-map {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 40px;
  max-width: 940px;
  margin: var(--space-block) auto 0;
  padding: 24px 48px 0;
}
.architecture-map::before {
  content: "";
  position: absolute;
  inset: -48px -32px;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(color-mix(in srgb, var(--ui-border) 45%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--ui-border) 45%, transparent) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse at center, black 20%, transparent 72%);
}
.architecture-node {
  position: relative;
  display: grid;
  gap: 8px;
  align-content: center;
  min-height: 126px;
  padding: 22px 28px;
  border: 1px solid color-mix(in srgb, var(--ui-primary) 34%, var(--ui-border));
  border-radius: 12px;
  background: var(--ui-bg);
  box-shadow: 0 16px 48px color-mix(in srgb, var(--ui-bg) 35%, transparent), inset 0 1px 0 color-mix(in srgb, var(--ui-primary) 12%, transparent);
  text-decoration: none;
  text-align: left;
  transition:
    border-color 220ms,
    background-color 220ms,
    box-shadow 220ms;
}
.architecture-node:is(:hover, :focus-visible) {
  border-color: var(--ui-primary);
  box-shadow: 0 16px 48px color-mix(in srgb, var(--ui-bg) 35%, transparent), inset 0 0 36px color-mix(in srgb, var(--ui-primary) 5%, transparent);
}
.architecture-node strong {
  color: var(--ui-fg);
  font-size: clamp(26px, 3vw, 32px);
  letter-spacing: -0.045em;
  line-height: 1.1;
  font-weight: 500;
}
.architecture-node .node-description {
  color: var(--ui-fg-muted);
  font-size: 15px;
  line-height: 1.5;
}
.node-role {
  margin-bottom: 4px;
  color: var(--ui-primary);
  font: 10px/1.5 ui-monospace, monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.node-detail {
  position: absolute;
  top: 20px;
  right: 20px;
  color: var(--ui-primary);
  font-size: 18px;
  opacity: 0.55;
  transition: opacity 220ms;
}
.architecture-node:is(:hover, :focus-visible) .node-detail { opacity: 1; }
.architecture-node-wide {
  grid-column: 1 / -1;
  justify-self: center;
  width: 64%;
}
[data-node="concord"] {
  min-height: 140px;
}
[data-node="concord"] strong { font-size: clamp(30px, 3.8vw, 40px); }
[data-node="ledger"] {
  width: 76%;
  min-height: 132px;
}
[data-node="ledger"] strong { font-size: clamp(28px, 3.4vw, 36px); }
[data-node="identity"] { width: 60%; }
.architecture-line,
.architecture-branch {
  grid-column: 1 / -1;
  position: relative;
  height: 64px;
  color: color-mix(in srgb, var(--ui-secondary) 72%, var(--ui-border));
  transition: color 220ms;
}
.architecture-map:has([data-node="concord"]:is(:hover, :focus-visible)) .architecture-line,
.architecture-map:has([data-node="ledger"]:is(:hover, :focus-visible)) :is(.architecture-line, .architecture-branch:not(.architecture-branch-join)),
.architecture-map:has([data-node="seal"]:is(:hover, :focus-visible), [data-node="armour"]:is(:hover, :focus-visible)) .architecture-branch,
.architecture-map:has([data-node="identity"]:is(:hover, :focus-visible)) .architecture-branch-join {
  color: var(--ui-secondary);
}
.architecture-line::after,
.architecture-branch::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: currentColor;
  box-shadow: 0 0 10px color-mix(in srgb, currentColor 10%, transparent);
}
.architecture-branch::after {
  bottom: 50%;
}
.architecture-branch::before {
  content: "";
  position: absolute;
  top: 50%;
  bottom: 0;
  left: calc(25% - 10px);
  right: calc(25% - 10px);
  border: 1px solid currentColor;
  border-bottom: 0;
  border-radius: 16px 16px 0 0;
}
.architecture-branch-join::before {
  top: 0;
  bottom: 50%;
  border-top: 0;
  border-bottom: 1px solid currentColor;
  border-radius: 0 0 16px 16px;
}
.architecture-branch-join::after {
  top: 50%;
  bottom: 0;
}
@media (max-width: 650px) {
  .architecture-map {
    column-gap: 20px;
    padding: 16px 0 0;
  }
  .architecture-map::before { inset: -24px -12px; }
  .architecture-node {
    min-height: 124px;
    padding: 20px 16px;
  }
  .architecture-node .node-description {
    font-size: 14px;
  }
  .node-role { font-size: 9px; letter-spacing: 0.06em; }
  .node-detail { top: 12px; right: 12px; font-size: 14px; }
  .architecture-node-wide,
  [data-node="ledger"],
  [data-node="identity"] {
    width: 86%;
  }
  [data-node="concord"] { min-height: 136px; }
  [data-node="ledger"] { min-height: 128px; }
  .architecture-line, .architecture-branch { height: 56px; }
  .architecture-branch::before {
    left: calc(25% - 5px);
    right: calc(25% - 5px);
  }
}
</style>
