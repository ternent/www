<script setup lang="ts">
import { computed } from "vue";
import type { NotesSession } from "./session";
import { short } from "./session";

const props = defineProps<{
  session: NotesSession;
  revision: number;
  view: "entry" | "history" | "json" | "verification";
  entryId: string | null;
  commitId: string | null;
  raw: string;
  busy: boolean;
  blocked?: boolean;
}>();
const emit = defineEmits<{
  "update:raw": [value: string];
  "select-entry": [id: string];
  "select-commit": [id: string];
  apply: [];
  tamper: [];
  restore: [];
  verify: [];
  copy: [];
}>();
const inspection = computed(() => ({
  revision: props.revision,
  report: props.session.handle.inspect(),
  snapshot: props.session.snapshot,
}));
const report = computed(() => inspection.value.report);
const snapshot = computed(() => inspection.value.snapshot);
const entry = computed(() => snapshot.value?.entries.find((item) => item.id === props.entryId));
const replayed = computed(() =>
  report.value.entries?.find((item) => item.entryId === props.entryId),
);
const commit = computed(
  () =>
    report.value.history.find((item) => item.id === props.commitId) ?? report.value.history.at(-1),
);
const format = (input: unknown) => JSON.stringify(input, null, 2);
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
      <h2>Entry inspector</h2>
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
        <h3>Readable event</h3>
        <span
          class="status-dot"
          :class="{ muted: entry.subject.kind !== 'system' && replayed?.status !== 'readable' }"
          >{{
            entry.subject.kind === "system"
              ? "Public metadata"
              : replayed?.status === "readable"
                ? "Decrypted locally"
                : "No decryption key"
          }}</span
        >
      </div>
      <pre class="code-block readable-code" tabindex="0">{{
        entry.subject.kind === "system"
          ? format(entry.subject.payload)
          : replayed?.status === "readable"
            ? format(replayed.event)
            : "The event is encrypted. This identity has no readable payload for it."
      }}</pre>
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
        Select a note, or open Stored JSON to inspect encrypted records and public metadata.
      </p>
    </div>
    <div class="inspector-footnote">
      <p>Titles and content are encrypted. System metadata is public.</p>
    </div>
  </section>

  <section v-else-if="view === 'history'" class="document-panel">
    <div class="panel-heading">
      <div>
        <h2>Signed history</h2>
      </div>
      <span class="pill" :class="{ warning: report.verification.integrity !== 'valid' }">{{
        report.verification.integrity === "valid" ? "Verified history" : "Untrusted inspection"
      }}</span>
    </div>
    <div class="history-grid">
      <ol class="history-list">
        <li v-for="(item, index) in report.history" :key="item.id">
          <button
            class="history-row"
            :class="{ selected: commit?.id === item.id }"
            @click="emit('select-commit', item.id)"
          >
            <span class="history-number">{{ String(index + 1).padStart(2, "0") }}</span
            ><span
              ><strong>{{ session.actorName(item.subject.signer.id) }}</strong
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
      </ol>
      <div v-if="commit" class="commit-detail">
        <div class="section-heading">
          <h3>Commit record</h3>
          <span class="eyebrow">{{ commit.subject.entryIds.length }} entries</span>
        </div>
        <pre class="code-block" tabindex="0">{{ format(commit) }}</pre>
        <h3 class="spaced-heading">Included entries</h3>
        <button
          v-for="id in commit.subject.entryIds"
          :key="id"
          class="entry-link mono"
          :disabled="busy || blocked"
          @click="emit('select-entry', id)"
        >
          {{ short(id, 28) }} <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div v-else class="empty-state">
        <h3>No history available</h3>
        <p>Open Stored JSON and Verification to inspect this input.</p>
      </div>
    </div>
  </section>

  <section v-else-if="view === 'json'" class="document-panel">
    <div class="panel-heading">
      <div>
        <h2>Stored JSON</h2>
      </div>
      <button class="button subtle" :disabled="busy" @click="emit('copy')">Copy JSON</button>
    </div>
    <p class="muted panel-description">The exported file. Edit it to test verification.</p>
    <label class="sr-only" for="raw-json">Document JSON editor</label
    ><textarea
      id="raw-json"
      class="raw-editor"
      :value="raw"
      spellcheck="false"
      @input="emit('update:raw', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>
    <div class="raw-actions">
      <button
        class="button primary"
        :disabled="busy || blocked || !!session.handle.draft()"
        @click="emit('apply')"
      >
        Apply & verify</button
      ><button
        class="button subtle danger"
        :disabled="
          busy || blocked || !!session.handle.draft() || report.verification.integrity !== 'valid'
        "
        @click="emit('tamper')"
      >
        Alter last signature</button
      ><button
        v-if="session.canRestore"
        class="text-button"
        :disabled="busy || blocked"
        @click="emit('restore')"
      >
        Restore previous document
      </button>
    </div>
    <p class="small muted">
      Applying replaces this document. Restore keeps one previous version in memory. Staged changes
      are excluded.
    </p>
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
    <div
      class="verification-banner"
      :class="{ invalid: report.verification.integrity !== 'valid' }"
    >
      <span class="verification-mark" aria-hidden="true">{{
        report.verification.integrity === "valid" ? "✓" : "!"
      }}</span>
      <div>
        <h3>
          {{
            report.verification.integrity === "valid"
              ? "Signed history verified"
              : "No trusted application state"
          }}
        </h3>
        <p>
          {{
            report.verification.integrity === "valid"
              ? "Read access and replay are checked separately below."
              : "Inspect or export this file. Trusted replay and writes are unavailable."
          }}
        </p>
      </div>
    </div>
    <dl class="verification-list">
      <div>
        <dt>History integrity</dt>
        <dd>{{ report.verification.integrity }}</dd>
      </div>
      <div>
        <dt>System replay</dt>
        <dd>{{ report.system }}</dd>
      </div>
      <div>
        <dt>Application replay</dt>
        <dd>{{ report.application }}</dd>
      </div>
      <div>
        <dt>Encrypted events without a key</dt>
        <dd>{{ report.lockedEntries ?? "Not evaluated" }}</dd>
      </div>
      <div>
        <dt>Freshness</dt>
        <dd>{{ report.freshness }}</dd>
      </div>
      <div>
        <dt>Other recipients’ decryptability</dt>
        <dd>{{ report.otherRecipientsDecryptability }}</dd>
      </div>
      <div>
        <dt>Checked commits / entries</dt>
        <dd>{{ report.verification.checkedCommits }} / {{ report.verification.checkedEntries }}</dd>
      </div>
    </dl>
    <details class="verification-help">
      <summary>What does verification prove?</summary>
      <p>
        “Readable” replay covers the events this identity can decrypt. A valid file alone does not
        prove it is the newest copy. Other recipients’ ability to decrypt is not proved by this
        reader.
      </p>
    </details>
    <div v-if="report.findings.length" class="findings">
      <h3>Findings</h3>
      <pre
        v-for="(finding, index) in report.findings"
        :key="index"
        class="code-block"
        tabindex="0"
        >{{ format(finding) }}</pre>
    </div>
    <p v-else class="no-findings"><span aria-hidden="true">✓</span> No verification findings.</p>
    <div class="raw-actions">
      <button
        class="button subtle danger"
        :disabled="
          busy || blocked || !!session.handle.draft() || report.verification.integrity !== 'valid'
        "
        @click="emit('tamper')"
      >
        Try changing a signature</button
      ><button
        v-if="session.canRestore"
        class="button primary"
        :disabled="busy || blocked"
        @click="emit('restore')"
      >
        Restore previous document
      </button>
    </div>
  </section>
</template>
