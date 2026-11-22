import type { Router } from "vue-router";

export const sectionPaths = {
  overview: "/",
  idea: "/idea",
  examples: "/examples",
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
export const subdomainPaths = {
  "seal.ternent.dev": sectionPaths.verification,
  "identity.ternent.dev": sectionPaths.identity,
  "concord.ternent.dev": sectionPaths.concord,
  "ledger.ternent.dev": sectionPaths.history,
  "armour.ternent.dev": sectionPaths.encryption,
} as const;
const scrollReplacements = new Set<string>();

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
  section = section.replace(/^playground(?=-|$)/, "examples");
  if (["examples-history", "examples-json", "examples-verification"].includes(section)) {
    return `/inspect/${section.slice("examples-".length)}`;
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
