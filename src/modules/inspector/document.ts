import { inspectLedger } from "@ternent/ledger/protocol";
import type { LedgerSnapshot } from "@ternent/ledger";
import { openDocument } from "@ternent/concord";
import type { Inspection } from "./types";

export const MAX_FILE_BYTES = 16 * 1024 * 1024;
export type OpenedDocument = {
  name: string;
  bytes: Uint8Array;
  source: string;
  parsed: { ok: true; value: unknown } | { ok: false; error: string };
  kind: "json" | "ledger" | "concord";
  inspection: Inspection | null;
};

export async function inspectDocument(
  input: Uint8Array,
  name = "document.json",
): Promise<OpenedDocument> {
  if (input.byteLength > MAX_FILE_BYTES)
    throw new Error("Choose a JSON file no larger than 16 MiB.");
  const bytes = new Uint8Array(input);
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error("This file is not UTF-8 text.");
  }
  const document: OpenedDocument = {
    name,
    bytes,
    source,
    parsed: { ok: false, error: "Invalid JSON" },
    kind: "json",
    inspection: null,
  };
  try {
    document.parsed = { ok: true, value: JSON.parse(source) };
  } catch (cause) {
    document.parsed = { ok: false, error: cause instanceof Error ? cause.message : "Invalid JSON" };
    return document;
  }
  const value = document.parsed.value;
  if (!value || typeof value !== "object" || !("format" in value) || value.format !== "ledger")
    return document;

  const inspected = await inspectLedger(bytes, { limits: { maxBytes: MAX_FILE_BYTES } });
  document.kind = "ledger";
  // untrustedHistory is exposed only after Ledger's complete structural schema check.
  // These records remain inspection evidence when hashes or signatures fail.
  const snapshot =
    inspected.snapshot ?? (inspected.untrustedHistory.length ? (value as LedgerSnapshot) : null);
  document.inspection = {
    verification: inspected.report,
    history: inspected.untrustedHistory,
    snapshot,
  };
  if (inspected.snapshot?.commits[0]?.subject.metadata?.concord) {
    document.kind = "concord";
    try {
      const handle = await openDocument({ bytes, limits: { maxBytes: MAX_FILE_BYTES } });
      document.inspection.concord = handle.inspect();
    } catch (cause) {
      document.inspection.interpretationError =
        cause instanceof Error ? cause.message : "Concord declarations could not be inspected.";
    }
  }
  return document;
}
