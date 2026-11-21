import {
  createIdentity,
  deriveAgeRecipient,
  validateIdentity,
  type SerializedIdentity,
} from "@ternent/identity";
import { createLedger, type LedgerContainer, type LedgerReplayEntry, type LedgerCommitRecord } from "@ternent/ledger";
import {
  createConcordApp,
  type ConcordApp,
  type ConcordReplayPlugin,
} from "@ternent/concord/browser";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type DataState = Record<string, JsonValue>;
export type ReplayObserver = (state: DataState, entry: LedgerReplayEntry) => Promise<void> | void;
export type PlaygroundRuntime = { identity: SerializedIdentity; app: ConcordApp };

function createDataPlugin(recipient: string, onEntry?: ReplayObserver): ConcordReplayPlugin {
  return {
    id: "data",
    initialState: () => ({}),
    commands: {
      "data.set": (_context, input) => {
        const payload = input as { key: string; value: JsonValue };
        if (!payload || typeof payload.key !== "string" || !payload.key.length ||
          payload.key.length > 160 || payload.value === undefined || JSON.stringify(payload).length > 4000)
          throw new Error("Provide a key and a JSON value under 4 KB.");
        return {
          kind: "data.set",
          payload,
          protection: { type: "recipients", recipients: [recipient], encoding: "armor" },
        };
      },
    },
    async applyEntry(entry, context) {
      if (entry.payload.type === "encrypted") return;
      const payload = entry.payload.data as Record<string, JsonValue>;
      if (entry.kind === "data.set" && typeof payload?.key === "string" && payload.value !== undefined) {
        context.setState({ ...(context.getState() as DataState), [payload.key as string]: payload.value });
      } else if (["record.written", "card.saved"].includes(entry.kind) && typeof payload?.id === "string") {
        // Earlier demo exports still replay as raw records.
        context.setState({ ...(context.getState() as DataState), [payload.id as string]: payload });
      } else return;
      // Trace actual plugin work. Concord publishes its full state atomically afterwards.
      await onEntry?.(structuredClone(context.getState() as DataState), entry);
    },
  };
}

export async function openRuntime(
  identity?: SerializedIdentity,
  container?: LedgerContainer,
  onEntry?: ReplayObserver,
): Promise<PlaygroundRuntime> {
  const author = identity ? await validateIdentity(identity) : await createIdentity();
  const recipient = await deriveAgeRecipient(author);
  const app = await createConcordApp({ identity: author, plugins: [createDataPlugin(recipient, onEntry)] });
  try {
    if (container) await app.importLedger(container);
    else await app.load();
    if (!(await app.verify()).valid) throw new Error("The ledger failed verification.");
  } catch (error) {
    await app.destroy();
    throw error;
  }
  return { identity: author, app };
}

// An unrelated signer satisfies Ledger's authoring interface. Verification uses
// the artifact's public proofs; no original identity or decryptor is supplied.
export async function verifyArtifact(container: LedgerContainer) {
  if (!container || container.format !== "concord-ledger" || container.version !== "1" ||
    !container.commits || typeof container.commits !== "object" || Array.isArray(container.commits) ||
    !container.entries || typeof container.entries !== "object" || Array.isArray(container.entries) ||
    typeof container.head !== "string") {
    throw new Error("Invalid ledger structure. Choose an exported Concord ledger.");
  }
  const verifier = await createIdentity();
  const ledger = await createLedger<LedgerReplayEntry[]>({
    identity: { signer: { identity: verifier }, authorResolver: () => verifier.keyId },
    initialProjection: [],
    projector: (entries, entry) => [...entries, entry],
    replayPolicy: { verify: false, decrypt: false },
  });
  try {
    await ledger.load(container);
    return await ledger.verify();
  } finally {
    await ledger.destroy();
  }
}

export function getData(runtime: PlaygroundRuntime): DataState {
  return structuredClone(runtime.app.getReplayState<DataState>("data"));
}

export function orderedCommits(container: LedgerContainer) {
  const commits: LedgerCommitRecord[] = [];
  const visited = new Set<string>();
  let id: string | null = container.head;
  while (id && !visited.has(id) && container.commits[id]) {
    visited.add(id);
    const commit: LedgerCommitRecord = container.commits[id];
    commits.unshift(commit);
    id = commit.parentCommitId;
  }
  return commits;
}

export function alterPayload(container: LedgerContainer) {
  const altered = structuredClone(container);
  const entry = Object.values(altered.entries).find((item) => item.payload.type === "encrypted");
  if (!entry || entry.payload.type !== "encrypted" || !entry.payload.data.length)
    throw new Error("This ledger has no encrypted payload to alter.");
  const offset = Math.floor(entry.payload.data.length / 2);
  const before = entry.payload.data[offset];
  const after = before === "A" ? "B" : "A";
  entry.payload.data = entry.payload.data.slice(0, offset) + after + entry.payload.data.slice(offset + 1);
  return { container: altered, entryId: entry.entryId, offset, before, after };
}

export async function stateFingerprint(state: DataState) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(state)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSample(): Promise<PlaygroundRuntime> {
  const runtime = await openRuntime();
  const changes = [
    { message: "Initialise document", values: { project: "Northstar", version: 1 } },
    { message: "Set preferences", values: { settings: { visibility: "private", region: "eu" } } },
    { message: "Rename project", values: { project: "Orbit" } },
    { message: "Publish revision", values: { version: 2 } },
  ];
  try {
    for (const change of changes) {
      for (const [key, value] of Object.entries(change.values))
        await runtime.app.command("data.set", { key, value });
      await runtime.app.commit({ metadata: { message: change.message } });
    }
    return runtime;
  } catch (error) {
    await runtime.app.destroy();
    throw error;
  }
}
