import type { RouteModule } from "@/routes/types";
import { DEFAULT_ENCRYPTED_IDENTITY_STORAGE_KEY } from "@/modules/demo-identity/runtime";

function hasStoredDemoIdentity(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.localStorage.getItem(DEFAULT_ENCRYPTED_IDENTITY_STORAGE_KEY));
}

const demoIdentityRoutes: RouteModule = [
  {
    path: "/demo/identity",
    redirect: () => (hasStoredDemoIdentity() ? "/demo/identity/login" : "/demo/identity/create"),
  },
  {
    path: "/demo/identity/create",
    name: "demo-identity-create",
    component: () => import("./RouteDemoIdentity.vue"),
    props: { mode: "create" },
  },
  {
    path: "/demo/identity/recover",
    name: "demo-identity-recover",
    component: () => import("./RouteDemoIdentity.vue"),
    props: { mode: "recover" },
  },
  {
    path: "/demo/identity/login",
    name: "demo-identity-login",
    component: () => import("./RouteDemoIdentity.vue"),
    props: { mode: "login" },
  },
];

export default demoIdentityRoutes;
