import { expect, test } from "vite-plus/test";
import { loadNotesInspection } from "../../modules/examples/inspection-preset";
import { inspectDocument } from "../../modules/inspector/document";
import { applyInspectionContext } from "../../modules/inspector/handoff";

test("a named preset resolves encrypted payloads for fresh documents without carrying private reader context", async () => {
  const first = await loadNotesInspection();
  const second = await loadNotesInspection();
  const document = await inspectDocument(first.bytes, first.name);
  applyInspectionContext(document, first.context);
  expect(document.inspection?.verification.integrity).toBe("valid");
  expect(
    first.context?.report.entries?.find(
      (item) => item.entryId === first.focusEntries?.["encrypted-payload"],
    )?.status,
  ).toBe("locked");
  const entry = document.inspection?.snapshot?.entries.find((item) => item.id === first.entryId);
  expect(entry?.subject.payload.data).toHaveProperty("ciphertext");
  expect(document.source).not.toContain("The quiet notebook");
  expect(first.context?.report.entries?.some((item) => item.status === "readable")).toBe(false);
  expect(second.entryId).not.toBe(first.entryId);
  expect(second.context?.report.verification.head).not.toBe(
    first.context?.report.verification.head,
  );
  expect(document.contextLabel).toBe("Notes example · public inspection");
});
