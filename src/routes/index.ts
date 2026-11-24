import type { RouteRecordRaw } from "vue-router";
import demoRoutes from "./demo";
import homeRoutes from "./home";
import inspectRoutes from "./inspect";

export const routes: RouteRecordRaw[] = [
  ...demoRoutes,
  ...homeRoutes,
  ...inspectRoutes,
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];
