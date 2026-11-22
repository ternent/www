import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { sectionPaths, subdomainPaths } from "@/routes/home/navigation";

const template = readFileSync("index.html", "utf8");
const storyPaths = Object.fromEntries(Object.entries(sectionPaths).filter(([section]) => section !== "playground").map(([section, path]) => [path, section]));

function inlineScript(marker: string) {
  const match = template.match(new RegExp(`<script[^>]*data-${marker}[^>]*>([\\s\\S]*?)</script>`));
  expect(match, `Missing parser-blocking ${marker} bootstrap`).not.toBeNull();
  return match![1]
    .replaceAll("__APP_STORY_PATHS__", JSON.stringify(storyPaths))
    .replaceAll("__APP_SUBDOMAIN_PATHS__", JSON.stringify(subdomainPaths));
}

describe("initial navigation before the app bundle", () => {
  const documentElement = { style: { visibility: "", removeProperty: vi.fn() } };
  it("redirects suite hosts in the head before any page content", () => {
    const replace = vi.fn();
    runInNewContext(inlineScript("subdomain-redirect"), {
      URL, window: { location: { href: "https://concord.ternent.dev/?source=test", replace } },
    });
    expect(replace).toHaveBeenCalledWith("https://ternent.dev/concord?source=test");
    expect(template.indexOf("data-subdomain-redirect")).toBeLessThan(template.indexOf("<body>"));
  });

  it.each(["/concord", "/ledger", "/identity", "/armour", "/seal"])("positions %s as soon as the static markup is parsed", (pathname) => {
    const scrollTo = vi.fn();
    const getElementById = vi.fn(() => ({ getBoundingClientRect: () => ({ top: 2300 }) }));
    runInNewContext(inlineScript("initial-position"), {
      window: { location: { pathname }, scrollY: 0, scrollTo, history: { state: null } },
      document: { getElementById, documentElement },
    });
    expect(getElementById).toHaveBeenCalledWith(storyPaths[pathname]);
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 2200, behavior: "instant" });
    expect(template.indexOf("data-initial-position")).toBeGreaterThan(template.indexOf('<div id="app">'));
    expect(template.indexOf("data-initial-position")).toBeLessThan(template.indexOf('src="/src/main.ts"'));
  });

  it("restores the saved refresh position instead of jumping to the section start", () => {
    const scrollTo = vi.fn();
    runInNewContext(inlineScript("initial-position"), {
      window: { location: { pathname: "/concord" }, scrollY: 0, scrollTo, history: { state: { scroll: { left: 0, top: 2510 } } } },
      document: { getElementById: vi.fn(), documentElement },
    });
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 2510, behavior: "instant" });
  });

  it("leaves non-story pages to their own navigation", () => {
    const scrollTo = vi.fn();
    runInNewContext(inlineScript("initial-position"), {
      window: { location: { pathname: "/playground/history" }, scrollY: 0, scrollTo, history: { state: null } },
      document: { getElementById: vi.fn(), documentElement },
    });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("keeps deep-link content hidden until its initial position is set", () => {
    const style = { visibility: "", removeProperty: vi.fn() };
    runInNewContext(inlineScript("subdomain-redirect"), {
      URL,
      window: { location: { href: "https://ternent.dev/concord" }, history: { state: null } },
      document: { documentElement: { style } },
    });
    expect(style.visibility).toBe("hidden");
    const scrollTo = vi.fn();
    runInNewContext(inlineScript("initial-position"), {
      window: { location: { pathname: "/concord" }, history: { state: null }, scrollY: 0, scrollTo },
      document: { documentElement: { style }, getElementById: () => ({ getBoundingClientRect: () => ({ top: 2300 }) }) },
    });
    expect(scrollTo).toHaveBeenCalled();
    expect(style.removeProperty).toHaveBeenCalledWith("visibility");
    expect(scrollTo.mock.invocationCallOrder[0]).toBeLessThan(style.removeProperty.mock.invocationCallOrder[0]);
  });
});
