import { describe, expect, it } from "vitest";
import { legacySectionPath, sectionPaths } from "@/routes/home/navigation";
import { routes } from "@/routes";

function flattenPaths(input: any[], parent = ""): string[] {
  return input.flatMap((route) => {
    const path = route.path.startsWith("/")
      ? route.path
      : `${parent}/${route.path}`.replace(/\/+/g, "/");

    const own = route.path.includes(":pathMatch") ? [] : [path];
    const children = route.children ? flattenPaths(route.children, path) : [];
    return [...own, ...children];
  });
}

describe("routes", () => {
  it("includes clean section and inspector routes", () => {
    const paths = flattenPaths(routes);

    for (const path of Object.values(sectionPaths)) expect(paths).toContain(path);
    for (const view of ["json", "history", "verification"])
      expect(paths).toContain(`/playground/${view}`);
    expect(routes.find((route) => route.path === "/identity")?.redirect).toBeUndefined();
    expect(paths).toContain("/armour");
    expect(paths).toContain("/concord");
    expect(paths).toContain("/identity");
    expect(paths).toContain("/ledger");
    expect(paths).toContain("/seal");
  });

  it("serves the playground separately and preserves its inspector routes", () => {
    const home = routes.find((route) => route.path === "/")!;
    const playground = routes.find((route) => route.path === "/playground")!;
    expect(playground.component).not.toBe(home.component);
    expect(playground.meta?.storySection).toBeUndefined();
    for (const path of ["/playground/history", "/playground/json", "/playground/verification"]) {
      expect(routes.find((route) => route.path === path)?.component).toBe(playground.component);
    }
  });

  it("includes the existing identity demo routes", () => {
    const paths = flattenPaths(routes);

    expect(paths).toContain("/demo/identity/create");
    expect(paths).toContain("/demo/identity/recover");
    expect(paths).toContain("/demo/identity/login");
  });
  it("converts legacy section hashes to their clean URLs", () => {
    expect(legacySectionPath("#overview")).toBe("/");
    expect(legacySectionPath("#history")).toBe("/ledger");
    expect(legacySectionPath("#verification")).toBe("/seal");
    expect(legacySectionPath("#playground-json")).toBe("/playground/json");
    expect(legacySectionPath("#unknown")).toBeUndefined();
  });
});
