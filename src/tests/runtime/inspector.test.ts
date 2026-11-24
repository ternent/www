import { beforeAll, expect, test } from "vite-plus/test";
import { createLedger } from "@ternent/ledger";
import { createDocument } from "@ternent/concord";
import { createStandardSystemProfile } from "@ternent/concord/system";
import { generateIdentity } from "@ternent/armour";
import { inspectDocument, MAX_FILE_BYTES } from "../../modules/inspector/document";
import {
  applyInspectionContext,
  sendToInspector,
  takeInspection,
  type InspectionContext,
} from "../../modules/inspector/handoff";
import { notesModel } from "../../modules/examples/model";

const encode = (input: string) => new TextEncoder().encode(input);
let ledgerBytes: Uint8Array;
let concordBytes: Uint8Array;
let malformedDeclaration: Uint8Array;
let exampleContext: InspectionContext;
let laterConcordBytes: Uint8Array;
beforeAll(async () => {
  const generated = await generateIdentity();
  if (!generated.ok) throw new Error(generated.error.code);
  const signer = generated.value;
  const ledger = await createLedger({ signer });
  await ledger.create();
  await ledger.append({
    kind: "receipt",
    payload: { total: 120, description: "A public receipt" },
  });
  await ledger.commit();
  ledgerBytes = encode(`\n${JSON.stringify(await ledger.export(), null, 2)}\n`);
  const created = await createDocument({
    identity: signer,
    system: createStandardSystemProfile(),
    model: { ...notesModel, ref: { id: "a.foreign.application", version: 4 } },
  });
  if (!created.ok) throw new Error(created.error.code);
  const written = await created.value.dispatch("put", {
    id: "secret",
    audience: "document",
    title: "My private title",
    body: "Do not expose this plaintext",
  });
  if (!written.ok) throw new Error(written.error.code);
  concordBytes = created.value.export();
  exampleContext = { label: "Example snapshot", report: created.value.inspect() };
  const later = await created.value.dispatch("put", {
    id: "later",
    audience: "document",
    title: "Later state",
    body: "A different committed head",
  });
  if (!later.ok) throw new Error(later.error.code);
  laterConcordBytes = created.value.export();
  const unusual = await createLedger({ signer });
  await unusual.create({ metadata: { concord: { unexpected: true } } });
  malformedDeclaration = encode(JSON.stringify(await unusual.export()));
});

test("example reader inspection is applied only to its matching verified snapshot and never changes exported bytes", async () => {
  const doc = await inspectDocument(concordBytes);
  expect(doc.inspection?.concord?.application).toBe("not-run");
  applyInspectionContext(doc, exampleContext);
  expect(doc.contextLabel).toBe("Example snapshot");
  expect(doc.inspection?.concord?.application).toBe("valid");
  expect(doc.bytes).toEqual(concordBytes);
  expect(doc.source).not.toContain("My private title");
});

test("a stale reader inspection cannot be applied to a different committed head", async () => {
  const doc = await inspectDocument(laterConcordBytes);
  expect(doc.inspection?.verification.integrity).toBe("valid");
  applyInspectionContext(doc, exampleContext);
  expect(doc.contextLabel).toBeUndefined();
  expect(doc.inspection?.concord?.application).toBe("not-run");
});

test("the in-memory inspector hand-off copies its bytes and can be consumed only once", () => {
  const input = new Uint8Array(concordBytes);
  sendToInspector({ bytes: input, name: "example.json", context: exampleContext });
  input.fill(0);
  expect(takeInspection()?.bytes).toEqual(concordBytes);
  expect(takeInspection()).toBeNull();
});

test("malformed Concord declarations cannot hide an otherwise inspectable, signed Ledger container", async () => {
  const doc = await inspectDocument(malformedDeclaration);
  expect(doc.inspection?.verification.integrity).toBe("valid");
  expect(doc.inspection?.history).toHaveLength(1);
  expect(doc.inspection?.concord?.verification.integrity).toBe("invalid");
  expect(doc.inspection?.concord?.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "SCHEMA_INVALID",
        path: "/commits/0/subject/metadata/concord",
      }),
    ]),
  );
  expect(doc.bytes).toEqual(malformedDeclaration);
});

