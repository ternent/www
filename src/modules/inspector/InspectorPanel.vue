<script setup lang="ts">
import { computed, ref } from "vue";
import { short, format, type Inspection } from "./types";

const props = defineProps<{
  inspection: Inspection;
  view: "entry" | "history" | "json" | "verification";
  entryId: string | null;
  commitId: string | null;
  raw: string;
  busy: boolean;
}>();
const emit = defineEmits<{
  "select-entry": [id: string];
  "select-commit": [id: string];
  verify: [];
  copy: [];
}>();
const report = computed(() => props.inspection.verification);
const runtime = computed(() => props.inspection.concord);
const snapshot = computed(() => props.inspection.snapshot);
const entry = computed(() => snapshot.value?.entries.find((item) => item.id === props.entryId));
const replayed = computed(() =>
  runtime.value?.entries?.find((item) => item.entryId === props.entryId),
);
const commit = computed(
  () =>
    props.inspection.history.find((item) => item.id === props.commitId) ??
    props.inspection.history.at(-1),
);
const findings = computed(() => [
  ...new Map(
    [...report.value.findings, ...(runtime.value?.findings ?? [])].map((item) => [
      JSON.stringify(item),
      item,
    ]),
  ).values(),
]);
const historyLimit = ref(100);
const entryLimit = ref(100);
const visibleHistory = computed(() => props.inspection.history.slice(-historyLimit.value));
const encrypted = computed(() => {
  const data = entry.value?.subject.payload.data;
  return (
    !!runtime.value &&
    entry.value?.subject.kind === "application" &&
    data !== null &&
    typeof data === "object" &&
    "ciphertext" in data &&
    typeof data.ciphertext === "string"
  );
});
const readable = computed(() => {
  if (replayed.value?.status === "readable") return replayed.value.event;
  if (encrypted.value) return "Encrypted payload. No readable event is available to this reader.";
  return entry.value?.subject.payload.data;
});
const prettyDate = (input: string) => {
  const date = new Date(input);
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : input;
};
</script>

