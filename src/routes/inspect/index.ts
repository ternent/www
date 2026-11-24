import type { RouteModule } from "@/routes/types";

const component = () => import("./RouteInspect.vue");
const routes: RouteModule = [
  { path: "/inspect", name: "inspect", component },
  ...["entries", "history", "json", "verification"].map((view) => ({
    path: `/inspect/${view}`,
    component,
    meta: { inspectorView: view },
  })),
];
export default routes;
