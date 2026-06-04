import type { RouteModule } from "@/routes/types";
import suite from "./content";

const identityRoutes: RouteModule = [
  {
    path: "/identity",
    name: "suite-identity",
    component: () => import("../_shared/RouteSuiteLanding.vue"),
    meta: {
      suiteKey: suite.slug,
      suiteTheme: suite.themeName,
    },
  },
];

export default identityRoutes;