<template>
  <section v-if="view === 'entry'" class="entry-inspector" aria-label="Entry inspector">
    <div class="section-heading">
      <h2 tabindex="-1">Entry inspector</h2>
      <span class="eyebrow">Stored & readable</span>
    </div>
    <template v-if="entry">
      <dl class="compact-facts">
        <div>
          <dt>Entry</dt>
          <dd class="mono" :title="entry.id">{{ short(entry.id, 22) }}</dd>
        </div>
        <div>
          <dt>Kind</dt>
          <dd>{{ entry.subject.kind }}</dd>
        </div>
      </dl>
      <div class="code-heading readable-heading">
        <h3>{{ encrypted ? "Readable event" : "Recorded payload" }}</h3>
        <span class="status-dot" :class="{ muted: encrypted && replayed?.status !== 'readable' }">{{
          replayed?.status === "readable"
            ? "Decrypted locally"
            : encrypted
              ? "Encrypted"
              : "Stored JSON"
        }}</span>
      </div>
      <pre class="code-block readable-code" tabindex="0">{{ format(readable) }}</pre>
      <div class="code-heading stored-heading">
        <h3>Stored entry</h3>
        <span class="eyebrow">Exact signed record</span>
      </div>
      <pre class="code-block stored-code" tabindex="0">{{ format(entry) }}</pre>
    </template>
    <div v-else class="inspector-empty">
      <span class="empty-symbol" aria-hidden="true">{ }</span>
      <p>No entry selected.</p>
      <p class="muted small">
        Select an entry, or open the source to inspect the original document.
      </p>
    </div>
    <div class="inspector-footnote">
      <p>
        {{
          encrypted
            ? "Encrypted content remains protected; stored metadata is public."
            : "Recorded payloads are shown as stored. Integrity does not establish application semantics."
        }}
      </p>
    </div>
  </section>

  <section v-else-if="view === 'history'" class="document-panel">
    <div class="panel-heading">
      <div>
        <h2>Signed history</h2>
      </div>
      <span class="pill" :class="{ warning: report.integrity !== 'valid' }">{{
        report.integrity === "valid" ? "Verified history" : "Untrusted inspection"
      }}</span>
    </div>
    <div class="history-grid">
      <ol class="history-list">
        <li v-for="(item, index) in visibleHistory" :key="item.id">
          <button
            class="history-row"
            :class="{ selected: commit?.id === item.id }"
            @click="emit('select-commit', item.id)"
          >
            <span class="history-number">{{
              String(inspection.history.length - visibleHistory.length + index + 1).padStart(2, "0")
            }}</span
            ><span
              ><strong>{{ short(item.subject.signer.id) }}</strong
              ><span class="mono small">{{ short(item.id, 18) }}</span></span
            ><span class="history-time"
              >{{ prettyDate(item.subject.committedAt)
              }}<small
                >{{ item.subject.entryIds.length }}
                {{ item.subject.entryIds.length === 1 ? "entry" : "entries" }}</small
              ></span
            >
          </button>
        </li>
        <li v-if="inspection.history.length > historyLimit">
          <button class="text-button" @click="historyLimit += 100">Show older commits</button>
        </li>
      </ol>
      <div v-if="commit" class="commit-detail">
        <div class="section-heading">
          <h3>Commit record</h3>
          <span class="eyebrow">{{ commit.subject.entryIds.length }} entries</span>
        </div>
        <pre class="code-block" tabindex="0">{{ format(commit) }}</pre>
        <h3 class="spaced-heading">Included entries</h3>
        <button
          v-for="id in commit.subject.entryIds.slice(0, entryLimit)"
          :key="id"
          class="entry-link mono"
          :disabled="busy"
          @click="emit('select-entry', id)"
        >
          {{ short(id, 28) }} <span aria-hidden="true">↗</span>
        </button>
        <button
          v-if="commit.subject.entryIds.length > entryLimit"
          class="text-button"
          @click="entryLimit += 100"
        >
          Show more entries
        </button>
      </div>
      <div v-else class="empty-state">
        <h3>No history available</h3>
        <p>Open the source and verification views to inspect this input.</p>
      </div>
    </div>
  </section>

  <section v-else-if="view === 'json'" class="document-panel">
    <div class="panel-heading">
      <div>
        <h2>Original source</h2>
      </div>
      <button class="button subtle" :disabled="busy" @click="emit('copy')">Copy JSON</button>
    </div>
    <p class="muted panel-description">Original source. Inspection never rewrites your file.</p>
    <label class="sr-only" for="raw-json">Original document source</label
    ><textarea id="raw-json" class="raw-editor" :value="raw" readonly spellcheck="false"></textarea>
  </section>

  <section v-else class="document-panel">
    <div class="panel-heading">
      <div>
        <h2>Verification</h2>
      </div>
      <button class="button subtle" :disabled="busy" @click="emit('verify')">
        Recheck <span aria-hidden="true">↻</span>
      </button>
    </div>
    <div class="verification-banner" :class="{ invalid: report.integrity !== 'valid' }">
      <span class="verification-mark" aria-hidden="true">{{
        report.integrity === "valid" ? "✓" : "!"
      }}</span>
      <div>
        <h3>
          {{
            report.integrity === "valid"
              ? "Signed history verified"
              : "History verification did not pass"
          }}
        </h3>
        <p>
          {{
            report.integrity === "valid"
              ? "Read access and replay are checked separately below."
              : "These records are inspection evidence. See the findings below."
          }}
        </p>
      </div>
    </div>
    <p v-if="inspection.interpretationError" class="panel-description muted">
      Concord inspection unavailable: {{ inspection.interpretationError }}
    </p>
    <dl class="verification-list">
      <div>
        <dt>History integrity</dt>
        <dd>{{ report.integrity }}</dd>
      </div>
      <div v-if="runtime">
        <dt>Concord structure</dt>
        <dd>{{ runtime.verification.integrity }}</dd>
      </div>
      <div>
        <dt>System replay</dt>
        <dd>{{ runtime?.system ?? "not-run" }}</dd>
      </div>
      <div>
        <dt>Application replay</dt>
        <dd>{{ runtime?.application ?? "not-run" }}</dd>
      </div>
      <div>
        <dt>Encrypted events without a key</dt>
        <dd>{{ runtime?.lockedEntries ?? "Not evaluated" }}</dd>
      </div>
      <div>
        <dt>Freshness</dt>
        <dd>{{ runtime?.freshness ?? "unanchored" }}</dd>
      </div>
      <div>
        <dt>Other recipients’ decryptability</dt>
        <dd>{{ runtime?.otherRecipientsDecryptability ?? "unverified" }}</dd>
      </div>
      <div>
        <dt>Checked commits / entries</dt>
        <dd>{{ report.checkedCommits }} / {{ report.checkedEntries }}</dd>
      </div>
    </dl>
    <details class="verification-help">
      <summary>What does verification prove?</summary>
      <p>
        Signatures are checked against the public keys in the file; they do not establish who you
        should trust. “Readable” replay covers the events this identity can decrypt. A valid file
        alone does not prove it is the newest copy. Other recipients’ ability to decrypt is not
        proved by this reader.
      </p>
    </details>
    <div v-if="findings.length" class="findings">
      <h3>Findings</h3>
      <pre v-for="(finding, index) in findings" :key="index" class="code-block" tabindex="0">{{
        format(finding)
      }}</pre>
    </div>
    <p v-else class="no-findings"><span aria-hidden="true">✓</span> No verification findings.</p>
  </section>
</template>
