import type { RouteRecordRaw } from "vue-router";
import demoRoutes from "./demo";
import homeRoutes from "./home";

export const routes: RouteRecordRaw[] = [
  ...demoRoutes,
  ...homeRoutes,
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];
