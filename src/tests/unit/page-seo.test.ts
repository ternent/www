import { describe, expect, it } from "vitest";
import { pageSeo } from "@/app/config/page-seo";
import { sectionPaths } from "@/routes/home/navigation";

describe("page metadata", () => {
  it("consolidates the full-story aliases under the homepage canonical", () => {
    for (const [section, path] of Object.entries(sectionPaths)) {
      if (section === "playground") continue;
      expect(pageSeo(path).link[0].href).toBe("https://ternent.dev/");
    }
  });

  it("gives examples their own metadata without duplicating inspector URLs", () => {
    for (const path of ["/playground", "/playground/json", "/playground/history", "/playground/verification"]) {
      const metadata = pageSeo(path);
      expect(metadata.title).toContain("Examples");
      expect(metadata.link[0].href).toBe("https://ternent.dev/playground");
      expect(metadata.meta.find((tag) => tag.property === "og:url")?.content).toBe(metadata.link[0].href);
    }
    expect(pageSeo("/playground").title).not.toBe(pageSeo("/").title);
  });

  it("keeps identity utility pages out of search results", () => {
    for (const path of ["/demo/identity/create", "/demo/identity/login", "/demo/identity/recover"]) {
      expect(pageSeo(path).meta.find((tag) => tag.name === "robots")?.content).toBe("noindex, follow");
    }
  });
});
