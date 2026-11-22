import { ViteSSG } from "vite-ssg";
import App from "./App.vue";
import { routes } from "./routes";
import { installAppProviders } from "./app/bootstrap/createApp";
import { consumeSectionScroll, legacySectionPath } from "./routes/home/navigation";
import registerSW from "./utils/registerSW";
import { pageSeo } from "./app/config/page-seo";

import "./themes.css";
import "./style.css";
import "./story.css";

export const createApp = ViteSSG(
  App,
  {
    routes,
    scrollBehavior(to, from, savedPosition) {
      if (consumeSectionScroll(to.fullPath)) return false;
      if (savedPosition) return { ...savedPosition, behavior: "auto" };
      const tool = (path: string) => /^\/(examples|inspect)(?:\/|$)/.exec(path)?.[1];
      if (tool(to.path) && tool(to.path) === tool(from.path)) return false;
      const section = to.meta.storySection;
      if (typeof section === "string") {
        const behavior =
          from.matched.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "smooth"
            : "auto";
        if (section === "overview") return { top: 0, behavior };
        return { el: `#${section}`, top: 100, behavior };
      }
      return { top: 0 };
    },
  },
  ({ app, router, head, isClient }) => {
    const metadata = head?.push(pageSeo("/"));
    router.afterEach((to, _from, failure) => {
      if (!failure) metadata?.patch(pageSeo(to.path));
    });
    router.beforeEach((to) => {
      if ((to.meta.storySection || to.path === "/examples") && to.hash) {
        return {
          path: legacySectionPath(to.hash) ?? to.path,
          query: to.query,
          hash: "",
          replace: true,
        };
      }
    });
    installAppProviders(app);

    if (isClient && import.meta.env.PROD) {
      registerSW();
    }
  },
);
