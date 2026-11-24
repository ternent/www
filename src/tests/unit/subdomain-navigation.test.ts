import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/routes";
import { subdomainPaths } from "@/routes/home/navigation";

const template = readFileSync("index.html", "utf8");

function subdomainDestination(href: string): string | undefined {
  const script = template.match(
    /<script[^>]*data-subdomain-redirect[^>]*>([\s\S]*?)<\/script>/,
  )?.[1];
  expect(script).toBeDefined();
  const replace = vi.fn();
  runInNewContext(
    script!
      .replaceAll("__APP_SUBDOMAIN_PATHS__", JSON.stringify(subdomainPaths))
      .replaceAll("__APP_STORY_PATHS__", "{}"),
    {
      URL,
      window: { location: { href, replace }, history: { state: null } },
    },
  );
  return replace.mock.calls[0]?.[0];
}

const suites = [
  ["seal", "verification"],
  ["identity", "identity"],
  ["concord", "concord"],
  ["ledger", "history"],
  ["armour", "encryption"],
] as const;

function routerForTest() {
  return createRouter({ history: createMemoryHistory(), routes });
}

describe("suite subdomains", () => {
  it.each(suites)("maps %s to its canonical section route", (subdomain, section) => {
    const destination = subdomainDestination(`https://${subdomain}.ternent.dev/`);
    expect(destination).toBe(`https://ternent.dev/${subdomain}`);
    expect(routerForTest().resolve(new URL(destination!).pathname).meta.storySection).toBe(section);
  });

  it("preserves query strings and hashes", () => {
    expect(subdomainDestination("https://ledger.ternent.dev/?source=launch#history")).toBe(
      "https://ternent.dev/ledger?source=launch#history",
    );
  });

  it("preserves explicit paths instead of overriding shared links", () => {
    expect(
      subdomainDestination("https://seal.ternent.dev/examples/verification?example=1#proof"),
    ).toBe("https://ternent.dev/examples/verification?example=1#proof");
    expect(subdomainDestination("https://ledger.ternent.dev/ledger")).toBe(
      "https://ternent.dev/ledger",
    );
  });

  it.each([
    "https://ternent.dev/ledger",
    "https://www.ternent.dev/",
    "http://localhost:5173/",
    "https://preview.vercel.app/",
    "https://unknown.ternent.dev/",
    "https://nested.ledger.ternent.dev/",
    "https://ledger.ternent.dev.example.com/",
  ])("leaves other hosts alone: %s", (href) => {
    expect(subdomainDestination(href)).toBeUndefined();
  });

  it("keeps the destination host fixed even with a double slash in the path", () => {
    expect(subdomainDestination("https://ledger.ternent.dev//example.com/path")).toBe(
      "https://ternent.dev//example.com/path",
    );
  });
});
