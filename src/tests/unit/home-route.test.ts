import { flushPromises, mount, shallowMount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import RouteHome from "@/routes/home/RouteHome.vue";
import { routes } from "@/routes";
import {
  consumeSectionScroll,
  replaceVisibleSection,
  sectionPaths,
} from "@/routes/home/navigation";
import { useThemeMode } from "@/modules/ui";

describe("RouteHome", () => {
  it("keeps the same story DOM during section navigation and scroll tracking", async () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router] } });
    try {
      const main = wrapper.get("main").element;
      const section = wrapper.get("#concord").element;
      await router.push("/concord");
      await flushPromises();
      expect(wrapper.get("main").element).toBe(main);
      expect(wrapper.get("#concord").element).toBe(section);
      await replaceVisibleSection(router, "history");
      await flushPromises();
      expect(wrapper.get("main").element).toBe(main);
      expect(wrapper.get("#concord").element).toBe(section);
    } finally {
      wrapper.unmount();
      consumeSectionScroll("/ledger");
    }
  });

  it("fades section content without shifting its text", () => {
    let onIntersection: IntersectionObserverCallback | undefined;
    const observer = { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(function (callback: IntersectionObserverCallback) {
        onIntersection = callback;
        return observer;
      }),
    );
    const wrapper = shallowMount(RouteHome, {
      global: {
        stubs: {
          RouterLink: { props: ["to"], template: '<a :href="to"><slot /></a>' },
        },
      },
    });

    try {
      const content = wrapper.get("#concord > div").element;
      const animate = vi.fn((_frames: Keyframe[], _options: KeyframeAnimationOptions) => ({
        cancel: vi.fn(),
        onfinish: null,
      }));
      Object.defineProperty(content, "animate", { value: animate });
      onIntersection?.(
        [{ target: content, isIntersecting: true } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver,
      );
      expect(animate).toHaveBeenCalled();
      for (const [frames] of animate.mock.calls) {
        expect(frames.every((frame) => !frame.transform || frame.transform === "none")).toBe(true);
      }
    } finally {
      wrapper.unmount();
      vi.unstubAllGlobals();
    }
  });

  it("keeps examples on their own route and switches package themes", async () => {
    const theme = useThemeMode();
    const previousMode = theme.mode.value;
    theme.setTheme("dark");
    const wrapper = shallowMount(RouteHome, {
      global: {
        stubs: {
          ArchitectureMap: false,
          RouterLink: { props: ["to"], template: '<a :href="to"><slot /></a>' },
        },
      },
    });

    try {
      await nextTick();
      expect(wrapper.get("h1").text()).toContain("signed history.");
      for (const id of ["overview", "idea", "how-it-works", "open-source", "about"]) {
        expect(wrapper.find(`#${id}`).exists()).toBe(true);
      }
      expect(wrapper.find("#examples").exists()).toBe(false);
      expect(wrapper.find('a[href="/examples"]').exists()).toBe(true);
      expect(wrapper.find("#developers").exists()).toBe(false);
      for (const [section, target] of Object.entries({
        identity: "/demo/identity",
        encryption: "/inspect/entries?example=notes&focus=encrypted-payload",
        verification: "/examples/seal",
        history: "/inspect/history?example=notes&focus=latest-commit",
        concord: "/examples",
      }))
        expect(wrapper.get(`#${section} .text-link`).attributes("href")).toBe(target);
      const diagramLinks = wrapper.get('nav[aria-label="Runtime building blocks"]').findAll("a");
      expect(diagramLinks).toHaveLength(5);
      for (const link of diagramLinks) {
        const section = Object.entries(sectionPaths).find(
          ([, path]) => path === link.attributes("href"),
        )?.[0];
        expect(section).toBeTruthy();
        expect(wrapper.find(`#${section}`).exists()).toBe(true);
      }
      const sections = {
        identity: "aurora",
        encryption: "armour",
        verification: "proof",
        history: "ledger",
        concord: "concord",
      };
      for (const mode of ["dark", "light"] as const) {
        theme.setTheme(mode);
        await nextTick();
        for (const link of diagramLinks) {
          expect(link.attributes("data-theme")).toMatch(new RegExp(`-${mode}$`));
        }
        for (const [id, name] of Object.entries(sections)) {
          expect(wrapper.get(`#${id}`).attributes("data-theme")).toBe(`${name}-${mode}`);
        }
      }
    } finally {
      wrapper.unmount();
      theme.setTheme(previousMode);
    }
  });
});
