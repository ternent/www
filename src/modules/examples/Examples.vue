<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, triggerRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { AudienceId } from "@ternent/concord";
import { actors, NotesSession, short, type ActorId } from "./session";
import type { Note } from "./model";
import { packageVersions } from "@/app/config/packages";
import NoteEditor from "./NoteEditor.vue";
import InspectorPanel from "../inspector/InspectorPanel.vue";
import type { Inspection } from "../inspector/types";

type View = "entries" | "history" | "json" | "verification";
const route = useRoute();
const router = useRouter();
const app = shallowRef<NotesSession | null>(null);
const busy = ref(true);
const editorDirty = ref(false);
const notice = ref("Generating demo identities and a signed document…");
const isError = ref(false);
const view = ref<View>((route.meta.examplesView as View) ?? "entries");
watch(
  () => route.path,
  () => {
    if (route.path !== "/examples" && !route.path.startsWith("/examples/")) return;
    view.value = (route.meta.examplesView as View) ?? "entries";
  },
);
watch(view, (next) => {
  if (route.path !== "/examples" && !route.path.startsWith("/examples/")) return;
  const path = next === "entries" ? "/examples" : `/examples/${next}`;
  if (route.path !== path) void router.push(path);
});
const audience = ref<AudienceId>("document");
const selectedNoteId = ref<string | null>("welcome");
const selectedEntryId = ref<string | null>(null);
const selectedCommitId = ref<string | null>(null);
const rawEditor = ref("");
const upload = ref<HTMLInputElement | null>(null);
const views = [
  { id: "entries", label: "Entries" },
  { id: "history", label: "History" },
  { id: "json", label: "Stored JSON" },
  { id: "verification", label: "Verification" },
] as const;
const report = computed(() => {
  return app.value?.handle.inspect();
});
const inspection = computed<Inspection | null>(() =>
  app.value && report.value
    ? {
        verification: report.value.verification,
        history: report.value.history,
        snapshot: app.value.snapshot,
        concord: report.value,
      }
    : null,
);
const state = computed(() => {
  return app.value?.handle.state();
});
const draft = computed(() => {
  return app.value?.handle.draft();
});
const projection = computed(
  () => draft.value?.preview ?? (state.value?.status === "ready" ? state.value.projection : null),
);
const notes = computed(
  () => projection.value?.notes.filter((note) => note.audience === audience.value) ?? [],
);
const selectedNote = computed(
  () => notes.value.find((note) => note.id === selectedNoteId.value) ?? null,
);
const groups = computed(() => report.value?.audiences ?? []);
const writable = computed(() => {
  return app.value?.canWrite(audience.value) ?? false;
});
const lockedInGroup = computed(() => projection.value?.locked[audience.value] ?? 0);
const currentActor = computed(() => actors.find((actor) => actor.id === app.value?.reader));
const canGrant = computed(() => {
  const capabilities = app.value?.capabilities(audience.value) ?? [];
  return capabilities.includes("grant") || capabilities.includes("administer");
});
const bobIsMember = computed(
  () =>
    groups.value
      .find((group) => group.audience === audience.value)
      ?.members.some((member) => member.identity.id === app.value?.publicIdentity("bob")?.id) ??
    false,
);
const committedJson = computed(() => {
  return app.value?.json ?? "";
});
watch(committedJson, (json) => {
  try {
    rawEditor.value = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    rawEditor.value = json;
  }
});

