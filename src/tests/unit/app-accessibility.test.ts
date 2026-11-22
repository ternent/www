import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRouter, createMemoryHistory } from "vue-router";
import App from "@/App.vue";
import { replaceVisibleSection, consumeSectionScroll } from "@/routes/home/navigation";

const Story = {
  template:
    '<main id="main-content" tabindex="-1"><section id="overview"><h1>Story</h1></section><section id="idea"><h2>The idea</h2></section></main>',
};
const Examples = { template: '<main id="main-content" tabindex="-1"><h1>Examples</h1></main>' };
const cleanups: Array<() => void> = [];

async function setup() {
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 0),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: Story, meta: { storySection: "overview" } },
      { path: "/idea", component: Story, meta: { storySection: "idea" } },
      { path: "/playground", component: Examples },
      { path: "/:pathMatch(.*)*", component: Story },
    ],
  });
  await router.push("/");
  await router.isReady();
  const host = document.createElement("div");
  document.body.append(host);
  const wrapper = mount(App, {
    attachTo: host,
    global: {
      plugins: [router],
      stubs: { Logo: true, ThemeModeToggle: true },
    },
  });
  cleanups.push(() => {
    wrapper.unmount();
    host.remove();
  });
  await flushPromises();
  return { wrapper, router };
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.unstubAllGlobals();
});

describe("site keyboard navigation", () => {
  it("skips the header and focuses the main content", async () => {
    const { wrapper } = await setup();
    await wrapper.get(".skip-link").trigger("click");
    expect(document.activeElement).toBe(wrapper.get("main").element);
  });

  it("returns focus to the mobile menu button on Escape", async () => {
    const { wrapper } = await setup();
    await wrapper.get(".mobile-menu").trigger("click");
    await wrapper.get("#site-navigation").trigger("keydown", { key: "Escape" });
    expect(wrapper.get(".mobile-menu").attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(wrapper.get(".mobile-menu").element);
  });

  it("focuses the destination on navigation without stealing focus during scroll updates", async () => {
    const { wrapper, router } = await setup();
    const menu = wrapper.get(".mobile-menu").element as HTMLButtonElement;
    menu.focus();
    await replaceVisibleSection(router, "idea");
    await flushPromises();
    expect(document.activeElement).toBe(menu);
    consumeSectionScroll("/idea");
    await router.push("/playground");
    await flushPromises();
    expect(document.activeElement).toBe(wrapper.get("main h1").element);
  });
});