test("standalone Ledger history verifies without a Concord model and preserves exact input bytes", async () => {
  const input = new Uint8Array(ledgerBytes);
  const doc = await inspectDocument(input, "receipt.json");
  expect(doc.kind).toBe("ledger");
  expect(doc.inspection?.verification).toMatchObject({
    integrity: "valid",
    checkedCommits: 2,
    checkedEntries: 1,
  });
  expect(doc.inspection?.concord).toBeUndefined();
  expect(doc.inspection?.snapshot?.entries[0]?.subject.payload.data).toEqual({
    total: 120,
    description: "A public receipt",
  });
  expect(doc.source).toBe(new TextDecoder().decode(ledgerBytes));
  input.fill(0);
  expect(doc.bytes).toEqual(ledgerBytes);
});

test("foreign Concord models retain valid Ledger signatures and report unavailable replay requirements", async () => {
  const doc = await inspectDocument(concordBytes);
  expect(doc.kind).toBe("concord");
  expect(doc.inspection?.verification.integrity).toBe("valid");
  expect(doc.inspection?.concord?.system).toBe("not-run");
  expect(doc.inspection?.concord?.application).toBe("not-run");
  expect(doc.inspection?.concord?.requirements).toContainEqual({
    kind: "model",
    ref: { id: "a.foreign.application", version: 4 },
  });
  expect(doc.inspection?.concord?.lockedEntries).toBeNull();
  expect(doc.source).not.toContain("My private title");
  expect(doc.source).not.toContain("Do not expose this plaintext");
});

test("tampered signatures retain inspectable records with an explicit failed integrity result", async () => {
  const parsed = JSON.parse(new TextDecoder().decode(ledgerBytes));
  parsed.commits.at(-1).signature = "A".repeat(86);
  const doc = await inspectDocument(encode(JSON.stringify(parsed)));
  expect(doc.inspection?.verification.integrity).toBe("invalid");
  expect(doc.inspection?.verification.findings[0]?.code).toBe("SIGNATURE_INVALID");
  expect(doc.inspection?.history).toHaveLength(2);
  expect(doc.inspection?.snapshot?.entries).toHaveLength(1);
  expect(doc.inspection?.concord).toBeUndefined();
});

test("verification receives original bytes so duplicate keys cannot be normalized into a valid document", async () => {
  const source =
    '{"format":"ledger",' +
    JSON.stringify(JSON.parse(new TextDecoder().decode(ledgerBytes))).slice(1);
  const doc = await inspectDocument(encode(source));
  expect(doc.parsed.ok).toBe(true);
  expect(doc.inspection?.verification.integrity).toBe("invalid");
  expect(doc.inspection?.verification.findings[0]?.code).toBe("JSON_INVALID");
  expect(doc.source).toBe(source);
});

test("unsupported Ledger versions are distinguished from valid and invalid histories", async () => {
  const parsed = JSON.parse(new TextDecoder().decode(ledgerBytes));
  parsed.version = 999;
  const doc = await inspectDocument(encode(JSON.stringify(parsed)));
  expect(doc.kind).toBe("ledger");
  expect(doc.inspection?.verification.integrity).toBe("unsupported");
  expect(doc.inspection?.snapshot).toBeNull();
});

test.each([
  "null",
  '[1.25, "plain JSON", true]',
  '{"__proto__":{"polluted":true}, "html":"<script>bad()</script>"}',
  '{"value":9007199254740993, "value":1e400}',
])("generic JSON is inspectable without a claim of signature verification: %s", async (source) => {
  const doc = await inspectDocument(encode(source));
  expect(doc.parsed.ok).toBe(true);
  expect(doc.kind).toBe("json");
  expect(doc.inspection).toBeNull();
  expect(doc.source).toBe(source);
  expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
});

test("invalid JSON retains the original source as evidence rather than producing a trusted parsed view", async () => {
  const source = '{"unfinished":';
  const doc = await inspectDocument(encode(source));
  expect(doc.parsed.ok).toBe(false);
  expect(doc.inspection).toBeNull();
  expect(doc.source).toBe(source);
});

test("binary and oversized input fail explicitly", async () => {
  await expect(inspectDocument(new Uint8Array([0xff, 0xfe]))).rejects.toThrow("UTF-8");
  await expect(inspectDocument(new Uint8Array(MAX_FILE_BYTES + 1))).rejects.toThrow("16 MiB");
});
