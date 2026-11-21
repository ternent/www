<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";
import type { LedgerContainer, LedgerVerificationResult } from "@ternent/ledger";
import type { SerializedIdentity } from "@ternent/identity";
import JsonNode from "./JsonNode.vue";
import {
  createSample, openRuntime, getData, verifyArtifact, orderedCommits,
  alterPayload, stateFingerprint, type DataState, type PlaygroundRuntime,
} from "./runtime";

type Phase = "loading" | "ready" | "clear" | "verify" | "decrypt" | "replay" | "complete" | "rejected" | "error";
const route = useRoute();
const runtime = shallowRef<PlaygroundRuntime>();
const identity = shallowRef<SerializedIdentity>();
const exportIdentity = shallowRef<SerializedIdentity>();
const container = shallowRef<LedgerContainer>();
const validArtifact = shallowRef<LedgerContainer>();
const data = ref<DataState>({});
const verification = shallowRef<LedgerVerificationResult>();
const phase = ref<Phase>("loading");
const busy = ref(true);
const error = ref("");
const applied = ref<string[]>([]);
const activeEntry = ref("");
const referenceHash = ref("");
const resultHash = ref("");
const stateMatches = ref(false);
const alteration = shallowRef<ReturnType<typeof alterPayload>>();
const tab = ref("history");
const inspector = ref<HTMLDetailsElement>();
const demoRoot = ref<HTMLElement>();
const importedLedger = ref<File>();
const importedIdentity = ref<File>();
const importMessage = ref("");
let disposed = false;
let reducedMotion = false;

const commits = computed(() => container.value ? orderedCommits(container.value) : []);
const entries = computed(() => Object.values(container.value?.entries ?? {}));
const payload = computed(() => container.value?.entries[activeEntry.value]?.payload ?? entries.value[0]?.payload);
const stateJson = computed(() => JSON.stringify(data.value, null, 2));
const stages = ["Clear", "Verify", "Decrypt", "Replay"];
const stageIndex = computed(() => ["clear", "verify", "decrypt", "replay"].indexOf(phase.value));
const stateLabel = computed(() => ({
  loading: "Preparing", ready: "Derived state", clear: "State cleared", verify: "State cleared",
  decrypt: "Decrypting", replay: "Replay preview", complete: "State restored", rejected: "Rebuild stopped", error: "Rebuild stopped",
}[phase.value]));
const description = computed(() => ({
  loading: "Creating an identity and encrypted sample history in your browser.",
  ready: "The readable state is derived from the encrypted history. Watch it disappear and return.",
  clear: "The previous runtime has been destroyed. Only the exported history and demo identity are retained.",
  verify: "Checking public proofs, payload hashes and commit linkage without the decryption key.",
  decrypt: "History verified. Opening a fresh runtime with the matching demo identity.",
  replay: "Applying decrypted entries in history order. This is a preview of the real replay work.",
  complete: stateMatches.value
    ? "Reconstructed locally from the exported history. The state hash matches the original."
    : "Reconstructed locally from the imported history using this demo’s replay rules.",
  rejected: "History failed verification. No entries were decrypted or replayed.",
  error: "The operation could not be completed. The last valid export is still available.",
}[phase.value]));

function assertActive() {
  if (disposed) throw new Error("Demo closed.");
}
async function pause(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 200 : ms));
  assertActive();
}
async function run(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  importMessage.value = "";
  try { await action(); }
  catch (cause) {
    if (!disposed) {
      error.value = cause instanceof Error ? cause.message : String(cause);
      phase.value = "error";
    }
  } finally { if (!disposed) busy.value = false; }
}

async function reset() {
  await run(async () => {
    phase.value = "loading";
    const next = await createSample();
    if (disposed) { await next.app.destroy(); return; }
    await runtime.value?.app.destroy();
    runtime.value = next;
    identity.value = next.identity;
    exportIdentity.value = next.identity;
    container.value = await next.app.exportLedger();
    validArtifact.value = structuredClone(container.value);
    data.value = getData(next);
    verification.value = await next.app.verify();
    applied.value = entries.value.map((entry) => entry.entryId);
    activeEntry.value = "";
    referenceHash.value = await stateFingerprint(data.value);
    resultHash.value = referenceHash.value;
    stateMatches.value = false;
    alteration.value = undefined;
    phase.value = "ready";
  });
}

