import { onBeforeUnmount, onMounted, type Ref } from "vue";

export function useStoryMotion(root: Ref<HTMLElement | null>) {
  let observer: IntersectionObserver | undefined;
  let preference: MediaQueryList | undefined;
  const animations = new Set<Animation>();

  function stop() {
    observer?.disconnect();
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  }

  function reveal(element: HTMLElement, delay = 0) {
    if (!element.animate) return;
    const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 650,
      delay,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "backwards",
    });
    animations.add(animation);
    animation.onfinish = () => animations.delete(animation);
  }

  onMounted(() => {
    const element = root.value;
    if (!element) return;
    preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    preference.addEventListener("change", stop);
    if (preference.matches) return;

    const hero = element.querySelector(".story-hero");
    // Deep links should land on readable content without replaying the offscreen hero.
    if (hero && hero.getBoundingClientRect().bottom > 0) {
      hero
        .querySelectorAll<HTMLElement>(
          ".eyebrow, .hero-line, .hero-description, .hero-actions, .hero-footnote",
        )
        .forEach((item, index) => reveal(item, index * 85));
    }

    if (!window.IntersectionObserver) return;
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target as HTMLElement);
          observer?.unobserve(entry.target);
        }
      },
      { threshold: 0.12 },
    );
    element
      .querySelectorAll<HTMLElement>(
        ".story-section > div, .story-section > .section-intro, .flow li, .architecture-node, .about-section > *",
      )
      .forEach((item) => observer?.observe(item));
  });

  onBeforeUnmount(() => {
    stop();
    preference?.removeEventListener("change", stop);
  });
}
