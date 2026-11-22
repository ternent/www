import { defineModel, type AudienceId, type ModelIssue, type Result } from "@ternent/concord";

export type Note = { id: string; title: string; body: string; audience: AudienceId };
export type NotesState = { notes: Note[]; locked: Record<string, number> };
export type NotesCommands = { put: Note; remove: { id: string; audience: AudienceId } };
type NoteEvent =
  | { type: "note.put"; version: 1; data: Note }
  | { type: "note.remove"; version: 1; data: NotesCommands["remove"] };

const valid = <T>(value: T): Result<T, ModelIssue> => ({ ok: true, value });
const invalid = (message: string): Result<never, ModelIssue> => ({
  ok: false,
  error: { code: "NOTE_INVALID", message },
});
function record(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === "object" && !Array.isArray(input);
}
function audience(input: unknown): input is AudienceId {
  return (
    input === "document" || (typeof input === "string" && /^group:[A-Za-z0-9_-]+$/.test(input))
  );
}
function identify(input: unknown): Result<NotesCommands["remove"], ModelIssue> {
  if (
    !record(input) ||
    typeof input.id !== "string" ||
    !input.id ||
    input.id.length > 128 ||
    !audience(input.audience)
  )
    return invalid("An entry needs an ID and a valid privacy group.");
  return valid({ id: input.id, audience: input.audience });
}
function note(input: unknown): Result<Note, ModelIssue> {
  const identified = identify(input);
  if (!identified.ok) return identified;
  if (
    !record(input) ||
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.length > 120 ||
    typeof input.body !== "string" ||
    input.body.length > 8000
  )
    return invalid("Use a title of 1–120 characters and a body of at most 8,000 characters.");
  return valid({ ...identified.value, title: input.title, body: input.body });
}

// IDs are scoped to an audience: a writer in one group cannot replace another group's note.
export const notesModel = defineModel<NotesState, NotesCommands, NoteEvent>({
  ref: { id: "dev.ternent.playground.notes", version: 1 },
  initial: () => ({ notes: [], locked: {} }),
  commands: {
    put: {
      validate: note,
      audience: (input) => input.audience,
      decide: (input) => valid([{ type: "note.put", version: 1, data: input }]),
    },
    remove: {
      validate: identify,
      audience: (input) => input.audience,
      decide: (input) => valid([{ type: "note.remove", version: 1, data: input }]),
    },
  },
  validateEvent(input) {
    if (!record(input) || input.version !== 1) return invalid("Unsupported note event.");
    if (input.type === "note.put") {
      const checked = note(input.data);
      return checked.ok ? valid({ type: "note.put", version: 1, data: checked.value }) : checked;
    }
    if (input.type === "note.remove") {
      const checked = identify(input.data);
      return checked.ok ? valid({ type: "note.remove", version: 1, data: checked.value }) : checked;
    }
    return invalid("Unknown note event.");
  },
  audience: (event) => event.data.audience,
  requirements: () => ["write"],
  reduce(state, event) {
    const remaining = state.notes.filter(
      (item) => item.id !== event.data.id || item.audience !== event.data.audience,
    );
    return valid({
      notes: event.type === "note.put" ? [...remaining, event.data] : remaining,
      locked: { ...state.locked },
    });
  },
  reduceLocked: (state, entry) =>
    valid({
      notes: [...state.notes],
      locked: { ...state.locked, [entry.audience]: (state.locked[entry.audience] ?? 0) + 1 },
    }),
});
