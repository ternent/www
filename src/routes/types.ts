import type { RouteRecordRaw } from "vue-router";

export type RouteModule = RouteRecordRaw[];

export type SuiteThemeMode = "light" | "dark";

declare module "vue-router" {
  interface RouteMeta {
    storySection?: string;
    examplesView?: string;
    suiteKey?: string;
    suiteTheme?: string;
    suiteMode?: SuiteThemeMode;
  }
}
