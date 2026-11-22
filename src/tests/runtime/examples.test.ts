import { expect, test } from "vite-plus/test";
import { verifyLedger } from "@ternent/ledger";
import { createDocument } from "@ternent/concord";
import { createStandardSystemProfile } from "@ternent/concord/system";
import { generateIdentity } from "@ternent/armour";
import { notesModel } from "../../modules/examples/model";
import { NotesSession, value } from "../../modules/examples/session";

test("different readers get actual readable projections over the same signed bytes", async () => {
  const app = await NotesSession.create();
  const bytes = app.export();
  expect(JSON.parse(new TextDecoder().decode(bytes)).format).toBe("ledger");
  expect((await verifyLedger(bytes)).integrity).toBe("valid");
  expect(app.handle.state()).toMatchObject({
    status: "ready",
    coverage: "complete",
    projection: { notes: expect.any(Array) },
  });
  expect(app.handle.state().status === "ready" && app.handle.state()).toHaveProperty(
    "projection.notes.length",
    3,
  );
  for (const [reader, readable, locked] of [
    ["bob", 2, 1],
    ["eve", 0, 3],
    ["none", 0, 3],
  ] as const) {
    await app.switchReader(reader);
    expect(app.export()).toEqual(bytes);
    expect(app.handle.state()).toMatchObject({
      status: "ready",
      coverage: "readable",
      lockedEntries: locked,
      projection: { notes: expect.any(Array) },
    });
    const state = app.handle.state();
    if (state.status === "ready") expect(state.projection.notes).toHaveLength(readable);
    expect((await app.handle.verify()).integrity).toBe("valid");
  }
});

test("a shared writer cannot author into Alice's independent group", async () => {
  const app = await NotesSession.create();
  await app.switchReader("bob");
  await app.put({
    id: "bob",
    audience: "document",
    title: "From Bob",
    body: "A real signed commit.",
  });
  const before = app.export();
  await expect(
    app.put({ id: "private", audience: app.privateAudience, title: "Overwrite", body: "No." }),
  ).rejects.toThrow("CAPABILITY_DENIED");
  expect(app.export()).toEqual(before);
  expect(app.canWrite(app.privateAudience)).toBe(false);
});

test("switching readers publishes the selected identity and replayed state atomically", async () => {
  const app = await NotesSession.create();
  const previousHandle = app.handle;
  const switching = app.switchReader("bob");
  expect(app.reader).toBe("alice");
  expect(app.handle).toBe(previousHandle);
  await switching;
  expect(app.reader).toBe("bob");
  const state = app.handle.state();
  expect(state.status).toBe("ready");
  if (state.status === "ready") expect(state.projection.notes).toHaveLength(2);
});

test("a note ID in another group cannot overwrite private application state", async () => {
  const app = await NotesSession.create();
  await app.switchReader("bob");
  await app.put({
    id: "private",
    audience: "document",
    title: "Same ID, different group",
    body: "Separate entry.",
  });
  await app.switchReader("alice");
  const state = app.handle.state();
  expect(state.status).toBe("ready");
  if (state.status === "ready")
    expect(state.projection.notes.filter((note) => note.id === "private")).toHaveLength(2);
});

test("drafts change only preview; switching readers cannot silently discard them", async () => {
  const app = await NotesSession.create();
  await app.setMode("draft");
  const before = app.export();
  await app.put({
    id: "draft",
    audience: "document",
    title: "Uncommitted",
    body: "Only in memory.",
  });
  expect(app.export()).toEqual(before);
  expect(app.handle.draft()?.preview.notes).toHaveLength(4);
  await expect(app.switchReader("bob")).rejects.toThrow("Commit or discard");
  expect(app.reader).toBe("alice");
  await app.commit();
  expect(app.handle.draft()).toBeNull();
  expect(app.export()).not.toEqual(before);
  await app.put({ id: "discard", audience: "document", title: "Throw away", body: "Not saved." });
  const committed = app.export();
  await app.discard();
  expect(app.export()).toEqual(committed);
});

test("removal preserves shared history, rotates future protection and readmission restores access", async () => {
  const app = await NotesSession.create();
  await app.setBobAccess("document", false);
  await app.put({
    id: "after",
    audience: "document",
    title: "After removal",
    body: "Future protected event.",
  });
  await app.switchReader("bob");
  expect(app.canWrite("document")).toBe(false);
  const state = app.handle.state();
  expect(state.status).toBe("ready");
  if (state.status === "ready") {
    expect(state.projection.notes).toHaveLength(2);
    expect(state.projection.notes.some((note) => note.id === "after")).toBe(false);
    expect(state.lockedEntries).toBe(2);
  }
  await app.switchReader("alice");
  await app.setBobAccess("document", true);
  await app.switchReader("bob");
  const admitted = app.handle.state();
  if (admitted.status === "ready")
    expect(admitted.projection.notes.some((note) => note.id === "after")).toBe(true);
});

test("signature tampering removes trusted state; restoring returns identical verified bytes", async () => {
  const app = await NotesSession.create();
  const before = app.export();
  await app.tamper();
  expect(app.handle.state()).toEqual({ status: "inspection", reason: "invalid" });
  expect((await app.handle.verify()).integrity).toBe("invalid");
  expect(app.canWrite("document")).toBe(false);
  await app.restore();
  expect(app.export()).toEqual(before);
  expect((await app.handle.verify()).integrity).toBe("valid");
});

test("file round trips preserve signatures and ciphertext; exports contain no private note plaintext", async () => {
  const app = await NotesSession.create();
  const before = app.export();
  expect(app.json).not.toContain("The quiet notebook");
  expect(app.json).not.toContain("A little space for Alice");
  await app.switchReader("bob");
  await app.load(before);
  expect(app.export()).toEqual(before);
  expect((await app.handle.verify()).integrity).toBe("valid");
});

test("malformed and oversized imports never replace trusted state silently", async () => {
  const app = await NotesSession.create();
  const before = app.export();
  await expect(app.load(new Uint8Array(2 * 1024 * 1024 + 1))).rejects.toThrow("2 MiB");
  expect(app.export()).toEqual(before);
  await app.applyJson("not JSON");
  expect(app.handle.state().status).toBe("inspection");
  expect(app.json).toBe("not JSON");
  await app.restore();
  expect(app.export()).toEqual(before);
});

test("a valid foreign model stays inspectable without being treated as tampered or trusted notes", async () => {
  const app = await NotesSession.create();
  const foreign = value(
    await createDocument({
      identity: value(await generateIdentity()),
      model: { ...notesModel, ref: { id: "another.application", version: 1 } },
      system: createStandardSystemProfile(),
    }),
  );
  await app.load(foreign.export());
  expect((await app.handle.verify()).integrity).toBe("valid");
  expect(app.handle.state()).toEqual({ status: "inspection", reason: "incompatible" });
  expect(app.canWrite("document")).toBe(false);
});

test("the retired Concord container stays inspectable without being converted into trusted notes", async () => {
  const app = await NotesSession.create();
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      format: "concord-ledger",
      version: "1",
      head: null,
      commits: {},
      entries: {},
    }),
  );
  await app.load(bytes);
  expect(app.handle.state().status).toBe("inspection");
  expect((await app.handle.verify()).integrity).not.toBe("valid");
  expect(app.canWrite("document")).toBe(false);
  expect(app.export()).toEqual(bytes);
});
