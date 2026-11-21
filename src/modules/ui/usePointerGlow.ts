import { onBeforeUnmount, onMounted, type Ref } from "vue";

export function usePointerGlow(surface: Ref<HTMLElement | null>) {
  let frame = 0;
  let pointer: MediaQueryList | undefined;
  let motion: MediaQueryList | undefined;
  let x = 0;
  let y = 0;

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    surface.value?.style.removeProperty("--pointer-visible");
  }
  function move(event: PointerEvent) {
    if (!pointer?.matches || motion?.matches || event.pointerType === "touch") return;
    x = event.clientX;
    y = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      surface.value?.style.setProperty("--pointer-x", `${x}px`);
      surface.value?.style.setProperty("--pointer-y", `${y}px`);
      surface.value?.style.setProperty("--pointer-visible", "1");
    });
  }
  function leave(event: PointerEvent) {
    if (!event.relatedTarget) reset();
  }

  onMounted(() => {
    pointer = window.matchMedia("(pointer: fine)");
    motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    pointer.addEventListener("change", reset);
    motion.addEventListener("change", reset);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", leave);
    window.addEventListener("blur", reset);
  });
  onBeforeUnmount(() => {
    reset();
    pointer?.removeEventListener("change", reset);
    motion?.removeEventListener("change", reset);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerout", leave);
    window.removeEventListener("blur", reset);
  });
}
