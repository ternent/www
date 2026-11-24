import { NotesSession } from "./session";
import type { InspectionInput } from "../inspector/handoff";

/** A fresh public demonstration, independent of the visitor's editable notes session. */
export async function loadNotesInspection(): Promise<InspectionInput> {
  const session = await NotesSession.create();
  await session.switchReader("none");
  const report = session.handle.inspect();
  const encrypted = report.entries?.find((entry) => entry.status === "locked");
  if (!encrypted) throw new Error("The notes example has no encrypted payload to inspect.");
  return {
    bytes: session.export(),
    name: "notes-example.json",
    context: { label: "Notes example · public inspection", report },
    entryId: encrypted.entryId,
    focusEntries: { "encrypted-payload": encrypted.entryId },
  };
}
