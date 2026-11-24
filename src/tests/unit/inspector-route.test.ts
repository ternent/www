const cryptoReady = vi.hoisted(async () => {
  const { webcrypto } = await import("node:crypto");
  const { Buffer } = await import("node:buffer");
  vi.stubGlobal("Uint8Array", Object.getPrototypeOf(Buffer.prototype).constructor);
  vi.stubGlobal("crypto", webcrypto);
});
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createLedger } from "@ternent/ledger";
import { generateIdentity } from "@ternent/armour";
import App from "@/App.vue";
import { routes } from "@/routes";
import { MAX_FILE_BYTES } from "@/modules/inspector/document";

const cleanups: Array<() => void> = [];
let signedSource: string;
beforeAll(async () => {
  await cryptoReady;
  const generated = await generateIdentity();
  if (!generated.ok) throw new Error(generated.error.code);
  const ledger = await createLedger({ signer: generated.value });
  await ledger.create();
  await ledger.append({ kind: "receipt", payload: { message: "Inspect my real signed file" } });
  await ledger.commit();
  signedSource = `\n${JSON.stringify(await ledger.export(), null, 2)}\n`;
});
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));
afterAll(() => vi.unstubAllGlobals());

function file(source: string, name: string) {
  const bytes = new TextEncoder().encode(source);
  const uploaded = new File([source], name, { type: "application/json" });
  // jsdom supplies File selection; the browser supplies File.arrayBuffer in production.
  Object.defineProperty(uploaded, "arrayBuffer", {
    value: async () => bytes.slice().buffer,
    configurable: true,
  });
  return uploaded;
}
async function setup(path = "/inspect") {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const host = document.createElement("div");
  document.body.append(host);
  const wrapper = mount(App, {
    attachTo: host,
    global: { plugins: [router], stubs: { ThemeModeToggle: true } },
  });
  cleanups.push(() => {
    wrapper.unmount();
    host.remove();
  });
  await flushPromises();
  async function drop(input: File) {
    await wrapper
      .get(".inspector-workbench")
      .trigger("drop", { dataTransfer: { types: ["Files"], files: [input] } });
  }
  return { router, wrapper, drop };
}

async function waitForPreparedView(check: () => void) {
  // Real identities, encryption and signed commits can take over a second on CI.
  await vi.waitFor(check, { timeout: 5_000 });
}

test("the actual example download opens through the inspector file picker with the same verified head", async () => {
  const { wrapper, router } = await setup("/examples");
  await waitForPreparedView(() => {
    const error = wrapper.find('[role="alert"]');
    expect(error.exists(), error.exists() ? error.text() : "").toBe(false);
    expect(wrapper.findAll(".identity-button")).toHaveLength(4);
  });
  const expectedHead = wrapper.get(".head-label").attributes("title");
  let downloaded!: Blob;
  let filename = "";
  const create = vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    downloaded = blob as Blob;
    return "blob:example-download";
  });
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
  });
  cleanups.push(() => {
    create.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });
  await wrapper.get('[data-test="export-document"]').trigger("click");
  expect(downloaded).toBeInstanceOf(Blob);
  const imported = new File([downloaded], filename, { type: "application/json" });
  Object.defineProperty(imported, "arrayBuffer", {
    value: () =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(imported);
      }),
  });
  await router.push("/inspect");
  await flushPromises();
  const input = wrapper.get<HTMLInputElement>('[aria-label="Open a JSON document"]');
  Object.defineProperty(input.element, "files", { value: [imported], configurable: true });
  await input.trigger("change");
  await vi.waitFor(() => expect(wrapper.find(".file-summary h2").exists()).toBe(true));
  expect(wrapper.get(".inspection-summary").text()).toContain("Signed history verified");
  expect(wrapper.get(".file-facts").text()).toContain(expectedHead);
}, 15_000);

