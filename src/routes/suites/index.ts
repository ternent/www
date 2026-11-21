import type { RouteModule } from "@/routes/types";
const sections: Record<string, string> = {
  concord: "concord",
  ledger: "history",
  identity: "identity",
  armour: "encryption",
  seal: "verification",
};
const suiteRoutes: RouteModule = Object.entries(sections).map(([path, section]) => ({
  path: `/${path}`,
  redirect: () => ({ path: "/", hash: `#${section}` }),
}));
export default suiteRoutes;
