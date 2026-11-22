<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { AudienceId } from "@ternent/concord";
import type { Note } from "./model";

const props = defineProps<{
  note: Note | null;
  audience: AudienceId;
  writable: boolean;
  busy: boolean;
  draft: boolean;
}>();
const emit = defineEmits<{ save: [note: Note]; remove: [note: Note]; dirty: [dirty: boolean] }>();
const title = ref(props.note?.title ?? "");
const body = ref(props.note?.body ?? "");
const dirty = computed(
  () => title.value !== (props.note?.title ?? "") || body.value !== (props.note?.body ?? ""),
);
watch(dirty, (value) => emit("dirty", value), { immediate: true });
function resetEditor() {
  title.value = props.note?.title ?? "";
  body.value = props.note?.body ?? "";
}
watch([() => props.note?.title, () => props.note?.body], () => {
  title.value = props.note?.title ?? "";
  body.value = props.note?.body ?? "";
});
function submit() {
  emit("save", {
    id: props.note?.id ?? crypto.randomUUID(),
    title: title.value.trim(),
    body: body.value,
    audience: props.audience,
  });
}
</script>

<template>
  <form class="note-editor" @submit.prevent="submit">
    <div class="section-heading">
      <h3>{{ note ? "Edit entry" : "New entry" }}</h3>
      <span class="muted small">{{
        writable ? "Encrypted for this group" : "Read-only for this identity"
      }}</span>
    </div>
    <fieldset :disabled="!writable || busy">
      <label for="note-title">Title</label>
      <input
        id="note-title"
        v-model="title"
        placeholder="Give your entry a title"
        maxlength="120"
        required
        autocomplete="off"
      />
      <label for="note-body">Content</label>
      <textarea
        id="note-body"
        v-model="body"
        placeholder="Write something worth keeping…"
        maxlength="8000"
        rows="4"
      ></textarea>
      <div class="editor-actions">
        <button class="button primary" type="submit" :disabled="!title.trim()">
          {{ draft ? "Stage change" : "Sign & commit" }} <span aria-hidden="true">↗</span>
        </button>
        <button v-if="note" class="text-button danger" type="button" @click="emit('remove', note)">
          {{ draft ? "Stage removal" : "Remove entry" }}
        </button>
      </div>
    </fieldset>
    <p v-if="dirty" class="editor-caption">
      Unsubmitted edits. Save or stage them before changing readers or groups.
      <button class="text-button" type="button" :disabled="busy" @click="resetEditor">
        Reset editor
      </button>
    </p>
    <p class="editor-caption">
      {{
        draft
          ? "Staged changes are an in-memory preview. The exported file stays unchanged until you commit."
          : "Each save appends a signed event. Editing or removing an entry preserves its earlier history."
      }}
    </p>
  </form>
</template>