async function reconstruct(artifact: LedgerContainer, key: SerializedIdentity, expectedHash = "") {
  const snapshot = structuredClone(artifact);
  const previous = runtime.value;
  runtime.value = undefined;
  await previous?.app.destroy();
  assertActive();
  data.value = {};
  applied.value = [];
  activeEntry.value = "";
  resultHash.value = "";
  stateMatches.value = false;
  verification.value = undefined;
  container.value = snapshot;
  identity.value = key;
  phase.value = "clear";
  await pause(650);

  phase.value = "verify";
  verification.value = await verifyArtifact(snapshot);
  assertActive();
  await pause(650);
  if (!verification.value.valid) {
    phase.value = "rejected";
    tab.value = "verification";
    if (inspector.value) inspector.value.open = true;
    return;
  }

  phase.value = "decrypt";
  await pause(550);
  const next = await openRuntime(key, snapshot, async (state, entry) => {
    assertActive();
    phase.value = "replay";
    data.value = state;
    activeEntry.value = entry.entryId;
    applied.value = [...applied.value, entry.entryId];
    await pause(550);
  });
  if (disposed) { await next.app.destroy(); return; }
  if (entries.value.length && !Object.keys(getData(next)).length) {
    await next.app.destroy();
    data.value = {};
    throw new Error("No readable data was produced. Use the matching identity and a ledger supported by this demo’s replay rules.");
  }
  runtime.value = next;
  data.value = getData(next);
  resultHash.value = await stateFingerprint(data.value);
  stateMatches.value = Boolean(expectedHash && expectedHash === resultHash.value);
  if (expectedHash && !stateMatches.value) {
    data.value = {};
    await next.app.destroy();
    runtime.value = undefined;
    throw new Error("The reconstructed state did not match the original.");
  }
  referenceHash.value = resultHash.value;
  validArtifact.value = structuredClone(snapshot);
  exportIdentity.value = key;
  activeEntry.value = "";
  alteration.value = undefined;
  phase.value = "complete";
}

function focusRebuild() {
  const target = window.matchMedia("(max-width: 650px)").matches
    ? demoRoot.value?.querySelector<HTMLElement>(".state-panel")
    : demoRoot.value?.querySelector<HTMLElement>(".replay-workspace");
  target?.scrollIntoView({ block: "start", behavior: reducedMotion ? "instant" : "smooth" });
}
function rebuild() {
  if (!validArtifact.value || !exportIdentity.value) return;
  const artifact = validArtifact.value;
  const key = exportIdentity.value;
  alteration.value = undefined;
  focusRebuild();
  void run(() => reconstruct(artifact, key, referenceHash.value));
}
function tamper() {
  if (!validArtifact.value || !exportIdentity.value) return;
  const key = exportIdentity.value;
  focusRebuild();
  void run(async () => {
    alteration.value = alterPayload(validArtifact.value!);
    await reconstruct(alteration.value.container, key);
  });
}
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function pickFile(event: Event, kind: "ledger" | "identity") {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (kind === "ledger") importedLedger.value = file;
  else importedIdentity.value = file;
}
function importFiles() {
  void run(async () => {
    if (!importedLedger.value || !importedIdentity.value) return;
    if (importedLedger.value.size > 5_000_000 || importedIdentity.value.size > 100_000)
      throw new Error("Choose a demo ledger under 5 MB and an identity under 100 KB.");
    // Parse and validate before discarding the current session.
    const artifact = JSON.parse(await importedLedger.value.text()) as LedgerContainer;
    const key = JSON.parse(await importedIdentity.value.text()) as SerializedIdentity;
    const result = await verifyArtifact(artifact);
    if (!result.valid) throw new Error("The imported history failed verification.");
    const { validateIdentity } = await import("@ternent/identity");
    await validateIdentity(key);
    alteration.value = undefined;
    await reconstruct(artifact, key);
    if (phase.value === "complete") importMessage.value = "Your ledger has been verified, decrypted and replayed.";
  });
}
function followRoute() {
  const view = route.meta.playgroundView;
  if (typeof view === "string" && ["json", "history", "verification"].includes(view)) {
    tab.value = view;
    if (inspector.value) inspector.value.open = true;
  }
}
watch(() => route.meta.playgroundView, followRoute);
onMounted(() => {
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  followRoute();
  busy.value = false;
  void reset();
});
onBeforeUnmount(() => {
  disposed = true;
  void runtime.value?.app.destroy();
});
</script>

