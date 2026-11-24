const cryptoReady = vi.hoisted(async () => {
  const { webcrypto } = await import("node:crypto");
  const { Buffer } = await import("node:buffer");
  // jsdom and native Web Crypto must agree on the byte-array realm.
  vi.stubGlobal("Uint8Array", Object.getPrototypeOf(Buffer.prototype).constructor);
  vi.stubGlobal("crypto", webcrypto);
});
import { webcrypto } from "node:crypto";
import { flushPromises, mount } from "@vue/test-utils";
import { afterAll, afterEach, expect, test, vi } from "vitest";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { routes } from "@/routes";
import App from "@/App.vue";

const cleanups: Array<() => void> = [];
afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

async function open(path: string, withShell = false) {
  await cryptoReady;
  // jsdom supplies DOM APIs; real Node Web Crypto supplies the browser's cryptographic primitives.
  vi.stubGlobal("crypto", webcrypto);
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const host = document.createElement("div");
  document.body.append(host);
  if (withShell) {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  }
  const wrapper = mount(withShell ? App : RouterView, {
    attachTo: host,
    global: { plugins: [router], stubs: { ThemeModeToggle: true } },
  });
  cleanups.push(() => {
    wrapper.unmount();
    host.remove();
  });
  await vi.waitFor(
    () => {
      const error = wrapper.find('[role="alert"]');
      expect(error.exists(), error.exists() ? error.text() : "").toBe(false);
      expect(wrapper.findAll(".identity-button")).toHaveLength(4);
    },
    { timeout: 2_000 },
  );
  return { router, wrapper };
}

test("inspection opens the committed example in the standalone tool with its reader context", async () => {
  const { router, wrapper } = await open("/examples", true);
  expect(wrapper.get("main h1").text()).toBe("Examples");
  expect(wrapper.find(".site-header").exists()).toBe(true);
  expect(wrapper.find(".site-footer").exists()).toBe(true);
  expect(wrapper.find(".workbench-header").exists()).toBe(false);
  expect(wrapper.find('.site-header a[href="/inspect"]').exists()).toBe(false);
  expect(wrapper.get('.site-footer a[href="/inspect"]').text()).toBe("Document inspector");
  const head = wrapper.get(".head-label").attributes("title");
  expect(wrapper.find(".entry-inspector").exists()).toBe(false);
  expect(wrapper.find(".view-bar").exists()).toBe(false);
  await wrapper.get('[data-test="inspect-document"]').trigger("click");
  await vi.waitFor(() => expect(wrapper.find(".file-summary").exists()).toBe(true));
  expect(router.currentRoute.value.path).toBe("/inspect");
  expect(wrapper.get(".file-facts").text()).toContain(head);
  expect(wrapper.get(".viewer-caption").text()).toContain("Example snapshot · Alice");
  await router.push("/inspect/entries");
  await flushPromises();
  expect(wrapper.get(".readable-code").text()).toContain("A document you can take with you");
  await router.push("/examples");
  await flushPromises();
  expect(wrapper.get(".head-label").attributes("title")).toBe(head);
}, 15_000);

test("unfinished editor text survives the standalone inspector hand-off without changing the reader or history", async () => {
  const { router, wrapper } = await open("/examples", true);
  const head = wrapper.get(".head-label").attributes("title");
  await wrapper.get("#note-title").setValue("Keep this unfinished edit");
  await wrapper.get('[data-test="inspect-document"]').trigger("click");
  await vi.waitFor(() => expect(wrapper.find(".file-summary").exists()).toBe(true));
  expect(wrapper.get(".file-facts").text()).toContain(head);
  await router.push("/examples");
  await flushPromises();
  expect(wrapper.get<HTMLInputElement>("#note-title").element.value).toBe(
    "Keep this unfinished edit",
  );
  const bob = wrapper.findAll(".identity-button").find((button) => button.text().includes("Bob"))!;
  expect(bob.attributes("disabled")).toBeDefined();
  expect(wrapper.get(".head-label").attributes("title")).toBe(head);
}, 15_000);

test("the compact commit strip stages in memory while Inspector receives only committed history", async () => {
  const { router, wrapper } = await open("/examples", true);
  const head = wrapper.get(".head-label").attributes("title");
  await wrapper.get(".auto-commit input").setValue(false);
  await vi.waitFor(() =>
    expect(wrapper.get(".commit-summary").text()).toContain("Changes will be staged"),
  );
  await wrapper.get("#note-title").setValue("A staged edit");
  await wrapper.get(".note-editor").trigger("submit");
  await vi.waitFor(() => expect(wrapper.get(".commit-summary").text()).toContain("1 staged event"));
  await wrapper.get('[data-test="inspect-document"]').trigger("click");
  await vi.waitFor(() => expect(wrapper.find(".file-summary").exists()).toBe(true));
  expect(wrapper.get(".file-facts").text()).toContain(head);
  await router.push("/examples");
  await flushPromises();
  expect(wrapper.get(".commit-summary").text()).toContain("1 staged event");
  const commit = wrapper
    .findAll(".commit-strip button")
    .find((button) => button.text().includes("Commit changes"))!;
  await commit.trigger("click");
  await vi.waitFor(() => expect(wrapper.get(".head-label").attributes("title")).not.toBe(head));
  expect(wrapper.get(".commit-summary").text()).toContain("Changes will be staged");
}, 15_000);
