import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("@ternent/ui theme selectors", () => {
  it("includes both root and nested selectors for generated themes", () => {
    const thisDir = path.dirname(fileURLToPath(import.meta.url));
    const installedThemePath = path.resolve(
      thisDir,
      "../../../node_modules/@ternent/ui/src/themes/armour.css",
    );
    const localCoreThemePath = path.resolve(thisDir, "../../../../../core/packages/ui/src/themes/armour.css");
    const themePath = fs.existsSync(localCoreThemePath) ? localCoreThemePath : installedThemePath;
    const source = fs.readFileSync(themePath, "utf8");

    expect(source).toContain(':root[data-theme="armour-dark"], [data-theme="armour-dark"]');
    expect(source).toContain(':root[data-theme="armour-light"], [data-theme="armour-light"]');
  });
});
