import { ViteSSG } from "vite-ssg";
import App from "./App.vue";
import { routes } from "./routes";
import { installAppProviders } from "./app/bootstrap/createApp";
import registerSW from "./utils/registerSW";

import "@ternent/ui/styles.css";
import "@/app/config/theme.generated";
import "@/app/config/suite-themes";
import "./style.css";

export const createApp = ViteSSG(
  App,
  {
    routes,
    scrollBehavior(to, _from, savedPosition) {
      if (savedPosition) return savedPosition;
      if (to.hash) return { el: to.hash };
      return { top: 0 };
    },
  },
  ({ app, isClient }) => {
    installAppProviders(app);

    if (isClient && import.meta.env.PROD) {
      registerSW();
    }
  },
);
