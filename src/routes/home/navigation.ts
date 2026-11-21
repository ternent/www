import type { Router } from "vue-router";

export const sectionPaths = {
  overview: "/",
  idea: "/idea",
  playground: "/playground",
  "how-it-works": "/architecture",
  identity: "/identity",
  encryption: "/armour",
  verification: "/seal",
  history: "/ledger",
  concord: "/concord",
  "open-source": "/open-source",
  about: "/about",
} as const;

export type StorySection = keyof typeof sectionPaths;
const subdomainSections = {
  seal: "verification",
  identity: "identity",
  concord: "concord",
  ledger: "history",
  armour: "encryption",
} as const satisfies Record<string, StorySection>;
const scrollReplacements = new Set<string>();

export function subdomainDestination(href: string): string | undefined {
  const source = new URL(href);
  const entry = Object.entries(subdomainSections).find(
    ([subdomain]) => source.hostname === `${subdomain}.ternent.dev`,
  );
  if (!entry) return undefined;

  const destination = new URL("https://ternent.dev");
  destination.pathname = source.pathname === "/" ? sectionPaths[entry[1]] : source.pathname;
  destination.search = source.search;
  destination.hash = source.hash;
  return destination.href;
}

export function isStorySection(section: string): section is StorySection {
  return Object.hasOwn(sectionPaths, section);
}

export function legacySectionPath(hash: string): string | undefined {
  let section: string;
  try {
    section = decodeURIComponent(hash.slice(1));
  } catch {
    return undefined;
  }
  if (["playground-history", "playground-json", "playground-verification"].includes(section)) {
    return `/playground/${section.slice("playground-".length)}`;
  }
  return isStorySection(section) ? sectionPaths[section] : undefined;
}

export function isSectionScroll(fullPath: string) {
  return scrollReplacements.has(fullPath);
}

export function consumeSectionScroll(fullPath: string) {
  return scrollReplacements.delete(fullPath);
}

export async function replaceVisibleSection(router: Router, section: StorySection) {
  const current = router.currentRoute.value;
  if (current.meta.storySection === section) return;
  const target = { path: sectionPaths[section], query: current.query };
  const fullPath = router.resolve(target).fullPath;
  scrollReplacements.add(fullPath);
  try {
    const failure = await router.replace(target);
    if (failure) scrollReplacements.delete(fullPath);
  } catch {
    scrollReplacements.delete(fullPath);
  }
}
