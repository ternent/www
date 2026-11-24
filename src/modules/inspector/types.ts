import type { InspectionReport } from "@ternent/concord";
import type { LedgerCommitRecord, LedgerSnapshot, VerificationReport } from "@ternent/ledger";

/** Record inspection is independent of application projections and authoring sessions. */
export type Inspection = {
  verification: VerificationReport;
  history: readonly LedgerCommitRecord[];
  snapshot: LedgerSnapshot | null;
  concord?: InspectionReport;
  interpretationError?: string;
};

export const short = (id: string, length = 10) =>
  (id.includes(":") ? id.slice(id.indexOf(":") + 1) : id).slice(0, length);

export function format(input: unknown): string {
  if (typeof input === "number") return String(input);
  try {
    return JSON.stringify(input, null, 2) ?? "Unavailable";
  } catch {
    return "This value is too deep to format. Open Source to inspect the original input.";
  }
}
