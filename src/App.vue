<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Logo from "@/components/BrandLogo.vue";
import {
  sectionPaths,
  isStorySection,
  isSectionScroll,
  replaceVisibleSection,
} from "@/routes/home/navigation";
import ThemeModeToggle from "@/modules/ui/components/ThemeModeToggle.vue";
import { usePointerGlow } from "@/modules/ui/usePointerGlow";

const route = useRoute();
const isExamples = computed(
  () => route.path === "/examples" || route.path.startsWith("/examples/"),
);
const router = useRouter();
const background = ref<HTMLElement | null>(null);
usePointerGlow(background);
const sections = [
  ["idea", "The idea"],
  ["how-it-works", "Architecture"],
  ["open-source", "Open source"],
] as const;
const footerGroups = [
  {
    title: "Explore",
    links: [
      { label: "Overview", to: "/" },
      { label: "The idea", to: "/idea" },
      { label: "Architecture", to: "/architecture" },
      { label: "Open source", to: "/open-source" },
      { label: "Work together", to: "/about" },
    ],
  },
  {
    title: "Building blocks",
    links: [
      { label: "Identity", to: "/identity" },
      { label: "Armour", to: "/armour" },
      { label: "Seal", to: "/seal" },
      { label: "Ledger", to: "/ledger" },
      { label: "Concord", to: "/concord" },
    ],
  },
  {
    title: "Examples",
    links: [
      { label: "Rebuild from history", to: "/examples" },
      { label: "Encrypted data", to: "/examples/json" },
      { label: "Commit history", to: "/examples/history" },
      { label: "Verification", to: "/examples/verification" },
      { label: "Local identity", to: "/demo/identity" },
    ],
  },
] as const;
const architectureSections = new Set([
  "how-it-works",
  "identity",
  "encryption",
  "verification",
  "history",
  "concord",
]);
const active = ref("overview");
const menuOpen = ref(false);
const menuButton = ref<HTMLButtonElement | null>(null);
let frame = 0;
let navigationUntil = 0;
let pageSections: HTMLElement[] = [];
let navigationTimer: ReturnType<typeof setTimeout> | undefined;
let removeAfterEach: (() => void) | undefined;

