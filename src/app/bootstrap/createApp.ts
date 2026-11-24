import type { App } from "vue";
import { provideTheme } from "@/app/providers/provideTheme";

export function installAppProviders(_app: App) {
  provideTheme();
}
