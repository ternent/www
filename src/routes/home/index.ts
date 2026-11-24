import type { RouteModule } from "@/routes/types";
import type { RouteLocation } from "vue-router";
import { sectionPaths } from "./navigation";

// Story aliases share a component; examples have their own reading surface.
const component = () => import("./RouteHome.vue");
const examples = () => import("./RouteExamples.vue");
const homeRoutes: RouteModule = [
  ...Object.entries(sectionPaths)
    .filter(([section]) => section !== "examples")
    .map(([section, path]) => ({
      path,
      name: section === "overview" ? "home" : `story-${section}`,
      component,
      meta: { storySection: section },
    })),
  { path: "/examples", name: "examples", component: examples },
  {
    path: "/examples/seal",
    name: "seal-example",
    component: () => import("./RouteSealExample.vue"),
  },
  ...["history", "json", "verification"].map((view) => ({
    path: `/examples/${view}`,
    redirect: (to: RouteLocation) => ({ path: `/inspect/${view}`, query: to.query, hash: to.hash }),
  })),
  ...["", "/history", "/json", "/verification"].map((suffix) => ({
    path: `/playground${suffix}`,
    redirect: (to: RouteLocation) => ({
      path: suffix ? `/inspect${suffix}` : "/examples",
      query: to.query,
      hash: to.hash,
    }),
  })),
];

export default homeRoutes;
