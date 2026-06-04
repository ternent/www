import type { RouteModule } from "@/routes/types";
import armourRoutes from "./armour";
import concordRoutes from "./concord";
import identityRoutes from "./identity";
import ledgerRoutes from "./ledger";
import sealRoutes from "./seal";

const suiteRoutes: RouteModule = [
  ...armourRoutes,
  ...concordRoutes,
  ...identityRoutes,
  ...ledgerRoutes,
  ...sealRoutes,
];

export default suiteRoutes;
