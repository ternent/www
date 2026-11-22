import type { RouteModule } from "@/routes/types";
import { sectionPaths } from "./navigation";

// Story aliases share a component; the playground has its own reading surface.
const component = () => import("./RouteHome.vue");
const playground = () => import("./RoutePlayground.vue");
const homeRoutes: RouteModule = [
  ...Object.entries(sectionPaths)
    .filter(([section]) => section !== "playground")
    .map(([section, path]) => ({
      path,
      name: section === "overview" ? "home" : `story-${section}`,
      component,
      meta: { storySection: section },
    })),
  { path: "/playground", name: "playground", component: playground },
  ...["history", "json", "verification"].map((view) => ({
    path: `/playground/${view}`,
    component: playground,
    meta: { playgroundView: view },
  })),
];

export default homeRoutes;
