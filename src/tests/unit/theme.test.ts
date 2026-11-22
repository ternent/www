import { describe, expect, it } from "vitest";
import { useThemeMode } from "@/modules/ui";

describe("theme mode", () => {
  it("uses the app default mode and theme prefix", () => {
    const theme = useThemeMode();
    theme.start();

    expect(theme.mode.value).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("obsidian-iris-dark");

    theme.toggleTheme();

    expect(theme.mode.value).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("obsidian-iris-light");
  });
});
