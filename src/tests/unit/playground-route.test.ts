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

const cleanups: Array<() => void> = [];
afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

async function open(path: string) {
  await cryptoReady;
  // jsdom supplies DOM APIs; real Node Web Crypto supplies the browser's cryptographic primitives.
  vi.stubGlobal("crypto", webcrypto);
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(RouterView, { global: { plugins: [router] } });
  cleanups.push(() => wrapper.unmount());
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

test("direct inspector URLs preserve the real document, selected reader and unapplied JSON across navigation", async () => {
  const { router, wrapper } = await open("/playground/json");
  expect(router.currentRoute.value.path).toBe("/playground/json");
  const originalHead = wrapper.get(".head-label").text();
  const raw = wrapper.get<HTMLTextAreaElement>("#raw-json").element.value + "\n  ";
  await wrapper.get("#raw-json").setValue(raw);
  await router.push("/playground/history");
  await flushPromises();
  const bob = wrapper.findAll(".identity-button").find((button) => button.text().includes("Bob"))!;
  await bob.trigger("click");
  await vi.waitFor(() => expect(bob.attributes("aria-pressed")).toBe("true"));
  await router.push("/playground/json");
  await flushPromises();
  expect(wrapper.get<HTMLTextAreaElement>("#raw-json").element.value).toBe(raw);
  expect(wrapper.get(".head-label").text()).toBe(originalHead);
  expect(wrapper.get(".status-strip").text()).toContain("2 readable notes");
}, 15_000);

test("unsubmitted note text survives inspector navigation and cannot be silently assigned to another reader", async () => {
  const { router, wrapper } = await open("/playground");
  await wrapper.get("#note-title").setValue("Still just in the editor");
  await flushPromises();
  const bob = wrapper.findAll(".identity-button").find((button) => button.text().includes("Bob"))!;
  expect(bob.attributes("disabled")).toBeDefined();
  await router.push("/playground/verification");
  await flushPromises();
  expect(wrapper.get(".draft-banner").text()).toContain("Unsubmitted editor text");
  await router.push("/playground");
  await flushPromises();
  expect(wrapper.get<HTMLInputElement>("#note-title").element.value).toBe(
    "Still just in the editor",
  );
}, 15_000);
