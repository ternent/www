import { generateIdentity, type IdentityCapability } from "@ternent/armour";
import {
  createDocument,
  openDocument,
  type AudienceId,
  type DocumentHandle,
  type Result,
  type Snapshot,
} from "@ternent/concord";
import {
  createGroup,
  createStandardSystemProfile,
  removeMember,
  setMember,
} from "@ternent/concord/system";
import { notesModel, type Note, type NotesCommands, type NotesState } from "./model";

export type ActorId = "alice" | "bob" | "eve" | "none";
export type AuthoringMode = "immediate" | "draft";
export type NotesHandle = DocumentHandle<NotesState, NotesCommands>;
type Identities = Record<Exclude<ActorId, "none">, IdentityCapability>;
export const actors = [
  { id: "alice", name: "Alice", initials: "A", role: "First demo identity" },
  { id: "bob", name: "Bob", initials: "B", role: "Second demo identity" },
  { id: "eve", name: "Eve", initials: "E", role: "Third demo identity" },
  { id: "none", name: "No identity", initials: "—", role: "Public inspection" },
] as const;
const system = createStandardSystemProfile();
const text = new TextEncoder();
export function value<T>(result: Result<T, { code: string; message?: string }>): T {
  if (!result.ok)
    throw new Error(
      `${result.error.code}${result.error.message ? `: ${result.error.message}` : ""}`,
    );
  return result.value;
}
export function short(id: string, length = 10) {
  return id.includes(":") ? id.split(":").at(-1)!.slice(0, length) : id.slice(0, length);
}

export class Playground {
  #identities: Identities;
  #bytes: Uint8Array;
  #recovery: Uint8Array | null = null;
  handle: NotesHandle;
  reader: ActorId = "alice";
  mode: AuthoringMode = "immediate";
  readonly privateAudience: AudienceId;

  private constructor(identities: Identities, handle: NotesHandle, privateAudience: AudienceId) {
    this.#identities = identities;
    this.handle = handle;
    this.#bytes = handle.export();
    this.privateAudience = privateAudience;
  }

  static async create() {
    const [alice, bob, eve] = await Promise.all([
      generateIdentity(),
      generateIdentity(),
      generateIdentity(),
    ]).then((items) => items.map(value));
    const handle = value(await createDocument({ model: notesModel, system, identity: alice }));
    value(
      await setMember(handle, { identity: bob.publicIdentity, capabilities: ["read", "write"] }),
    );
    const privateAudience = value(await createGroup(handle)).audience;
    for (const note of [
      {
        id: "welcome",
        title: "A document you can take with you",
        body: "Alice and Bob can both read and edit this entry. Open Stored JSON to see what is actually saved.",
        audience: "document" as const,
      },
      {
        id: "next",
        title: "Try another point of view",
        body: "Switch to Bob to see the shared entries. Then try Eve: she can inspect the signed history, but cannot decrypt either group.",
        audience: "document" as const,
      },
      {
        id: "private",
        title: "The quiet notebook",
        body: "A little space for Alice. This title and its contents are encrypted for a separate group, inside the very same document.",
        audience: privateAudience,
      },
    ])
      value(await handle.dispatch("put", note));
    return new Playground({ alice, bob, eve }, handle, privateAudience);
  }

  publicIdentity(actor: ActorId = this.reader) {
    return actor === "none" ? null : this.#identities[actor].publicIdentity;
  }
  actorName(id: string) {
    return actors.find((actor) => this.publicIdentity(actor.id)?.id === id)?.name ?? short(id);
  }
  groupName(audience: AudienceId) {
    return audience === "document"
      ? "Shared notes"
      : audience === this.privateAudience
        ? "Alice’s notebook"
        : `Group ${short(audience, 6)}`;
  }
  get json() {
    return new TextDecoder().decode(this.#bytes);
  }
  get snapshot(): Snapshot | null {
    if (this.handle.inspect().verification.integrity !== "valid") return null;
    try {
      const parsed = JSON.parse(this.json);
      return parsed && Array.isArray(parsed.commits) && Array.isArray(parsed.entries)
        ? parsed
        : null;
    } catch {
      return null;
    }
  }
  get canRestore() {
    return this.#recovery !== null;
  }
  export() {
    return new Uint8Array(this.#bytes);
  }
  capabilities(audience: AudienceId) {
    const id = this.publicIdentity()?.id;
    return (
      this.handle
        .inspect()
        .audiences?.find((group) => group.audience === audience)
        ?.members.find((member) => member.identity.id === id)?.capabilities ?? []
    );
  }
  canWrite(audience: AudienceId) {
    return this.handle.state().status === "ready" && this.capabilities(audience).includes("write");
  }
  #noDraft() {
    if (this.handle.draft()) throw new Error("Commit or discard the staged changes first.");
  }
  async #open(bytes = this.#bytes, reader = this.reader, mode = this.mode) {
    const handle = await openDocument({
      bytes,
      model: notesModel,
      system,
      signer: reader === "none" ? undefined : this.#identities[reader],
      mode,
    });
    const acceptedBytes = handle.export();
    this.handle = handle;
    this.#bytes = acceptedBytes;
    this.reader = reader;
    this.mode = mode;
  }
  async switchReader(reader: ActorId) {
    this.#noDraft();
    await this.#open(this.#bytes, reader);
  }
  async setMode(mode: AuthoringMode) {
    this.#noDraft();
    await this.#open(this.#bytes, this.reader, mode);
  }
  async put(note: Note) {
    value(await this.handle.dispatch("put", note));
    this.#bytes = this.handle.export();
  }
  async remove(note: Note) {
    value(await this.handle.dispatch("remove", { id: note.id, audience: note.audience }));
    this.#bytes = this.handle.export();
  }
  async commit() {
    value(await this.handle.commit({ message: "Commit notes from the playground" }));
    this.#bytes = this.handle.export();
  }
  async discard() {
    value(await this.handle.discardDraft());
  }
  async setBobAccess(audience: AudienceId, admitted: boolean) {
    this.#noDraft();
    if (admitted)
      value(
        await setMember(this.handle, {
          audience,
          identity: this.#identities.bob.publicIdentity,
          capabilities: ["read", "write"],
        }),
      );
    else
      value(
        await removeMember(this.handle, {
          audience,
          identityId: this.#identities.bob.publicIdentity.id,
        }),
      );
    this.#bytes = this.handle.export();
  }
  async load(bytes: Uint8Array) {
    this.#noDraft();
    if (bytes.length > 2 * 1024 * 1024)
      throw new Error("Use a document no larger than 2 MiB in this demo.");
    const previous = this.export();
    await this.#open(new Uint8Array(bytes));
    this.#recovery = previous;
  }
  async applyJson(json: string) {
    await this.load(text.encode(json));
  }
  async tamper() {
    this.#noDraft();
    const snapshot = this.snapshot;
    if (!snapshot?.commits.length) throw new Error("There is no commit to tamper with.");
    const commit = snapshot.commits.at(-1)!;
    commit.signature = (commit.signature.startsWith("A") ? "B" : "A") + commit.signature.slice(1);
    await this.applyJson(JSON.stringify(snapshot));
  }
  async restore() {
    this.#noDraft();
    if (!this.#recovery) return;
    const bytes = this.#recovery;
    await this.#open(bytes);
    this.#recovery = null;
  }
}
