import type { RouteModule } from "@/routes/types";
import demoIdentityRoutes from "./identity";

const demoRoutes: RouteModule = [...demoIdentityRoutes];

export default demoRoutes;