<template>
  <div ref="demoRoot" class="replay-demo">
    <header class="replay-toolbar">
      <div>
        <p class="replay-kicker"><span aria-hidden="true" class="replay-dot"></span> Live Concord runtime</p>
        <h2>The view is temporary. <br />The history is yours.</h2>
      </div>
      <button class="primary rebuild-button" :disabled="busy || !validArtifact" @click="rebuild">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="m9 5 10 7-10 7V5Z" />
        </svg>
        {{ busy ? "Working locally…" : phase === "rejected" ? "Restore & rebuild" : "Rebuild from history" }}
      </button>
    </header>

    <div class="replay-workspace" :aria-busy="busy">
      <section class="replay-panel artifact-panel" aria-labelledby="artifact-heading">
        <header class="panel-heading">
          <h3 id="artifact-heading">01 <span>Stored history</span></h3>
          <span class="replay-badge" :class="{ failed: alteration }">{{ alteration ? "1 byte altered" : "Encrypted" }}</span>
        </header>
        <div class="artifact-file">
          <svg aria-hidden="true" width="31" height="38" viewBox="0 0 32 40" fill="none" stroke="currentColor" stroke-width="1.3">
            <path d="M6 1h14l11 11v27H1V6a5 5 0 0 1 5-5Z" /><path d="M20 1v11h11M9 23l-4 4 4 4m14-8 4 4-4 4m-5-11-4 14" />
          </svg>
          <div><strong>ledger.json</strong><span>{{ entries.length }} entries · {{ commits.length }} signed commits</span></div>
        </div>
        <p class="payload-label">Payload <span>age encrypted · actual stored bytes</span></p>
        <pre class="ciphertext" role="region" tabindex="0" aria-label="Encrypted payload"><code>{{ payload?.type === "encrypted" ? payload.data : "Preparing encrypted history…" }}</code></pre>
        <div v-if="alteration" class="byte-change">
          Byte {{ alteration.offset }} <del>{{ JSON.stringify(alteration.before) }}</del>
          <span aria-hidden="true">→</span> <ins>{{ JSON.stringify(alteration.after) }}</ins>
        </div>
        <div class="identity-token">
          <span class="identity-symbol" aria-hidden="true">⌑</span>
          <div><strong>Demo identity</strong><code :title="identity?.keyId">{{ identity?.keyId.slice(0, 22) || "Generating locally…" }}…</code></div>
          <span class="replay-badge">Separate key</span>
        </div>
        <p class="panel-note">The file carries public proofs. The identity supplies the decryption key.</p>
      </section>

      <div class="replay-connector" aria-hidden="true"><span>→</span></div>

      <section class="replay-panel state-panel" aria-labelledby="state-heading" :class="{ 'is-replaying': phase === 'replay', 'is-rejected': phase === 'rejected' }">
        <header class="panel-heading">
          <h3 id="state-heading">02 <span>Application state</span></h3>
          <span class="replay-badge" :class="{ success: phase === 'complete', failed: phase === 'rejected' }">{{ stateLabel }}</span>
        </header>
        <div class="state-surface">
          <pre class="state-code" aria-label="Derived application state"><code>{{ stateJson }}</code></pre>
          <p v-if="['clear', 'verify', 'decrypt', 'rejected'].includes(phase)" class="empty-state-note">
            {{ phase === "rejected" ? "Unverified history cannot rebuild trusted state." : "No application state. The history is still here." }}
          </p>
        </div>
        <footer class="state-footer">
          <span><strong>{{ applied.length }}</strong> / {{ entries.length }} entries applied</span>
          <span v-if="resultHash" class="state-hash" :title="resultHash">SHA-256 {{ resultHash.slice(0, 12) }}…</span>
        </footer>
        <p class="panel-note">{{ phase === "replay" ? "Replay preview. Concord publishes the complete state when replay finishes." : "Derived locally by the replay plugin. Rebuilt in a fresh runtime." }}</p>
      </section>
    </div>

    <div class="rebuild-progress">
      <ol aria-label="Reconstruction stages" class="rebuild-stages">
        <li v-for="(stage, index) in stages" :key="stage"
          :class="{ current: stageIndex === index, done: phase === 'complete' || stageIndex > index, failed: phase === 'rejected' && index === 1 }"
          :aria-current="stageIndex === index ? 'step' : undefined">
          <span aria-hidden="true">{{ (phase === "complete" || stageIndex > index) ? "✓" : String(index + 1).padStart(2, "0") }}</span>{{ stage }}
        </li>
      </ol>
      <p class="rebuild-description" role="status" aria-live="polite" aria-atomic="true">{{ description }}</p>
      <p v-if="error" class="error replay-error" role="alert">{{ error }}</p>
      <p v-if="importMessage" class="good" role="status">{{ importMessage }}</p>
    </div>

    <div class="history-strip">
      <div class="history-strip-heading"><span>Signed commit history</span><code v-if="container" :title="container.head">HEAD {{ container.head.slice(0, 12) }}…</code></div>
      <ol class="replay-timeline" aria-label="Signed commits in replay order">
        <li v-for="(commit, index) in commits" :key="commit.commitId"
          :class="{ applied: commit.entryIds.every(id => applied.includes(id)), active: commit.entryIds.includes(activeEntry) }">
          <span class="timeline-node" aria-hidden="true"></span>
          <small>{{ String(index + 1).padStart(2, "0") }} / {{ commit.entryIds.length }} {{ commit.entryIds.length === 1 ? "entry" : "entries" }}</small>
          <strong>{{ commit.metadata?.message || (commit.parentCommitId ? "Signed commit" : "Genesis") }}</strong>
        </li>
      </ol>
    </div>

    <div class="replay-secondary-actions">
      <p>One changed byte is enough to break verification.</p>
      <button :disabled="busy || !validArtifact" @click="tamper">Alter one byte <span aria-hidden="true">↗</span></button>
    </div>

    <details ref="inspector" class="replay-inspector">
      <summary>Inspect the real artifact <span>History, JSON & proof checks</span></summary>
      <nav class="inspector-tabs" aria-label="Ledger inspector">
        <button v-for="view in ['history', 'json', 'verification']" :key="view" :aria-pressed="tab === view" aria-controls="ledger-inspector-content" @click="tab = view">
          {{ view === "json" ? "Stored JSON" : view.charAt(0).toUpperCase() + view.slice(1) }}
        </button>
      </nav>
      <div v-if="tab === 'history'" id="ledger-inspector-content" class="inspector-body" role="region" aria-label="Commit history" tabindex="0">
        <p>The signed commits reference ordered entries. Replay applies that history to derive state.</p>
        <ol class="commit-list">
          <li v-for="commit in commits" :key="commit.commitId">
            <strong>{{ commit.metadata?.message || "Signed commit" }}</strong>
            <small>{{ commit.entryIds.length }} entries · {{ commit.commitId }}</small>
          </li>
        </ol>
      </div>
      <div v-else-if="tab === 'json'" id="ledger-inspector-content" class="inspector-body" role="region" aria-label="Stored JSON" tabindex="0">
        <p>Encrypted payloads and public signing metadata. The private identity is a separate file.</p>
        <JsonNode v-if="container" label="ledger" :value="container" />
      </div>
      <div v-else id="ledger-inspector-content" class="inspector-body" role="region" aria-label="Verification results" tabindex="0">
        <h3 :class="verification?.valid ? 'good' : 'error'">{{ verification ? verification.valid ? "History verified." : "History has been altered." : "Waiting for verification…" }}</h3>
        <ul v-if="verification" class="checks">
          <li v-for="[label, passed] in [
            ['Commit chain', verification.commitChainValid],
            ['Commit signatures', verification.commitProofsValid],
            ['Entry signatures', verification.entryProofsValid],
            ['Payload hashes', verification.payloadHashesValid],
          ]" :key="String(label)"><span>{{ label }}</span><strong :class="passed ? 'good' : 'error'">{{ passed ? "Valid" : "Failed" }}</strong></li>
        </ul>
        <p>Public proofs establish integrity and the signing key. They do not establish whether you should trust the signer.</p>
      </div>
    </details>

    <footer class="playground-footer">
      <div class="export-heading">
        <div><h3>Take the history with you.</h3><p>Keep the encrypted ledger and demo identity to decrypt and rebuild the data elsewhere with the same replay rules.</p></div>
        <button :disabled="busy" @click="reset">Reset demo</button>
      </div>
      <div class="export-options">
        <button class="export-option secondary" :disabled="busy || !validArtifact" @click="download('demo-ledger.json', validArtifact)">
          <span class="export-icon" aria-hidden="true">↧</span><span><strong>Download ledger</strong><small>Original encrypted history · JSON</small></span><span aria-hidden="true">↓</span>
        </button>
        <button class="export-option" :disabled="busy || !exportIdentity" @click="download('demo-identity.private.json', exportIdentity)">
          <span class="export-icon" aria-hidden="true">⌑</span><span><strong>Download demo identity</strong><small>Private decryption & signing keys · JSON</small></span><span aria-hidden="true">↓</span>
        </button>
      </div>
      <details>
        <summary>Reopen an exported ledger</summary>
        <p class="import-note">This demo understands its own data entries and earlier demo exports. Other applications need their own replay rules.</p>
        <div class="import-fields">
          <label>Ledger JSON<input type="file" accept=".json,application/json" :disabled="busy" @change="pickFile($event, 'ledger')" /></label>
          <label>Demo identity JSON<input type="file" accept=".json,application/json" :disabled="busy" @change="pickFile($event, 'identity')" /></label>
          <button :disabled="busy || !importedLedger || !importedIdentity" @click="importFiles">Import & rebuild</button>
        </div>
      </details>
      <p class="demo-disclosure">Real encryption, signatures and replay, running in your browser. The disposable demo identity stays in memory. Reloading clears the session.</p>
    </footer>
  </div>
