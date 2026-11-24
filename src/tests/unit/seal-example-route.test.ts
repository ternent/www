const cryptoReady = vi.hoisted(async () => {
  const { webcrypto } = await import("node:crypto");
  const { Buffer } = await import("node:buffer");
  vi.stubGlobal("Uint8Array", Object.getPrototypeOf(Buffer.prototype).constructor);
  vi.stubGlobal("crypto", webcrypto);
});
import { afterAll, afterEach, expect, test, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "@/App.vue";
import { routes } from "@/routes";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));
afterAll(() => vi.unstubAllGlobals());

test("the Seal example verifies actual bytes, detects edits without re-signing and survives navigation", async () => {
  await cryptoReady;
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/examples/seal");
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router], stubs: { ThemeModeToggle: true } } });
  cleanups.push(() => wrapper.unmount());
  await vi.waitFor(() => expect(wrapper.get(".seal-result").text()).toContain("Content verified"), {
    timeout: 5_000,
  });
  const proof = wrapper.get(".seal-proof pre").text();
  expect(JSON.parse(proof).type).toBe("seal-proof");
  await wrapper.get("#seal-content").setValue("Someone changed the bytes.");
  expect(wrapper.get(".seal-result").text()).toContain("Verify the current content");
  const verify = () => wrapper.findAll("button").find((item) => item.text() === "Verify content")!;
  await verify().trigger("click");
  await vi.waitFor(() =>
    expect(wrapper.get(".seal-result").text()).toContain("Content does not match"),
  );
  expect(wrapper.get(".verification-list").text()).toContain("Content hash matchesno");
  expect(wrapper.get(".verification-list").text()).toContain("Proof signature validyes");
  expect(wrapper.get(".seal-proof pre").text()).toBe(proof);
  await router.push("/");
  await flushPromises();
  await router.push("/examples/seal");
  await flushPromises();
  expect(wrapper.get<HTMLTextAreaElement>("#seal-content").element.value).toBe(
    "Someone changed the bytes.",
  );
  await wrapper
    .findAll("button")
    .find((item) => item.text() === "Restore original")!
    .trigger("click");
  await verify().trigger("click");
  await vi.waitFor(() => expect(wrapper.get(".seal-result").text()).toContain("Content verified"));
  expect(wrapper.get(".seal-proof pre").text()).toBe(proof);
}, 15_000);
