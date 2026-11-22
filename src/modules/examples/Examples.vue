<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, triggerRef } from "vue";
import { useRouter } from "vue-router";
import type { AudienceId } from "@ternent/concord";
import { actors, NotesSession, short, type ActorId } from "./session";
import type { Note } from "./model";
import { packageVersions } from "@/app/config/packages";
import NoteEditor from "./NoteEditor.vue";
import { sendToInspector } from "../inspector/handoff";

const router = useRouter();
const app = shallowRef<NotesSession | null>(null);
const busy = ref(true);
const editorDirty = ref(false);
const notice = ref("Generating demo identities and a signed document…");
const isError = ref(false);
const audience = ref<AudienceId>("document");
const selectedNoteId = ref<string | null>("welcome");
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
function inspectExample(target = "/inspect") {
  if (!app.value || busy.value) return;
  const report = app.value.handle.inspect();
  const selectedEntry = report.entries
    ?.filter((entry) =>
      entry.status === "readable"
        ? (entry.event.data as { id?: string; audience?: string })?.id === selectedNote.value?.id &&
          (entry.event.data as { audience?: string })?.audience === audience.value
        : entry.audience === audience.value,
    )
    .at(-1);
  sendToInspector({
    bytes: app.value.export(),
    name: "concord-document.json",
    entryId: selectedEntry?.entryId,
    context: { label: `Example snapshot · ${currentActor.value?.name}`, report },
  });
  void router.push(target);
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
  <div class="concord-examples document-workbench examples-workbench">
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
              <span class="identity-copy"><strong>{{ actor.name }}</strong></span>
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
              Inspect document opens a committed snapshot as the selected reader. Unfinished edits
              stay here when you switch tools.
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
            <button
              class="button subtle"
              data-test="export-document"
              :disabled="busy"
              @click="exportDocument"
            >
              Export <span aria-hidden="true">↗</span>
            </button>
            <button
              class="button primary"
              data-test="inspect-document"
              aria-label="Inspect document"
              title="Inspect this committed document"
              :disabled="busy"
              @click="inspectExample()"
            >
              Inspect <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

        <div class="content-grid">
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
                    ? "Open Inspector to check this document."
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
              <button class="text-button" @click="inspectExample('/inspect/json')">
                Inspect ↗
              </button>
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
          </section>
        </div>

        <div class="commit-strip">
          <label class="auto-commit"
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
          >
          <span class="commit-summary">{{
            draft
              ? `${draft.entryCount} staged ${draft.entryCount === 1 ? "event" : "events"}`
              : app.mode === "draft"
                ? "Changes will be staged"
                : "Each save signs a commit"
          }}</span>
          <template v-if="draft">
            <button
              class="button subtle"
              :disabled="busy || editorDirty"
              @click="
                run(
                  () => app!.discard(),
                  'Staged changes discarded. Committed history is unchanged.',
                )
              "
            >
              Discard
            </button>
            <button
              class="button primary"
              :disabled="busy || editorDirty"
              @click="run(() => app!.commit(), 'Staged events encrypted and committed together.')"
            >
              Commit changes
            </button>
          </template>
        </div>
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

<style src="./examples.css"></style>