</template>

<style scoped>
.replay-demo { scroll-margin-top: 5px; --demo-line: color-mix(in srgb, var(--ui-primary) 19%, var(--ui-border)); border: 1px solid var(--demo-line); border-radius: 18px; background: var(--ui-surface); box-shadow: 0 24px 70px #100b2310; overflow: hidden; }
.replay-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 32px; }
.replay-kicker { display: flex; align-items: center; gap: 9px; margin: 0 0 12px; color: var(--ui-secondary); font-size: 13px; font-weight: 600; letter-spacing: .035em; }
.replay-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 4px var(--ui-secondary-muted); }
.replay-toolbar h2 { margin: 0; font-size: clamp(24px, 3vw, 32px); font-weight: 500; line-height: 1.2; letter-spacing: -.03em; }
.rebuild-button { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 13px 19px; white-space: nowrap; flex-shrink: 0; font-size: 15px; }
.replay-workspace { scroll-margin-top: 5px; display: grid; grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr); padding: 0 32px; }
.replay-panel { min-width: 0; border: 1px solid var(--demo-line); border-radius: 11px; background: var(--ui-bg); display: flex; flex-direction: column; overflow: hidden; }
.panel-heading { padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--ui-border); }
.panel-heading h3 { display: flex; align-items: center; gap: 10px; margin: 0; color: var(--ui-fg-muted); font: 12px ui-monospace, monospace; }
.panel-heading h3 span { color: var(--ui-fg); font-family: inherit; font-size: 14px; font-weight: 500; }
.replay-badge { padding: 4px 7px; font-size: 12px; line-height: 1.4; border-radius: 5px; color: var(--ui-secondary); background: var(--ui-secondary-muted); white-space: nowrap; }
.replay-badge.success { color: var(--ui-success); background: color-mix(in srgb, var(--ui-success) 9%, transparent); }
.replay-badge.failed, .byte-change { color: var(--ui-danger, #d97777); background: color-mix(in srgb, #b94141 9%, transparent); }
.artifact-file { display: flex; gap: 14px; align-items: center; margin: 22px 20px; }
.artifact-file svg { color: var(--ui-secondary); flex-shrink: 0; }
.artifact-file strong, .artifact-file span, .identity-token strong, .identity-token code { display: block; }
.artifact-file strong { font-size: 17px; font-weight: 500; letter-spacing: -.02em; margin-bottom: 5px; }
.artifact-file span { font-size: 13px; color: var(--ui-fg-muted); }
.payload-label { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px; padding: 0 20px; margin: 0 0 9px; font: 11px ui-monospace, monospace; color: var(--ui-fg-muted); }
.payload-label span { opacity: .8; }
.ciphertext { margin: 0 20px; padding: 12px; min-height: 155px; max-height: 155px; overflow: auto; border: 1px solid var(--ui-border); border-radius: 6px; background: var(--ui-surface); color: var(--ui-fg-muted); font: 12px/1.8 ui-monospace, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.byte-change { padding: 8px 14px; margin: 12px 20px 0; font: 12px ui-monospace, monospace; display: flex; gap: 10px; align-items: center; border-radius: 5px; }
.byte-change ins { text-decoration: none; }
.identity-token { display: flex; gap: 10px; align-items: center; border: 1px dashed var(--ui-border); border-radius: 7px; padding: 11px; margin: 18px 20px 0; }
.identity-symbol { font-size: 26px; color: var(--ui-primary); }
.identity-token > div { flex: 1; min-width: 0; }
.identity-token strong { font-size: 12px; font-weight: 500; margin-bottom: 5px; }
.identity-token code { color: var(--ui-fg-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; }
.panel-note { padding: 14px 20px; margin: auto 0 0; font-size: 13px; line-height: 1.6; color: var(--ui-fg-muted); }
.replay-connector { display: flex; justify-content: center; align-items: center; color: var(--ui-secondary); }
.replay-connector span { display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--demo-line); width: 30px; height: 30px; font-size: 19px; background: var(--ui-bg); }
.state-panel { scroll-margin-top: 5px; background: color-mix(in srgb, var(--ui-secondary) 3%, var(--ui-bg)); transition: border-color .3s; }
.state-panel.is-replaying { border-color: var(--ui-secondary); }
.state-panel.is-rejected { border-color: color-mix(in srgb, #b94141 50%, var(--ui-border)); }
.state-surface { flex: 1; min-height: 277px; padding: 25px 22px; }
.state-code { margin: 0; font: 14px/1.85 ui-monospace, SFMono-Regular, Consolas, monospace; color: var(--ui-secondary); white-space: pre-wrap; overflow-wrap: anywhere; }
.empty-state-note { margin-top: 45px; max-width: 240px; font-size: 14px; line-height: 1.7; color: var(--ui-fg-muted); }
.state-footer { display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap; margin: 0 20px; padding: 13px 0; border-top: 1px solid var(--ui-border); color: var(--ui-fg-muted); font-size: 12px; }
.state-footer strong { font-weight: 500; color: var(--ui-secondary); }
.state-hash { font: 10px/1.8 ui-monospace, monospace; }
.rebuild-progress { padding: 28px 32px 24px; }
.rebuild-stages { display: flex; list-style: none; padding: 0; margin: 0; }
.rebuild-stages li { display: flex; align-items: center; gap: 9px; flex: 1; font-size: 13px; color: var(--ui-fg-muted); }
.rebuild-stages li::after { content: ""; height: 1px; background: var(--ui-border); flex: 1; margin: 0 15px 0 5px; }
.rebuild-stages li:last-child { flex: 0; }
.rebuild-stages li:last-child::after { display: none; }
.rebuild-stages li > span { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--ui-border); font: 10px ui-monospace, monospace; flex-shrink: 0; }
.rebuild-stages li.current, .rebuild-stages li.done { color: var(--ui-secondary); }
.rebuild-stages li.current > span, .rebuild-stages li.done > span { border-color: var(--ui-secondary); background: var(--ui-secondary-muted); }
.rebuild-stages li.failed { color: var(--ui-danger, #d97777); }
.rebuild-description { font-size: 14px; line-height: 1.7; margin: 18px 0 0; min-height: 48px; max-width: 750px; color: var(--ui-fg-muted); }
.replay-error { font-size: 14px; line-height: 1.7; margin-bottom: 0; }
.history-strip { border-block: 1px solid var(--ui-border); padding: 23px 32px; }
.history-strip-heading { display: flex; gap: 12px; justify-content: space-between; font-size: 12px; color: var(--ui-fg-muted); margin-bottom: 21px; }
.history-strip-heading code { font-size: 10px; }
.replay-timeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); list-style: none; padding: 0; margin: 0; row-gap: 16px; }
.replay-timeline li { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding-right: 14px; padding-top: 23px; }
.replay-timeline li::before { content: ""; height: 1px; background: var(--ui-border); position: absolute; top: 5px; left: 0; right: 0; }
.timeline-node { position: absolute; z-index: 1; top: 1px; left: 0; width: 9px; height: 9px; border: 1px solid var(--ui-fg-muted); border-radius: 50%; background: var(--ui-surface); }
.replay-timeline li.applied .timeline-node { border-color: var(--ui-secondary); background: var(--ui-secondary); }
.replay-timeline li.active .timeline-node { box-shadow: 0 0 0 5px var(--ui-secondary-muted); }
.replay-timeline small { color: var(--ui-fg-muted); font: 10px ui-monospace, monospace; }
.replay-timeline strong { font-size: 13px; line-height: 1.5; font-weight: 500; }
.replay-secondary-actions { padding: 19px 32px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.replay-secondary-actions p { font-size: 13px; line-height: 1.6; margin: 0; color: var(--ui-fg-muted); }
.replay-secondary-actions button { font-size: 13px; background: transparent; flex-shrink: 0; }
.replay-inspector { border-top: 1px solid var(--ui-border); }
.replay-inspector > summary { padding: 20px 32px; font-size: 14px; cursor: pointer; }
.replay-inspector > summary span { color: var(--ui-fg-muted); font-size: 12px; margin-left: 16px; }
.inspector-tabs { flex-wrap: wrap; }
.inspector-body p { font-size: 14px; line-height: 1.7; color: var(--ui-fg-muted); }
.inspector-body h3 { font-size: 20px; font-weight: 500; margin-top: 0; }
.export-heading h3 { font-size: 23px; font-weight: 500; letter-spacing: -.025em; margin: 0 0 8px; }
.playground-footer { display: grid; border-top: 1px solid var(--ui-border); padding: 28px 32px; }
.playground-footer .demo-disclosure { font-size: 13px; margin: 0; }
.import-note { font-size: 14px; line-height: 1.7; color: var(--ui-fg-muted); }
.import-fields label { font-size: 14px; }
@media (max-width: 950px) {
  .replay-toolbar, .replay-workspace, .rebuild-progress, .history-strip, .replay-secondary-actions, .playground-footer { padding-inline: 22px; }
  .replay-workspace { grid-template-columns: minmax(0, 1fr) 30px minmax(0, 1fr); }
  .replay-connector span { width: 23px; height: 23px; font-size: 15px; }
  .panel-heading { flex-wrap: wrap; gap: 8px; padding: 14px; }
  .identity-token { flex-wrap: wrap; }
  .identity-token .replay-badge { display: none; }
}
@media (max-width: 650px) {
  .replay-toolbar { flex-direction: column; align-items: flex-start; padding-block: 24px; }
  .rebuild-button { width: 100%; }
  .replay-workspace { grid-template-columns: minmax(0, 1fr); }
  .replay-connector { height: 36px; }
  .replay-connector span { transform: rotate(90deg); }
  .state-surface { min-height: 240px; }
  .ciphertext { min-height: 105px; max-height: 105px; }
  .rebuild-progress { padding-top: 22px; }
  .rebuild-stages li { flex-direction: column; gap: 7px; font-size: 12px; }
  .rebuild-stages li:last-child { flex: 1; }
  .rebuild-stages li::after { display: none; }
  .replay-timeline { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 23px; }
  .history-strip-heading { flex-direction: column; gap: 8px; }
  .replay-secondary-actions { flex-direction: column; align-items: flex-start; }
  .replay-secondary-actions button { width: 100%; text-align: left; }
  .replay-inspector > summary span { display: block; margin: 7px 0 0 17px; }
  .export-options { grid-template-columns: minmax(0, 1fr); }
  .export-heading { flex-direction: column; gap: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .state-panel { transition: none; }
}
</style>
