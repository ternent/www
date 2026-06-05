import type { RouteRecordRaw } from "vue-router";
import demoRoutes from "./demo";
import homeRoutes from "./home";
import suiteRoutes from "./suites";

export const routes: RouteRecordRaw[] = [
  ...demoRoutes,
  ...homeRoutes,
  ...suiteRoutes,
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];
