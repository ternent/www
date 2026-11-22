<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, triggerRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { AudienceId } from "@ternent/concord";
import { actors, NotesSession, short, type ActorId } from "./session";
import type { Note } from "./model";
import NoteEditor from "./NoteEditor.vue";
import InspectorPanel from "./InspectorPanel.vue";

type View = "entries" | "history" | "json" | "verification";
const route = useRoute();
const router = useRouter();
const app = shallowRef<NotesSession | null>(null);
const revision = ref(0);
const busy = ref(true);
const editorDirty = ref(false);
const notice = ref("Generating demo identities and a signed document…");
const isError = ref(false);
const view = ref<View>((route.meta.examplesView as View) ?? "entries");
watch(
  () => route.meta.examplesView,
  (next) => {
    view.value = (next as View) ?? "entries";
  },
);
watch(view, (next) => {
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
    revision.value++;
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
    notice.value = "Demo ready. Try reading the same document as Bob.";
    isError.value = false;
  } catch (cause) {
    notice.value = cause instanceof Error ? cause.message : "Could not create the demo.";
    isError.value = true;
  } finally {
    revision.value++;
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
  <div class="concord-examples">
    <div v-if="!app" class="loading-state">
      <div class="loading-glyph" aria-hidden="true">{ }</div>
      <h2>Preparing your document.</h2>
      <p :role="isError ? 'alert' : 'status'">{{ notice }}</p>
      <button v-if="isError" class="button primary" @click="start">Try again</button>
    </div>

    <template v-else>
      <aside class="sidebar" aria-label="Readers and privacy groups">
        <div class="sidebar-intro">
          <span class="eyebrow">A different point of view</span>
          <h2>Who’s reading?</h2>
          <p>Same bytes. Different keys.</p>
        </div>
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
            <span class="avatar" :class="actor.id">{{ actor.initials }}</span
            ><span class="identity-copy"
              ><strong>{{ actor.name }}</strong><small>{{ actor.role }}</small></span
            ><span v-if="app.reader === actor.id" class="identity-check" aria-hidden="true">✓</span>
          </button>
        </div>
        <div class="sidebar-section">
          <span class="eyebrow">Privacy groups</span
          ><button
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
              /></svg
            ><span>{{ app.groupName(group.audience) }}</span
            ><span class="group-arrow" aria-hidden="true">↗</span>
          </button>
          <p v-if="!groups.length" class="small muted">
            Group metadata is unavailable for this input.
          </p>
        </div>
        <div class="document-anchor">
          <span class="eyebrow">Document ID</span
          ><span class="mono" :title="report?.verification.documentId ?? ''">{{
            report?.verification.documentId
              ? short(report.verification.documentId, 21)
              : "Unavailable"
          }}</span
          ><span class="sidebar-local"
            ><span class="status-light" aria-hidden="true"></span> Processing in this tab</span
          >
        </div>
      </aside>

      <section class="main" aria-label="Example document">
        <section class="intro">
          <div>
            <span class="eyebrow">One signed document</span>
            <h2>Different keys.<br />Different view.</h2>
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
            /><button
              class="button subtle"
              :disabled="busy || !!draft || editorDirty"
              @click="upload?.click()"
            >
              Import JSON <span aria-hidden="true">↓</span></button
            ><button class="button primary" :disabled="busy" @click="exportDocument">
              Export document <span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>

        <div class="status-strip">
          <span
            class="status-dot"
            :class="{ warning: report?.verification.integrity !== 'valid' }"
            >{{
              report?.verification.integrity === "valid" ? "History verified" : "Inspection only"
            }}</span
          ><span><strong>{{ projection?.notes.length ?? "—" }}</strong> readable notes</span
          ><span
            ><strong>{{ report?.lockedEntries ?? "—" }}</strong> encrypted events without a
            key</span
          ><span class="head-label mono" :title="report?.verification.head ?? ''"
            >head
            {{
              report?.verification.head ? short(report.verification.head, 10) : "unavailable"
            }}</span
          >
        </div>
        <div class="view-bar">
          <nav aria-label="Document views">
            <button
              v-for="item in views"
              :key="item.id"
              :class="{ active: view === item.id }"
              :aria-pressed="view === item.id"
              @click="view = item.id"
            >
              {{ item.label }}
            </button>
          </nav>
          <span class="viewer-caption">Reading as <strong>{{ currentActor?.name }}</strong></span>
        </div>
        <div v-if="editorDirty && view !== 'entries'" class="draft-banner">
          <div>
            <strong>Unsubmitted editor text</strong
            ><span
              >Return to Entries to save, stage or reset it before replacing the document.</span
            >
          </div>
          <button class="button subtle" @click="view = 'entries'">Back to editor</button>
        </div>
        <div v-if="draft" class="draft-banner">
          <div>
            <strong
              >{{ draft.entryCount }} staged
              {{ draft.entryCount === 1 ? "event" : "events" }}</strong
            ><span>Preview only · export still contains committed history</span>
          </div>
          <button
            class="button subtle"
            :disabled="busy"
            @click="
              run(() => app!.discard(), 'Staged changes discarded. Committed history is unchanged.')
            "
          >
            Discard</button
          ><button
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
                  audience === "document" ? "Default privacy group" : "Independent privacy group"
                }}</span>
                <h2>{{ app.groupName(audience) }}</h2>
              </div>
              <button
                class="button subtle small-button"
                :disabled="busy || !writable || editorDirty"
                @click="selectedNoteId = null"
              >
                + New entry
              </button>
            </div>
            <div class="group-access">
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
                      ? 'Bob removed. Previously shared history stays readable; future entries use a new group key.'
                      : 'Bob admitted with read/write access, including this group’s history.',
                  )
                "
              >
                {{ bobIsMember ? "Remove Bob" : "Give Bob access" }}
              </button>
            </div>
            <p
              v-if="audience === app.privateAudience && app.reader !== 'alice'"
              class="group-explanation"
            >
              This is an independent group. Membership of Shared notes does not grant access here.
            </p>
            <div v-if="notes.length" class="entry-list">
              <button
                v-for="note in notes"
                :key="note.id"
                class="entry-row"
                :disabled="editorDirty && selectedNoteId !== note.id"
                :class="{ selected: selectedNoteId === note.id }"
                @click="selectedNoteId = note.id"
              >
                <span class="entry-document-icon" aria-hidden="true"
                  ><svg viewBox="0 0 24 24">
                    <path
                      d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linejoin="round"
                    /></svg></span
                ><span class="entry-copy"
                  ><strong>{{ note.title }}</strong
                  ><span>{{ note.body || "An empty entry." }}</span></span
                ><span class="entry-arrow" aria-hidden="true">↗</span>
              </button>
            </div>
            <div v-else class="empty-state">
              <span class="empty-symbol" aria-hidden="true">{{ lockedInGroup ? "⊡" : "＋" }}</span>
              <h3>
                {{
                  state?.status !== "ready"
                    ? "Inspection only"
                    : lockedInGroup
                      ? "The contents stay encrypted."
                      : "A little room for your data."
                }}
              </h3>
              <p>
                {{
                  state?.status !== "ready"
                    ? "See Verification for the reason this input cannot produce trusted notes."
                    : lockedInGroup
                      ? "This reader has no key for the events in this group. The stored records are still available to inspect."
                      : "Add an entry to this group to see it encrypted and signed."
                }}
              </p>
            </div>
            <div v-if="lockedInGroup" class="locked-summary">
              <span aria-hidden="true">⊡</span>
              <p>
                <strong
                  >{{ lockedInGroup }} encrypted
                  {{ lockedInGroup === 1 ? "event" : "events" }}</strong
                ><span
                  >Titles and contents are unavailable to this reader. Event count is not a count of
                  distinct notes.</span
                >
              </p>
              <button class="text-button" @click="view = 'json'">Inspect JSON ↗</button>
            </div>
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
                Commit each change automatically</label
              ><span class="small muted">{{
                app.mode === "immediate" ? "One change → one commit" : "Stage → review → commit"
              }}</span>
            </div>
            <p class="membership-caption">
              Removing a member protects future entries. It cannot retract history or keys already
              shared.
            </p>
          </section>
          <InspectorPanel
            :session="app"
            :revision="revision"
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
          :session="app"
          :revision="revision"
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
        <footer class="footer">
          <p>
            Three demo identities live in this tab. Switching readers passes different keys to
            Concord; this demonstrates access, not isolated user sessions. Reloading clears the keys
            and unfinished work. Keep the tab open to decrypt re-imported files.
          </p>
          <span class="mono">@ternent/concord<br />0.3.0-alpha.1</span>
        </footer>
      </section>
    </template>
  </div>
</template>

<style src="./examples.css"></style>