function isActive(id: string) {
  if (!route.meta.storySection) return false;
  return active.value === id || (id === "how-it-works" && architectureSections.has(active.value));
}
function updateSection() {
  frame = 0;
  const offset = Math.min(window.innerHeight * 0.25, 210);
  const current =
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      ? pageSections.at(-1)
      : [...pageSections]
          .reverse()
          .find((section) => section.getBoundingClientRect().top <= offset);
  if (!current || !route.meta.storySection) return;
  active.value = current.id;
  if (performance.now() < navigationUntil) return;
  if (isStorySection(current.id)) void replaceVisibleSection(router, current.id);
}
function onScroll() {
  if (!frame) frame = requestAnimationFrame(updateSection);
}
function refreshSections() {
  pageSections = Array.from(document.querySelectorAll<HTMLElement>("main > section[id]"));
}
function startNavigation() {
  navigationUntil = performance.now() + 1600;
  menuOpen.value = false;
  clearTimeout(navigationTimer);
  navigationTimer = setTimeout(onScroll, 1600);
}
async function skipToContent() {
  menuOpen.value = false;
  await nextTick();
  document.getElementById("main-content")?.focus();
}
function closeMenu() {
  menuOpen.value = false;
  menuButton.value?.focus();
}
onMounted(() => {
  refreshSections();
  startNavigation();
  removeAfterEach = router.afterEach(async (to, from, failure) => {
    if (failure) return;
    active.value = String(to.meta.storySection ?? "overview");
    const scrolling = isSectionScroll(to.fullPath);
    if (!scrolling) startNavigation();
    await nextTick();
    refreshSections();
    if (scrolling || !from.matched.length) return;
    if (isExamples.value && (from.path === "/examples" || from.path.startsWith("/examples/")))
      return;
    const section =
      typeof to.meta.storySection === "string"
        ? document.getElementById(to.meta.storySection)
        : null;
    const heading = (section ?? document.querySelector("main"))?.querySelector<HTMLElement>(
      "h1, h2",
    );
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  clearTimeout(navigationTimer);
  removeAfterEach?.();
});
</script>
<template>
  <div v-show="!isExamples" ref="background" class="page-background" aria-hidden="true"></div>
  <a class="skip-link" href="#main-content" @click.prevent="skipToContent">Skip to content</a>
  <header v-if="isExamples" class="examples-header">
    <nav class="examples-breadcrumb" aria-label="Examples navigation">
      <RouterLink class="examples-brand" to="/" aria-label="ternent.dev home">
        <Logo aria-hidden="true" />
      </RouterLink>
      <span class="breadcrumb-divider" aria-hidden="true">/</span>
      <RouterLink class="examples-wordmark" to="/examples">Examples</RouterLink>
      <span class="examples-preview">Alpha</span>
    </nav>
    <div class="examples-header-actions">
      <RouterLink to="/">About Ternent <span aria-hidden="true">↗</span></RouterLink>
      <a
        href="https://github.com/ternent/www/tree/main/src/modules/examples"
        aria-label="Examples source on GitHub"
        >Source <span aria-hidden="true">↗</span></a
      >
      <ThemeModeToggle />
    </div>
  </header>
  <header v-else class="site-header">
    <div class="header-inner">
      <RouterLink class="brand-mark" to="/" aria-label="ternent.dev home"
        ><Logo aria-hidden="true"
      /></RouterLink>
      <button
        ref="menuButton"
        type="button"
        class="mobile-menu"
        :aria-expanded="menuOpen"
        aria-controls="site-navigation"
        @click="menuOpen = !menuOpen"
        @keydown.esc="closeMenu"
      >
        Explore <span aria-hidden="true">{{ menuOpen ? "−" : "+" }}</span>
      </button>
      <nav
        id="site-navigation"
        :class="{ open: menuOpen }"
        aria-label="Page navigation"
        @keydown.esc="closeMenu"
      >
        <RouterLink
          v-for="[id, label] in sections"
          :key="id"
          :to="sectionPaths[id]"
          :aria-current="isActive(id) ? 'location' : undefined"
          >{{ label }}</RouterLink
        >
        <a class="github-link" href="https://github.com/ternent"
          >GitHub <span aria-hidden="true">↗</span></a
        >
      </nav>
    </div>
  </header>
  <RouterView />
  <footer v-if="!isExamples" class="site-footer">
    <div class="footer-inner">
      <div class="footer-intro">
        <div>
          <RouterLink class="footer-brand" to="/">
            <Logo aria-hidden="true" /> <span>ternent.dev</span>
          </RouterLink>
          <p>Open-source tools for local-first,<br />encrypted, verifiable software.</p>
        </div>
        <a class="footer-contact" href="mailto:sam@ternent.dev">sam@ternent.dev ↗</a>
      </div>
      <nav class="footer-links" aria-label="Footer">
        <div v-for="group in footerGroups" :key="group.title" class="footer-group">
          <h2>{{ group.title }}</h2>
          <ul>
            <li v-for="link in group.links" :key="link.to">
              <RouterLink :to="link.to">{{ link.label }}</RouterLink>
            </li>
          </ul>
        </div>
        <div class="footer-group">
          <h2>Source</h2>
          <ul>
            <li><a href="https://github.com/ternent">GitHub ↗</a></li>
            <li><a href="https://github.com/ternent/core">Core libraries ↗</a></li>
            <li><a href="https://github.com/ternent/www">Website & examples ↗</a></li>
            <li><a href="https://github.com/samternent/home">Earlier work ↗</a></li>
          </ul>
        </div>
      </nav>
      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} ternent.dev</span>
        <div class="footer-appearance"><ThemeModeToggle /></div>
      </div>
    </div>
  </footer>
</template>

<style>
.examples-header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
  position: relative;
  z-index: 30;
}
.examples-breadcrumb,
.examples-header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}
.examples-header a {
  text-decoration: none;
}
.examples-brand {
  display: flex;
  align-items: center;
}
.examples-brand svg {
  width: 32px;
  height: 32px;
}
.breadcrumb-divider {
  color: var(--ui-border);
  font-size: 24px;
  font-weight: 300;
}
.examples-wordmark {
  font-size: 16px;
  font-weight: 550;
  letter-spacing: -0.3px;
}
.examples-preview {
  border: 1px solid var(--ui-border);
  border-radius: 5px;
  padding: 2px 6px;
  color: var(--ui-fg-muted);
  font-size: 11px;
}
.examples-header-actions {
  gap: 24px;
  color: var(--ui-fg-muted);
  font-size: 13px;
}
.examples-header-actions a:hover {
  color: var(--ui-fg);
}
.examples-header .theme-mode-toggle {
  min-width: 34px;
  min-height: 34px;
}
@media (max-width: 650px) {
  .examples-header {
    height: 58px;
    padding: 0 16px;
    gap: 12px;
  }
  .examples-breadcrumb {
    gap: 12px;
  }
  .examples-header-actions {
    gap: 12px;
  }
  .examples-header-actions > a {
    display: none;
  }
}
</style>
