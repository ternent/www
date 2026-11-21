import { test, expect } from "vitest";
import {
  createSample, openRuntime, getData, verifyArtifact, orderedCommits,
  alterPayload, stateFingerprint, type DataState,
} from "../../modules/playground/runtime";

test("a fresh runtime reconstructs state from encrypted history and reports real intermediate changes", async () => {
  const original = await createSample();
  const artifact = await original.app.exportLedger();
  const identity = original.identity;
  const expected = getData(original);
  const fingerprint = await stateFingerprint(expected);
  expect(expected).toEqual({ project: "Orbit", version: 2, settings: { visibility: "private", region: "eu" } });
  expect(orderedCommits(artifact).map(commit => commit.metadata?.message || "Genesis")).toEqual([
    "Genesis", "Initialise document", "Set preferences", "Rename project", "Publish revision",
  ]);
  expect(Object.keys(artifact.entries)).toHaveLength(5);
  expect(Object.values(artifact.entries).every(entry => entry.payload.type === "encrypted")).toBe(true);
  expect(JSON.stringify(artifact)).not.toContain("Northstar");
  expect(JSON.stringify(artifact)).not.toContain("Orbit");
  expect(JSON.stringify(artifact)).not.toContain(identity.material.seed);

  await original.app.destroy();
  expect(getData(original)).toEqual({});
  // Verification receives no original identity, and has no decryptor.
  expect((await verifyArtifact(artifact)).valid).toBe(true);

  const trace: DataState[] = [];
  const replayedIds: string[] = [];
  const rebuilt = await openRuntime(identity, artifact, (state, entry) => {
    trace.push(state);
    replayedIds.push(entry.entryId);
  });
  try {
    expect(trace).toHaveLength(5);
    expect(trace[0]).toEqual({ project: "Northstar" });
    expect(trace[1].version).toBe(1);
    expect(trace[3].project).toBe("Orbit");
    expect(trace[4].version).toBe(2);
    expect(getData(rebuilt)).toEqual(expected);
    expect(await stateFingerprint(getData(rebuilt))).toBe(fingerprint);
    expect(replayedIds).toEqual(orderedCommits(artifact).flatMap(commit => commit.entryIds));
    expect(await rebuilt.app.exportLedger()).toEqual(artifact);
  } finally {
    await rebuilt.app.destroy();
  }
}, 30000);

test("one changed ciphertext byte fails public verification and never reaches a replay plugin", async () => {
  const runtime = await createSample();
  try {
    const artifact = await runtime.app.exportLedger();
    const alteration = alterPayload(artifact);
    const original = artifact.entries[alteration.entryId].payload.data as string;
    const changed = alteration.container.entries[alteration.entryId].payload.data as string;
    expect(original).toHaveLength(changed.length);
    expect([...original].filter((char, index) => char !== changed[index])).toHaveLength(1);
    expect((await verifyArtifact(artifact)).valid).toBe(true);
    const rejected = await verifyArtifact(alteration.container);
    expect(rejected.valid).toBe(false);
    expect(rejected.payloadHashesValid).toBe(false);
    let applied = 0;
    await expect(openRuntime(runtime.identity, alteration.container, () => { applied += 1; }))
      .rejects.toThrow();
    expect(applied).toBe(0);
    expect(getData(runtime).project).toBe("Orbit");
  } finally {
    await runtime.app.destroy();
  }
}, 30000);

test("an unrelated identity cannot reconstruct the encrypted state", async () => {
  const runtime = await createSample();
  const stranger = await openRuntime();
  let reopened: Awaited<ReturnType<typeof openRuntime>> | undefined;
  try {
    const artifact = await runtime.app.exportLedger();
    try { reopened = await openRuntime(stranger.identity, artifact); } catch { /* Decryption may reject. */ }
    if (reopened) expect(getData(reopened)).toEqual({});
    expect((await verifyArtifact(artifact)).valid).toBe(true);
  } finally {
    await reopened?.app.destroy();
    await stranger.app.destroy();
    await runtime.app.destroy();
  }
}, 30000);
