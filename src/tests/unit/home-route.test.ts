import { shallowMount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it } from "vitest";
import RouteHome from "@/routes/home/RouteHome.vue";
import { sectionPaths } from "@/routes/home/navigation";
import { useThemeMode } from "@/modules/ui";

describe("RouteHome", () => {
  it("keeps the story readable without the playground and switches package themes", async () => {
    const theme = useThemeMode();
    const previousMode = theme.mode.value;
    theme.setTheme("dark");
    const wrapper = shallowMount(RouteHome, {
      global: {
        stubs: {
          LedgerPlayground: true,
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
      expect(wrapper.find("#playground").exists()).toBe(false);
      expect(wrapper.find("ledger-playground-stub").exists()).toBe(false);
      expect(wrapper.find('a[href="/playground"]').exists()).toBe(true);
      expect(wrapper.find("#developers").exists()).toBe(false);
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
