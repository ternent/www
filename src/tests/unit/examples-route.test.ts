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

test("document navigation keeps keyboard focus and the same verified document in the app shell", async () => {
  const { router, wrapper } = await open("/examples", true);
  const head = wrapper.get(".head-label").text();
  const jsonLink = wrapper.get<HTMLAnchorElement>('.view-bar a[href="/examples/json"]');
  jsonLink.element.focus();
  await jsonLink.trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.path).toBe("/examples/json");
  expect(document.activeElement).toBe(jsonLink.element);
  expect(jsonLink.attributes("aria-current")).toBe("page");
  expect(wrapper.get(".head-label").text()).toBe(head);
  expect(wrapper.find(".site-footer").exists()).toBe(false);
  expect(wrapper.find(".examples-header").exists()).toBe(true);
}, 15_000);

test("old playground inspector URLs redirect to examples while retaining query and selection", async () => {
  const { router, wrapper } = await open("/playground/json?source=bookmark#stored-entry");
  expect(router.currentRoute.value.fullPath).toBe("/examples/json?source=bookmark#stored-entry");
  expect(wrapper.find("#raw-json").exists()).toBe(true);
  expect(wrapper.findAll(".concord-examples")).toHaveLength(1);
}, 15_000);

test("direct inspector URLs preserve the real document, selected reader and unapplied JSON across navigation", async () => {
  const { router, wrapper } = await open("/examples/json");
  expect(router.currentRoute.value.path).toBe("/examples/json");
  const originalHead = wrapper.get(".head-label").text();
  const raw = wrapper.get<HTMLTextAreaElement>("#raw-json").element.value + "\n  ";
  await wrapper.get("#raw-json").setValue(raw);
  await router.push("/examples/history");
  await flushPromises();
  const bob = wrapper.findAll(".identity-button").find((button) => button.text().includes("Bob"))!;
  await bob.trigger("click");
  await vi.waitFor(() => expect(bob.attributes("aria-pressed")).toBe("true"));
  await router.push("/examples/json");
  await flushPromises();
  expect(wrapper.get<HTMLTextAreaElement>("#raw-json").element.value).toBe(raw);
  expect(wrapper.get(".head-label").text()).toBe(originalHead);
  expect(wrapper.get(".status-strip").text()).toContain("2 readable notes");
}, 15_000);

test("unsubmitted note text survives inspector navigation and cannot be silently assigned to another reader", async () => {
  const { router, wrapper } = await open("/examples");
  await wrapper.get("#note-title").setValue("Still just in the editor");
  await flushPromises();
  const bob = wrapper.findAll(".identity-button").find((button) => button.text().includes("Bob"))!;
  expect(bob.attributes("disabled")).toBeDefined();
  await router.push("/examples/verification");
  await flushPromises();
  expect(wrapper.get(".draft-banner").text()).toContain("Unsubmitted editor text");
  await router.push("/examples");
  await flushPromises();
  expect(wrapper.get<HTMLInputElement>("#note-title").element.value).toBe(
    "Still just in the editor",
  );
}, 15_000);