test("a dropped signed file is verified read-only and retained across inspector views and tools", async () => {
  const { wrapper, router, drop } = await setup("/inspect/history");
  expect(wrapper.find(".site-header").exists()).toBe(true);
  expect(wrapper.find(".site-footer").exists()).toBe(true);
  expect(wrapper.find(".workbench-header").exists()).toBe(false);
  expect(wrapper.get("main h1").text()).toBe("Document inspector");
  expect(wrapper.get('.header-tools a[href="/inspect"]').attributes("aria-current")).toBe("page");
  await drop(file(signedSource, "my-ledger.json"));
  await vi.waitFor(() => expect(wrapper.get(".file-summary h2").text()).toBe("my-ledger.json"));
  expect(wrapper.get(".status-strip").text()).toContain("Signed history verified");
  expect(wrapper.findAll(".history-row")).toHaveLength(2);
  expect(wrapper.find('[aria-label="Document information"]').exists()).toBe(false);
  await wrapper.get('.view-bar a[href="/inspect"]').trigger("click");
  await flushPromises();
  expect(wrapper.get('[aria-label="Document information"]').text()).toContain("Commits checked");
  expect(wrapper.get(".file-facts").text()).toContain(JSON.parse(signedSource).head);
  await wrapper.get('.view-bar a[href="/inspect/history"]').trigger("click");
  await flushPromises();
  expect(wrapper.find('[aria-label="Document information"]').exists()).toBe(false);
  await wrapper.get(".entry-link").trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.path).toBe("/inspect/entries");
  expect(wrapper.get(".stored-code").text()).toContain("Inspect my real signed file");
  expect(document.activeElement).toBe(wrapper.get(".entry-inspector h2").element);
  const sourceLink = wrapper.get<HTMLAnchorElement>('.view-bar a[href="/inspect/json"]');
  sourceLink.element.focus();
  await sourceLink.trigger("click");
  await flushPromises();
  expect(wrapper.get<HTMLTextAreaElement>("#raw-json").element.value).toBe(signedSource);
  expect(wrapper.get<HTMLTextAreaElement>("#raw-json").element.readOnly).toBe(true);
  expect(document.activeElement).toBe(sourceLink.element);
  expect(wrapper.find(".raw-actions").exists()).toBe(false);
  await wrapper.get(".header-tools summary").trigger("click");
  expect(wrapper.get<HTMLDetailsElement>(".header-tools").element.open).toBe(true);
  await wrapper.get('.header-tools a[href="/examples"]').trigger("click");
  await flushPromises();
  expect(wrapper.get<HTMLDetailsElement>(".header-tools").element.open).toBe(false);
  expect(wrapper.find(".site-header").exists()).toBe(true);
  expect(wrapper.find(".site-footer").exists()).toBe(true);
  expect(wrapper.find(".workbench-header").exists()).toBe(false);
  await wrapper.get(".header-tools summary").trigger("click");
  await wrapper.get('.header-tools a[href="/inspect"]').trigger("click");
  await flushPromises();
  expect(wrapper.get<HTMLDetailsElement>(".header-tools").element.open).toBe(false);
  expect(wrapper.get(".file-facts").text()).toContain(JSON.parse(signedSource).head);
  await wrapper.get('.view-bar a[href="/inspect/json"]').trigger("click");
  await flushPromises();
  expect(wrapper.find(".site-header").exists()).toBe(true);
  expect(wrapper.find(".site-footer").exists()).toBe(true);
  expect(wrapper.find(".workbench-header").exists()).toBe(false);
  expect(wrapper.get(".file-summary h2").text()).toBe("my-ledger.json");
  expect(wrapper.get<HTMLTextAreaElement>("#raw-json").element.value).toBe(signedSource);
}, 15_000);

test("generic JSON renders escaped values and never claims supported signature verification", async () => {
  const { wrapper, drop } = await setup();
  const source = '{"html":"<img src=x onerror=alert(1)>","price":1.25}';
  await drop(file(source, "plain.json"));
  await vi.waitFor(() => expect(wrapper.find(".json-browser").exists()).toBe(true));
  expect(wrapper.find("img").exists()).toBe(false);
  expect(wrapper.get(".json-value").text()).toContain("<img src=x onerror=alert(1)>");
  expect(wrapper.get(".status-strip").text()).toContain("no signature verification");
  await wrapper.get('.view-bar a[href="/inspect/verification"]').trigger("click");
  await flushPromises();
  expect(wrapper.get(".unsupported-document").text()).toContain("No verifier for this JSON");
});

test("malformed input remains available as original source and Close returns to an empty inspector", async () => {
  const { wrapper, drop } = await setup();
  await drop(file('{"incomplete":', "broken.json"));
  await vi.waitFor(() =>
    expect(wrapper.get(".inspection-summary").text()).toContain("Invalid JSON"),
  );
  await wrapper.get('.view-bar a[href="/inspect/json"]').trigger("click");
  await flushPromises();
  expect(wrapper.get<HTMLTextAreaElement>("#document-source").element.value).toBe('{"incomplete":');
  await wrapper.get('[aria-label="Close document"]').trigger("click");
  await flushPromises();
  expect(wrapper.find(".file-summary").exists()).toBe(false);
  expect(wrapper.find(".inspector-welcome").exists()).toBe(true);
  expect(wrapper.find("#document-source").exists()).toBe(false);
  expect(document.activeElement?.textContent).toContain("Choose a file");
});

test("the latest file selection wins even if an earlier file read finishes later", async () => {
  const { wrapper, drop } = await setup();
  let finish!: (bytes: ArrayBuffer) => void;
  const slow = file('{"old":true}', "slow.json");
  Object.defineProperty(slow, "arrayBuffer", {
    value: () =>
      new Promise<ArrayBuffer>((resolve) => {
        finish = resolve;
      }),
    configurable: true,
  });
  await drop(slow);
  await drop(file('{"new":true}', "latest.json"));
  await vi.waitFor(() => expect(wrapper.get(".file-summary h2").text()).toBe("latest.json"));
  finish(new TextEncoder().encode('{"old":true}').buffer);
  await flushPromises();
  expect(wrapper.get(".file-summary h2").text()).toBe("latest.json");
  expect(wrapper.get(".json-value").text()).toContain('"new": true');
});

