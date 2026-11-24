<script setup lang="ts">
import "./workbench.css";
import "./inspector.css";
import { computed, nextTick, onActivated, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { inspectDocument, MAX_FILE_BYTES, type OpenedDocument } from "./document";
import InspectorPanel from "./InspectorPanel.vue";
import JsonBrowser from "./JsonBrowser.vue";
import { short } from "./types";
import {
  applyInspectionContext,
  takeInspection,
  type InspectionContext,
  type InspectionInput,
} from "./handoff";

const props = defineProps<{
  loadExample?: () => Promise<InspectionInput>;
  exampleLabel?: string;
}>();
let focusEntries: Record<string, string> = {};
let loadingExample: Promise<void> | undefined;
const isCurrentContext = () =>
  /^\/inspect(?:\/|$)/.test(route.path) && !!route.query.example === !!props.loadExample;
const viewLocation = (path: string) => ({
  path,
  query: props.loadExample
    ? {
        example: route.query.example,
        ...(typeof route.query.focus === "string" ? { focus: route.query.focus } : {}),
      }
    : {},
});
function applyFocus() {
  if (!isCurrentContext()) return;
  const focus = typeof route.query.focus === "string" ? route.query.focus : "";
  if (Object.hasOwn(focusEntries, focus)) entryId.value = focusEntries[focus]!;
  if (props.loadExample && focus === "latest-commit")
    commitId.value = inspection.value?.history.at(-1)?.id ?? null;
}

type View = "overview" | "entries" | "history" | "json" | "verification";
const route = useRoute();
const router = useRouter();
const opened = shallowRef<OpenedDocument | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const chooseFile = ref<HTMLButtonElement | null>(null);
const documentTitle = ref<HTMLElement | null>(null);
const root = ref<HTMLElement | null>(null);
const busy = ref(false);
const error = ref("");
const notice = ref("");
const pasted = ref("");
const dragDepth = ref(0);
const entryId = ref<string | null>(null);
const commitId = ref<string | null>(null);
const search = ref("");
const entryLimit = ref(100);
let request = 0;
const view = computed(() => (route.meta.inspectorView as View) ?? "overview");
const panelView = computed<"entry" | "history" | "json" | "verification">(() =>
  view.value === "history"
    ? "history"
    : view.value === "json"
      ? "json"
      : view.value === "verification"
        ? "verification"
        : "entry",
);
const inspection = computed(() => opened.value?.inspection ?? null);
const report = computed(() => inspection.value?.verification);
const status = computed(() =>
  !opened.value?.parsed.ok
    ? "Invalid JSON"
    : !report.value
      ? "JSON · no signature verification"
      : report.value.integrity === "valid"
        ? "Signed history verified"
        : report.value.integrity === "unsupported"
          ? "Unsupported format or suite"
          : "History verification failed",
);
const tabs = computed(() => [
  { id: "overview", label: "Overview", path: "/inspect" },
  ...(inspection.value
    ? [
        { id: "entries", label: "Entries", path: "/inspect/entries" },
        { id: "history", label: "History", path: "/inspect/history" },
      ]
    : []),
  { id: "json", label: "Source", path: "/inspect/json" },
  { id: "verification", label: "Verification", path: "/inspect/verification" },
]);
const entries = computed(() => {
  const term = search.value.trim().toLowerCase();
  return (inspection.value?.snapshot?.entries ?? []).filter(
    (entry) =>
      !term ||
      `${entry.id} ${entry.subject.kind} ${entry.subject.author}`.toLowerCase().includes(term),
  );
});
const size = computed(() => {
  const bytes = opened.value?.bytes.byteLength ?? 0;
  return bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
});

async function open(input: File | string | Uint8Array, options?: Omit<InspectionInput, "bytes">) {
  const current = ++request;
  const wasEmpty = !opened.value;
  busy.value = true;
  error.value = "";
  try {
    if (typeof input !== "string" && !(input instanceof Uint8Array) && input.size > MAX_FILE_BYTES)
      throw new Error("Choose a JSON file no larger than 16 MiB.");
    const bytes =
      typeof input === "string"
        ? new TextEncoder().encode(input)
        : input instanceof Uint8Array
          ? new Uint8Array(input)
          : new Uint8Array(await input.arrayBuffer());
    const candidate = await inspectDocument(
      bytes,
      options?.name ??
        (typeof input === "string"
          ? "pasted-document.json"
          : input instanceof Uint8Array
            ? "document.json"
            : input.name),
    );
    applyInspectionContext(candidate, options?.context);
    if (current !== request) return;
    opened.value = candidate;
    focusEntries = options?.focusEntries ?? {};
    entryId.value =
      candidate.inspection?.snapshot?.entries.find((entry) => entry.id === options?.entryId)?.id ??
      candidate.inspection?.snapshot?.entries[0]?.id ??
      null;
    applyFocus();
    commitId.value = candidate.inspection?.history.at(-1)?.id ?? null;
    search.value = "";
    entryLimit.value = 100;
    pasted.value = "";
    notice.value = "Opened locally. Your original file is unchanged.";
    await nextTick();
    if (wasEmpty && current === request && /^\/inspect(?:\/|$)/.test(route.path))
      documentTitle.value?.focus();
  } catch (cause) {
    if (current === request)
      error.value = cause instanceof Error ? cause.message : "Could not open this file.";
  } finally {
    if (current === request) busy.value = false;
  }
}
async function prepareExample() {
  if (!props.loadExample || opened.value || loadingExample) return loadingExample;
  loadingExample = (async () => {
    busy.value = true;
    error.value = "";
    try {
      const input = await props.loadExample!();
      await open(input.bytes, input);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "Could not prepare the example.";
    } finally {
      busy.value = false;
      loadingExample = undefined;
    }
  })();
  return loadingExample;
}
function acceptHandoff() {
  if (!isCurrentContext()) return;
  if (props.loadExample) {
    void prepareExample();
    applyFocus();
    return;
  }
  const next = takeInspection();
  if (next) void open(next.bytes, next);
}
watch(() => [route.query.example, route.query.focus], applyFocus);
onMounted(acceptHandoff);
onActivated(acceptHandoff);
function fileChanged(event: Event) {
  if (props.loadExample) return;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void open(file);
  input.value = "";
}
function drop(event: DragEvent) {
  dragDepth.value = 0;
  if (props.loadExample) {
    error.value = "Switch to Your files to open your own document.";
    return;
  }
  const files = event.dataTransfer?.files;
  if (!files?.length) return;
  if (files.length !== 1) {
    error.value = "Drop one JSON file at a time.";
    return;
  }
  void open(files[0]!);
}
function enter(event: DragEvent) {
  if (event.dataTransfer?.types.includes("Files")) dragDepth.value++;
}
async function close() {
  if (props.loadExample) {
    await router.push("/inspect");
    return;
  }
  request++;
  opened.value = null;
  busy.value = false;
  error.value = "";
  pasted.value = "";
  notice.value = "Document cleared from this inspector.";
  await router.replace("/inspect");
  await nextTick();
  chooseFile.value?.focus();
}
function clearFocus() {
  if (props.loadExample && route.query.focus)
    void router.replace({ path: route.path, query: { example: route.query.example } });
}
function selectListedEntry(id: string) {
  entryId.value = id;
  clearFocus();
}
function selectCommit(id: string) {
  commitId.value = id;
  clearFocus();
}
async function selectEntry(id: string) {
  entryId.value = id;
  search.value = "";
  entryLimit.value = Math.max(
    100,
    (inspection.value?.snapshot?.entries.findIndex((entry) => entry.id === id) ?? 0) + 1,
  );
  await router.push({
    path: "/inspect/entries",
    query: props.loadExample ? { example: route.query.example } : {},
  });
  await nextTick();
  root.value?.querySelector<HTMLElement>(".entry-inspector h2")?.focus();
}
async function copy() {
  try {
    await navigator.clipboard.writeText(opened.value!.source);
    notice.value = "Original source copied.";
    error.value = "";
  } catch {
    error.value = "Clipboard unavailable. You can select the source or download the original file.";
  }
}
function download() {
  if (!opened.value) return;
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(opened.value.bytes)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = opened.value.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function recheck() {
  const document = opened.value;
  if (!document || busy.value) return;
  const current = ++request;
  busy.value = true;
  try {
    const candidate = await inspectDocument(document.bytes, document.name);
    if (document.contextLabel && document.inspection?.concord)
      applyInspectionContext(candidate, {
        label: document.contextLabel,
        report: document.inspection.concord,
      });
    if (current === request) {
      opened.value = candidate;
      notice.value = "Verification completed against the original bytes.";
    }
  } catch (cause) {
    if (current === request)
      error.value = cause instanceof Error ? cause.message : "Verification failed to run.";
  } finally {
    if (current === request) busy.value = false;
  }
}
</script>

<template>
  <div
    ref="root"
    class="document-workbench inspector-workbench"
    :class="{ 'has-document': !!opened }"
    :aria-busy="busy"
    @dragenter.prevent="enter"
    @dragover.prevent
    @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)"
    @drop.prevent="drop"
  >
    <input
      ref="fileInput"
      class="sr-only"
      type="file"
      tabindex="-1"
      accept=".json,application/json"
      aria-label="Open a JSON document"
      @change="fileChanged"
    />
    <div v-if="dragDepth" class="drop-overlay">
      <span aria-hidden="true">↓</span><strong>Drop to inspect</strong
      ><span>Your file stays in this browser tab.</span>
    </div>
    <div v-if="exampleLabel" class="example-banner">
      <span>{{ exampleLabel }} · generated in this tab</span>
      <RouterLink to="/inspect">Your files ↗</RouterLink>
    </div>
    <section v-if="loadExample && !opened" class="inspector-welcome example-loading">
      <h2>Preparing the example</h2>
      <p :role="error ? 'alert' : 'status'">
        {{ error || "Generating a signed, encrypted document locally…" }}
      </p>
      <button v-if="error" class="button subtle" @click="prepareExample()">Try again</button>
    </section>
    <section v-else-if="!opened" class="inspector-welcome">
      <div class="file-drop">
        <div class="file-glyph" aria-hidden="true">{ }</div>
        <h2>Drop a JSON file.</h2>
        <button
          ref="chooseFile"
          class="button primary"
          :disabled="busy"
          @click="fileInput?.click()"
        >
          {{ busy ? "Opening…" : "Choose a file" }} <span aria-hidden="true">↗</span>
        </button>
        <span class="file-limit">UTF-8 JSON · up to 16 MiB · processed locally</span>
      </div>
      <details class="paste-json">
        <summary>Or paste JSON</summary>
        <label class="sr-only" for="pasted-json">JSON to inspect</label
        ><textarea
          id="pasted-json"
          v-model="pasted"
          spellcheck="false"
          placeholder='{"hello": "world"}'
        ></textarea
        ><button class="button subtle" :disabled="busy || !pasted.trim()" @click="open(pasted)">
          Inspect JSON
        </button>
      </details>
      <p class="welcome-footnote">
        Files stay in memory until you close them or reload.
        <RouterLink to="/examples">Try an example ↗</RouterLink>
      </p>
      <p v-if="error" class="file-error" role="alert">{{ error }}</p>
      <p v-else-if="busy || notice" class="small muted" role="status">
        {{ busy ? "Reading and checking your document…" : notice }}
      </p>
    </section>

    <template v-else>
      <section class="main" aria-label="Document inspection">
        <div class="intro">
          <div class="document-title file-summary">
            <span class="document-glyph" aria-hidden="true">{ }</span>
            <div>
              <h2 ref="documentTitle" tabindex="-1" :title="opened.name">{{ opened.name }}</h2>
              <span class="small muted"
                >{{ size }} ·
                {{
                  opened.kind === "concord"
                    ? "Concord document"
                    : opened.kind === "ledger"
                      ? "Ledger document"
                      : "JSON document"
                }}</span
              >
            </div>
          </div>
          <div class="document-actions">
            <button
              v-if="!loadExample"
              class="button subtle"
              :disabled="busy"
              @click="fileInput?.click()"
            >
              Open file</button
            ><button
              class="button subtle download-original"
              aria-label="Download original file"
              title="Download original file"
              @click="download"
            >
              <span class="download-label">Download original</span
              ><span aria-hidden="true">↗</span></button
            ><button
              class="close-document"
              :aria-label="loadExample ? 'Return to your files' : 'Close document'"
              :title="loadExample ? 'Return to your files' : 'Close document'"
              @click="close"
            >
              ×
            </button>
          </div>
        </div>
        <div class="view-bar">
          <nav aria-label="Inspector views">
            <RouterLink
              v-for="tab in tabs"
              :key="tab.id"
              :to="viewLocation(tab.path)"
              :class="{ active: view === tab.id }"
              :aria-current="view === tab.id ? 'page' : undefined"
              >{{ tab.label }}</RouterLink
            >
          </nav>
          <span class="viewer-caption">{{
            opened.contextLabel ?? "Read-only · public inspection"
          }}</span>
        </div>

        <section v-if="view === 'overview'" class="inspection-overview">
          <div
            class="inspection-summary"
            :class="{ failed: !opened.parsed.ok || (report && report.integrity !== 'valid') }"
          >
            <span class="summary-mark" aria-hidden="true">{{
              report?.integrity === "valid"
                ? "✓"
                : !opened.parsed.ok || report?.integrity === "invalid"
                  ? "!"
                  : "{ }"
            }}</span>
            <div>
              <h2>{{ status }}</h2>
              <p>
                {{
                  report
                    ? "Signatures, hashes and history structure. Application semantics are evaluated separately."
                    : opened.parsed.ok
                      ? "Browse this JSON below. No supported signed container was detected."
                      : opened.parsed.error
                }}
              </p>
            </div>
            <RouterLink v-if="report" :to="viewLocation('/inspect/verification')"
              >View checks ↗</RouterLink
            >
          </div>
          <section v-if="report" class="document-details" aria-label="Document information">
            <h2>File details</h2>
            <dl class="file-facts">
              <div>
                <dt>Document ID</dt>
                <dd class="mono">{{ report.documentId ?? "Unavailable" }}</dd>
              </div>
              <div>
                <dt>Head</dt>
                <dd class="mono">{{ report.head ?? "Unavailable" }}</dd>
              </div>
              <div>
                <dt>Commits checked</dt>
                <dd>{{ report.checkedCommits }}</dd>
              </div>
              <div>
                <dt>Entries checked</dt>
                <dd>{{ report.checkedEntries }}</dd>
              </div>
            </dl>
            <div v-if="inspection?.concord?.requirements.length" class="file-models">
              <h3>Unavailable requirements</h3>
              <div v-for="item in inspection.concord.requirements" :key="item.kind">
                <span>{{ item.kind }}</span><code>{{ item.ref.id }} · {{ item.ref.version }}</code>
              </div>
            </div>
          </section>
          <JsonBrowser v-if="opened.parsed.ok" :value="opened.parsed.value" />
          <div v-else class="invalid-json">
            <p>The original source is still available for inspection.</p>
            <RouterLink class="button subtle" :to="viewLocation('/inspect/json')"
              >Open source</RouterLink
            >
          </div>
          <details class="demo-help inspection-help">
            <summary>About inspection <span aria-hidden="true">?</span></summary>
            <p>
              Verification uses public keys in the file. It checks signed history, not who you
              should trust or whether this is the newest copy.
            </p>
            <p>
              Opening a file never loads an application model, system implementation or private key
              from its contents. Concord declarations and public records stay inspectable. Encrypted
              contents stay protected.
            </p>
            <p v-if="opened.contextLabel">
              This snapshot includes the selected example reader's inspection. Opening a file
              separately uses public inspection and does not import that context.
            </p>
            <p v-if="loadExample">
              This generated example stays in memory until you reload. Your own file is kept
              separately.
            </p>
            <p v-else>
              Your file stays in this tab, including when switching tools. Close it or reload to
              clear it.
            </p>
          </details>
        </section>

        <div v-else-if="view === 'entries' && inspection" class="inspection-entries">
          <section class="notes-panel" aria-label="Stored entries">
            <div class="panel-heading">
              <h2>Entries</h2>
              <span class="small muted">{{ entries.length }}</span>
            </div>
            <label class="sr-only" for="entry-search">Filter entries</label
            ><input
              id="entry-search"
              v-model="search"
              class="entry-search"
              placeholder="Find ID, kind or author…"
              @input="entryLimit = 100"
            />
            <div class="entry-list">
              <button
                v-for="entry in entries.slice(0, entryLimit)"
                :key="entry.id"
                class="entry-row"
                :class="{ selected: entryId === entry.id }"
                @click="selectListedEntry(entry.id)"
              >
                <span class="entry-copy"
                  ><strong>{{ entry.subject.kind }}</strong
                  ><span class="mono">{{ short(entry.id, 20) }}</span
                  ><span>{{ short(entry.subject.author, 18) }}</span></span
                >
              </button>
            </div>
            <button
              v-if="entries.length > entryLimit"
              class="text-button"
              @click="entryLimit += 100"
            >
              Show more entries
            </button>
            <p v-if="!entries.length" class="empty-state">
              No structured entries available. The full input is available in Overview and Source.
            </p>
          </section>
          <InspectorPanel
            :inspection="inspection"
            view="entry"
            :entry-id="entryId"
            :commit-id="commitId"
            :raw="opened.source"
            :busy="busy"
          />
        </div>

        <InspectorPanel
          v-else-if="inspection"
          :inspection="inspection"
          :view="panelView"
          :entry-id="entryId"
          :commit-id="commitId"
          :raw="opened.source"
          :busy="busy"
          @select-entry="selectEntry"
          @select-commit="selectCommit"
          @copy="copy"
          @verify="recheck"
        />

        <section v-else-if="view === 'json'" class="document-panel">
          <div class="panel-heading">
            <h2>Original source</h2>
            <button class="button subtle" @click="copy">Copy source</button>
          </div>
          <label class="sr-only" for="document-source">Original document source</label
          ><textarea
            id="document-source"
            class="raw-editor"
            :value="opened.source"
            readonly
            spellcheck="false"
          ></textarea>
          <p class="small muted">Exact source. Download original preserves the original bytes.</p>
        </section>
        <section v-else class="document-panel unsupported-document">
          <span class="empty-symbol" aria-hidden="true">{ }</span>
          <h2>{{ opened.parsed.ok ? "No verifier for this JSON" : "This is not valid JSON" }}</h2>
          <p>
            {{
              opened.parsed.ok
                ? "You can browse any JSON. Signed history verification supports the current Ledger container, including Concord documents."
                : opened.parsed.error
            }}
          </p>
          <RouterLink class="button subtle" :to="viewLocation('/inspect/json')"
            >Inspect source</RouterLink
          >
        </section>

        <div class="workspace-status">
          <div v-if="error" class="notice error" role="alert">{{ error }}</div>
          <div v-else class="notice" role="status">
            {{ busy ? "Reading and checking…" : notice }}
          </div>
          <div class="status-strip">
            <span
              class="status-label"
              :class="{ warning: report && report.integrity !== 'valid', muted: !report }"
              >{{ status }}</span
            ><span>{{ size }}</span><span>No file upload</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