function updateSelection() {
  const note = selectedNote.value;
  const entry =
    note &&
    report.value?.entries
      ?.filter(
        (item) =>
          item.status === "readable" &&
          (item.event.data as { id?: string; audience?: string })?.id === note.id &&
          (item.event.data as { audience?: string })?.audience === note.audience,
      )
      .at(-1);
  selectedEntryId.value = entry?.entryId ?? null;
}
watch([selectedNoteId, audience, committedJson, () => app.value?.reader], updateSelection);
async function run(operation: () => Promise<unknown>, message: string) {
  if (busy.value) return;
  busy.value = true;
  isError.value = false;
  try {
    await operation();
    notice.value = message;
  } catch (cause) {
    isError.value = true;
    notice.value = cause instanceof Error ? cause.message : "The operation failed.";
  } finally {
    triggerRef(app);
    busy.value = false;
  }
}
async function start() {
  busy.value = true;
  try {
    app.value = await NotesSession.create();
    audience.value = "document";
    selectedNoteId.value = "welcome";
    selectedEntryId.value = null;
    notice.value = "Ready. Try a different reader to explore access.";
    isError.value = false;
  } catch (cause) {
    notice.value = cause instanceof Error ? cause.message : "Could not create the demo.";
    isError.value = true;
  } finally {
    triggerRef(app);
    busy.value = false;
  }
}
onMounted(start);
function selectGroup(id: AudienceId) {
  audience.value = id;
  selectedNoteId.value = projection.value?.notes.find((note) => note.audience === id)?.id ?? null;
  view.value = "entries";
}
async function selectEntry(id: string) {
  selectedEntryId.value = id;
  const entry = report.value?.entries?.find((item) => item.entryId === id);
  if (entry?.status === "readable") {
    const data = entry.event.data as { id?: string; audience?: AudienceId };
    if (data.id && data.audience) {
      audience.value = data.audience;
      selectedNoteId.value = data.id;
    }
  }
  view.value = "entries";
  await nextTick();
  selectedEntryId.value = id;
}
function switchReader(reader: ActorId) {
  void run(
    () => app.value!.switchReader(reader),
    `Reading as ${actors.find((actor) => actor.id === reader)!.name}. The stored document is unchanged.`,
  );
}
function save(note: Note) {
  void run(
    async () => {
      await app.value!.put(note);
      selectedNoteId.value = note.id;
    },
    app.value!.mode === "draft"
      ? "Change staged in memory. Exported history is unchanged."
      : "Entry encrypted and committed. The signed history has a new head.",
  );
}
function tamper() {
  void run(async () => {
    await app.value!.tamper();
    view.value = "verification";
  }, "The last commit signature was altered. Verification now reports the actual result.");
}
function restore() {
  void run(() => app.value!.restore(), "Previous document restored.");
}
function applyRaw() {
  void run(async () => {
    await app.value!.applyJson(rawEditor.value);
    view.value = "verification";
  }, "Raw input applied. Check integrity and application replay below.");
}
function copyRaw() {
  void run(() => navigator.clipboard.writeText(app.value!.json), "Committed JSON copied.");
}
function exportDocument() {
  if (!app.value) return;
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(app.value.export())], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "concord-document.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice.value = draft.value
    ? "Exported committed history. The staged preview is not in the file."
    : "Exported the committed document. No identity secrets are included.";
  isError.value = false;
}
async function importDocument(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await run(async () => {
    if (file.size > 2 * 1024 * 1024)
      throw new Error("Use a document no larger than 2 MiB in this demo.");
    await app.value!.load(new Uint8Array(await file.arrayBuffer()));
    view.value = "verification";
  }, "File opened with the current demo identity. Check its verification and replay results.");
  input.value = "";
}
function reset() {
  if (
    confirm(
      "Start a fresh demo? This clears the current document, staged edits and all three demo identities from this tab.",
    )
  )
    void start();
}
</script>