test("oversized and multi-file drops retain the current document and give an explicit error", async () => {
  const { wrapper, drop } = await setup();
  await drop(file('{"keep":true}', "keep.json"));
  await vi.waitFor(() => expect(wrapper.get(".file-summary h2").text()).toBe("keep.json"));
  const oversized = file("{}", "too-large.json");
  Object.defineProperty(oversized, "size", { value: MAX_FILE_BYTES + 1 });
  await drop(oversized);
  await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("16 MiB"));
  expect(wrapper.get(".file-summary h2").text()).toBe("keep.json");
  await wrapper.get(".inspector-workbench").trigger("drop", {
    dataTransfer: { types: ["Files"], files: [file("{}", "a.json"), file("{}", "b.json")] },
  });
  expect(wrapper.get('[role="alert"]').text()).toContain("one JSON file");
  expect(wrapper.get(".file-summary h2").text()).toBe("keep.json");
});

test("a fresh encrypted-payload link loads a public example and retains its document across views and browser back", async () => {
  const { wrapper, router } = await setup("/inspect/entries?example=notes&focus=encrypted-payload");
  await waitForPreparedView(() => {
    const error = wrapper.find('[role="alert"]');
    expect(error.exists(), error.exists() ? error.text() : "").toBe(false);
    expect(wrapper.find(".stored-code").exists()).toBe(true);
  });
  expect(wrapper.get(".file-summary").text()).toContain("notes-example.json");
  expect(wrapper.get(".readable-code").text()).toContain("No readable event");
  expect(wrapper.get(".stored-code").text()).not.toContain("A document you can take with you");
  expect(wrapper.get(".viewer-caption").text()).toContain("public inspection");
  const stored = wrapper.get(".stored-code").text();
  await wrapper.get('.view-bar a[href^="/inspect/history"]').trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.query.example).toBe("notes");
  expect(wrapper.findAll(".history-row").length).toBeGreaterThan(1);
  router.back();
  await vi.waitFor(() => expect(router.currentRoute.value.path).toBe("/inspect/entries"));
  await flushPromises();
  expect(wrapper.get(".stored-code").text()).toBe(stored);
  await router.push("/inspect/history?example=notes&focus=latest-commit");
  await flushPromises();
  expect(wrapper.get(".commit-detail").text()).toContain("Included entries");
  const includedId = JSON.parse(wrapper.get(".commit-detail pre").text()).subject.entryIds[0];
  await wrapper.get(".entry-link").trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.query.example).toBe("notes");
  expect(router.currentRoute.value.query.focus).toBeUndefined();
  expect(JSON.parse(wrapper.get(".stored-code").text()).id).toBe(includedId);
}, 15_000);

test("homepage presets preserve both an imported file and unfinished notes", async () => {
  const { wrapper, router, drop } = await setup("/examples");
  await waitForPreparedView(() => {
    const error = wrapper.find('[role="alert"]');
    expect(error.exists(), error.exists() ? error.text() : "").toBe(false);
    expect(wrapper.findAll(".identity-button")).toHaveLength(4);
  });
  await wrapper.get("#note-title").setValue("My unfinished work");
  await router.push("/inspect");
  await flushPromises();
  await drop(file(signedSource, "my-file.json"));
  await vi.waitFor(() => expect(wrapper.get(".file-summary h2").text()).toBe("my-file.json"));
  await router.push("/");
  await flushPromises();
  await wrapper.get("#encryption .text-link").trigger("click");
  await waitForPreparedView(() => {
    const error = wrapper.find('[role="alert"]');
    expect(error.exists(), error.exists() ? error.text() : "").toBe(false);
    expect(wrapper.find(".stored-code").exists()).toBe(true);
  });
  expect(wrapper.get(".file-summary h2").text()).toBe("notes-example.json");
  await wrapper
    .get(".inspector-workbench")
    .trigger("dragenter", { dataTransfer: { types: ["Files"] } });
  expect(wrapper.find(".drop-overlay").exists()).toBe(false);
  await drop(file(signedSource, "replacement.json"));
  expect(wrapper.get('[role="alert"]').text()).toContain("Your files");
  expect(wrapper.get(".file-summary h2").text()).toBe("notes-example.json");
  await wrapper.get('.example-banner a[href="/inspect"]').trigger("click");
  await flushPromises();
  expect(wrapper.get(".file-summary h2").text()).toBe("my-file.json");
  expect(document.activeElement).toBe(wrapper.get("main h1").element);
  expect(wrapper.get(".file-facts").text()).toContain(JSON.parse(signedSource).head);
  await router.push("/inspect?example=unknown");
  await flushPromises();
  expect(wrapper.get('[role="alert"]').text()).toContain("unavailable");
  await router.push("/inspect");
  await flushPromises();
  expect(wrapper.get(".file-summary h2").text()).toBe("my-file.json");
  await router.push("/examples");
  await flushPromises();
  expect(wrapper.get<HTMLInputElement>("#note-title").element.value).toBe("My unfinished work");
}, 15_000);
