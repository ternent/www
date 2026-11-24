import type { InspectionReport } from "@ternent/concord";
import type { OpenedDocument } from "./document";

export type InspectionContext = { label: string; report: InspectionReport };
export type InspectionInput = {
  bytes: Uint8Array;
  name: string;
  context?: InspectionContext;
  entryId?: string;
  focusEntries?: Record<string, string>;
};
let pending: InspectionInput | null = null;

/** A one-time, in-memory hand-off. No private keys or file contents enter the URL. */
export function sendToInspector(input: InspectionInput) {
  pending = {
    ...input,
    bytes: new Uint8Array(input.bytes),
    context: input.context ? structuredClone(input.context) : undefined,
  };
}
export function takeInspection(): InspectionInput | null {
  const value = pending;
  pending = null;
  return value;
}
export function applyInspectionContext(document: OpenedDocument, context?: InspectionContext) {
  if (!context || document.kind !== "concord" || !document.inspection) return;
  const verified = document.inspection.verification;
  const supplied = context.report.verification;
  if (
    verified.integrity !== "valid" ||
    supplied.integrity !== "valid" ||
    verified.head !== supplied.head ||
    verified.documentId !== supplied.documentId
  )
    return;
  document.inspection.concord = context.report;
  document.contextLabel = context.label;
}
