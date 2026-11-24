export type ThemeMode = "light" | "dark";

export type AppConfig = {
  appId: string;
  appTitle: string;
  defaultHost: string;
  themeName: string;
  defaultThemeMode: ThemeMode;
};

export type AppSeoConfig = {
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  lang: string;
};

export const appConfig = {
  appId: "ternentdotdev",
  appTitle: "ternent.dev",
  defaultHost: "ternent.dev",
  themeName: "obsidian-iris",
  defaultThemeMode: "dark",
} as const satisfies AppConfig;

export const appSeoConfig = {
  shortName: "ternent.dev",
  description:
    "Open-source tools for local-first, encrypted, verifiable software. Build applications on portable keys and signed history.",
  themeColor: "#67e8f9",
  backgroundColor: "#0b1217",
  lang: "en",
} as const satisfies AppSeoConfig;

export const appThemeName = "obsidian-iris";

export const appThemePrefix = appThemeName;