<template>
  <div class="concord-examples document-workbench">
    <div v-if="!app" class="loading-state">
      <div class="loading-glyph" aria-hidden="true">{ }</div>
      <h2>Opening your document</h2>
      <p :role="isError ? 'alert' : 'status'">{{ notice }}</p>
      <button v-if="isError" class="button primary" @click="start">Try again</button>
    </div>

    <template v-else>
      <aside class="sidebar" aria-label="Readers and privacy groups">
        <div class="sidebar-section reader-section">
          <h2 class="sidebar-label">Read as</h2>
          <div class="identity-list">
            <button
              v-for="actor in actors"
              :key="actor.id"
              class="identity-button"
              :class="{ active: app.reader === actor.id }"
              :aria-pressed="app.reader === actor.id"
              :disabled="busy || !!draft || editorDirty"
              @click="switchReader(actor.id)"
            >
              <span class="avatar" :class="actor.id">{{ actor.initials }}</span>
              <span class="identity-copy"
                ><strong>{{ actor.name }}</strong
                ><small>{{
                  actor.id === "none" ? "Public view" : short(app.publicIdentity(actor.id)!.id, 12)
                }}</small></span
              >
              <span v-if="app.reader === actor.id" class="identity-check" aria-hidden="true"
                >✓</span
              >
            </button>
          </div>
        </div>

        <div class="sidebar-section groups-section">
          <h2 class="sidebar-label">Privacy groups</h2>
          <button
            v-for="group in groups"
            :key="group.audience"
            class="group-button"
            :class="{ active: audience === group.audience }"
            :aria-pressed="audience === group.audience"
            :disabled="editorDirty && audience !== group.audience"
            @click="selectGroup(group.audience)"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect
                x="4"
                y="8"
                width="12"
                height="9"
                rx="2"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
              />
              <path
                d="M7 8V5a3 3 0 0 1 6 0v3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
              />
            </svg>
            <span>{{ app.groupName(group.audience) }}</span>
          </button>
          <p v-if="!groups.length" class="small muted">No group metadata available.</p>
        </div>

        <div class="sidebar-bottom">
          <div class="document-anchor">
            <span class="sidebar-label">Document</span>
            <span class="mono" :title="report?.verification.documentId ?? ''">{{
              report?.verification.documentId
                ? short(report.verification.documentId, 19)
                : "Unavailable"
            }}</span>
          </div>
          <button class="reset-demo" :disabled="busy" @click="reset">
            <span aria-hidden="true">↻</span> Start fresh
          </button>
          <details class="demo-help">
            <summary>About this example <span aria-hidden="true">?</span></summary>
            <p>One signed file, three demo identities. Switch readers to try different keys.</p>
            <p>
              Keys and drafts stay in this tab. Reloading clears them. Exports contain committed
              history and no private keys.
            </p>
            <p>
              Keep this tab open to decrypt a file you re-import. This simulates several readers in
              one session.
            </p>
            <a :href="`https://www.npmjs.com/package/@ternent/concord/v/${packageVersions.concord}`"
              >Concord {{ packageVersions.concord }} ↗</a
            >
          </details>
          <span class="local-indicator"><span aria-hidden="true"></span> Runs in your browser</span>
        </div>
      </aside>

      <section class="main" aria-label="Example document">
        <div class="intro">
          <div class="document-title">
            <span class="document-glyph" aria-hidden="true">{ }</span>
            <div>
              <h2>Encrypted notes</h2>
              <span class="small muted">Concord · signed, portable history</span>
            </div>
          </div>
          <div class="document-actions">
            <input
              ref="upload"
              class="sr-only"
              tabindex="-1"
              type="file"
              accept="application/json,.json"
              aria-label="Import a Concord document"
              @change="importDocument"
            />
            <button
              class="button subtle"
              :disabled="busy || !!draft || editorDirty"
              @click="upload?.click()"
            >
              <span aria-hidden="true">↓</span> Import
            </button>
            <button class="button primary" :disabled="busy" @click="exportDocument">
              Export <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

        <div class="view-bar">
          <nav aria-label="Document views">
            <RouterLink
              v-for="item in views"
              :key="item.id"
              :to="item.id === 'entries' ? '/examples' : `/examples/${item.id}`"
              :class="{ active: view === item.id }"
              :aria-current="view === item.id ? 'page' : undefined"
              >{{ item.label }}</RouterLink
            >
          </nav>
          <span class="viewer-caption">Reading as <strong>{{ currentActor?.name }}</strong></span>
        </div>

        <div v-if="editorDirty && view !== 'entries'" class="draft-banner">
          <div>
            <strong>Unsubmitted editor text</strong><span>Your edits are waiting in Entries.</span>
          </div>
          <button class="button subtle" @click="view = 'entries'">Back to editor</button>
        </div>
        <div v-if="draft" class="draft-banner">
          <div>
            <strong
              >{{ draft.entryCount }} staged
              {{ draft.entryCount === 1 ? "event" : "events" }}</strong
            ><span>Preview only · not yet in the exported file</span>
          </div>
          <button
            class="button subtle"
            :disabled="busy"
            @click="
              run(() => app!.discard(), 'Staged changes discarded. Committed history is unchanged.')
            "
          >
            Discard
          </button>
          <button
            class="button primary"
            :disabled="busy"
            @click="run(() => app!.commit(), 'Staged events encrypted and committed together.')"
          >
            Commit changes
          </button>
        </div>

        <div v-show="view === 'entries'" class="content-grid">
          <section class="notes-panel" aria-label="Readable entries">
            <div class="panel-heading">
              <div>
                <span class="eyebrow">{{
                  audience === "document" ? "Shared group" : "Independent group"
                }}</span>
                <h2>{{ app.groupName(audience) }}</h2>
              </div>
              <button
                class="new-entry"
                aria-label="New entry"
                :disabled="busy || !writable || editorDirty"
                @click="selectedNoteId = null"
              >
                +
              </button>
            </div>
            <details class="group-access">
              <summary>
                Access
                <span
                  >{{
                    groups.find((group) => group.audience === audience)?.members.length ?? 0
                  }}
                  members</span
                >
              </summary>
              <div class="member-stack">
                <span
                  v-for="member in groups.find((group) => group.audience === audience)?.members"
                  :key="member.identity.id"
                  class="member-pill"
                  :title="`${member.identity.id} · ${member.capabilities.join(', ')}`"
                  >{{ app.actorName(member.identity.id)
                  }}<span class="member-capability">{{
                    member.capabilities.includes("write") ? "write" : "read"
                  }}</span></span
                >
              </div>
              <button
                class="text-button"
                :disabled="busy || !canGrant || !!draft || editorDirty"
                @click="
                  run(
                    () => app!.setBobAccess(audience, !bobIsMember),
                    bobIsMember
                      ? 'Bob removed. Earlier history stays readable; future entries use a new group key.'
                      : 'Bob admitted with read/write access, including this group’s history.',
                  )
                "
              >
                {{ bobIsMember ? "Remove Bob" : "Give Bob access" }}
              </button>
              <p>
                Removal protects future entries. It cannot retract history or keys already shared.
              </p>
            </details>
            <div v-if="notes.length" class="entry-list">
              <button
                v-for="note in notes"
                :key="note.id"
                class="entry-row"
                :disabled="editorDirty && selectedNoteId !== note.id"
                :class="{ selected: selectedNoteId === note.id }"
                @click="selectedNoteId = note.id"
              >
                <span class="entry-copy"
                  ><strong>{{ note.title }}</strong
                  ><span>{{ note.body || "An empty entry." }}</span></span
                >
                <span class="entry-arrow" aria-hidden="true">→</span>
              </button>
            </div>
            <div v-else class="empty-state">
              <span class="empty-symbol" aria-hidden="true">{{ lockedInGroup ? "⊡" : "＋" }}</span>
              <h3>
                {{
                  state?.status !== "ready"
                    ? "Inspection only"
                    : lockedInGroup
                      ? "Encrypted for another reader"
                      : "No entries yet"
                }}
              </h3>
              <p>
                {{
                  state?.status !== "ready"
                    ? "Open Verification to inspect this input."
                    : lockedInGroup
                      ? "This reader has no key for these events."
                      : "Add your first entry with the + button."
                }}
              </p>
            </div>
            <div v-if="lockedInGroup" class="locked-summary">
              <span aria-hidden="true">⊡</span>
              <p>
                <strong
                  >{{ lockedInGroup }} encrypted
                  {{ lockedInGroup === 1 ? "event" : "events" }}</strong
                ><span>May include changes to the same entry.</span>
              </p>
              <button class="text-button" @click="view = 'json'">Inspect ↗</button>
            </div>
          </section>

          <section class="editor-panel" aria-label="Entry editor">
            <NoteEditor
              :key="`${audience}:${selectedNoteId}`"
              :note="selectedNote"
              :audience="audience"
              :writable="writable"
              :busy="busy"
              :draft="app.mode === 'draft'"
              @dirty="editorDirty = $event"
              @save="save"
              @remove="
                (note) =>
                  run(
                    () => app!.remove(note),
                    app!.mode === 'draft'
                      ? 'Removal staged. History unchanged.'
                      : 'Removal committed. Earlier events remain in history.',
                  )
              "
            />
            <div class="authoring-control">
              <label
                ><input
                  type="checkbox"
                  :checked="app.mode === 'immediate'"
                  :disabled="busy || !!draft || editorDirty"
                  @change="
                    run(
                      () =>
                        app!.setMode(
                          ($event.target as HTMLInputElement).checked ? 'immediate' : 'draft',
                        ),
                      'Authoring mode updated.',
                    )
                  "
                />
                Auto-commit</label
              ><span class="small muted">{{
                app.mode === "immediate"
                  ? "Each save signs a commit"
                  : "Stage, then commit together"
              }}</span>
            </div>
          </section>

          <InspectorPanel
            :inspection="inspection!"
            :actor-name="app.actorName.bind(app)"
            editable
            :has-draft="!!draft"
            :can-restore="app.canRestore"
            view="entry"
            :entry-id="selectedEntryId"
            :commit-id="selectedCommitId"
            :blocked="editorDirty"
            :raw="rawEditor"
            :busy="busy"
          />
        </div>

        <InspectorPanel
          v-if="view !== 'entries'"
          :inspection="inspection!"
          :actor-name="app.actorName.bind(app)"
          editable
          :has-draft="!!draft"
          :can-restore="app.canRestore"
          :view="view"
          :entry-id="selectedEntryId"
          :commit-id="selectedCommitId"
          :blocked="editorDirty"
          :raw="rawEditor"
          :busy="busy"
          @update:raw="rawEditor = $event"
          @select-entry="selectEntry"
          @select-commit="selectedCommitId = $event"
          @copy="copyRaw"
          @apply="applyRaw"
          @tamper="tamper"
          @restore="restore"
          @verify="
            run(
              () => app!.handle.verify(),
              'Verification completed against the current committed bytes.',
            )
          "
        />

        <div class="workspace-status">
          <div
            class="notice"
            :class="{ error: isError, working: busy }"
            :role="isError ? 'alert' : 'status'"
            aria-live="polite"
          >
            <span class="notice-symbol" aria-hidden="true">{{
              busy ? "◌" : isError ? "!" : "✓"
            }}</span
            >{{ busy ? "Working locally…" : notice }}
          </div>
          <div class="status-strip">
            <span
              class="status-dot"
              :class="{ warning: report?.verification.integrity !== 'valid' }"
              >{{
                report?.verification.integrity === "valid" ? "Verified" : "Inspection only"
              }}</span
            ><span>{{ projection?.notes.length ?? "—" }} readable notes</span
            ><span>{{ report?.lockedEntries ?? "—" }} locked events</span
            ><span class="head-label mono" :title="report?.verification.head ?? ''"
              >head
              {{
                report?.verification.head ? short(report.verification.head, 10) : "unavailable"
              }}</span
            >
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style src="../inspector/workbench.css"></style>
