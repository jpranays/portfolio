import { useEffect } from "react";
import { useMotionPreference } from "../../hooks/useMotionPreference";

/**
 * useCursorGlow — Linear-style cursor-tracked border glow (DESIGN-V2
 * §EXTRAS 10). Attach to a Panel host element: sets --glow-x/--glow-y (px,
 * relative to the host) on pointermove and toggles data-glow="on" while
 * hovered. The visual lives in globals.css (.panel-glow — masked 1px border
 * ring, transform-composited gradient dot).
 *
 * pointer:fine only; fully disabled under prefers-reduced-motion (both via
 * this hook and the .panel-glow media query in globals.css).
 *
 * Writes are rAF-throttled: at most one getBoundingClientRect + one style
 * write per frame, so tracking never contends with scroll/layout.
 *
 * @param {object}  ref             React ref to the host element
 * @param {boolean} [enabled=true]  gate so callers can keep hook order stable
 */
export function useCursorGlow(ref, enabled = true) {
  const reduced = useMotionPreference();

  useEffect(() => {
    if (!enabled || reduced) return undefined;
    if (typeof window === "undefined") return undefined;
    if (!window.matchMedia("(pointer: fine)").matches) return undefined;

    const el = ref.current;
    if (!el) return undefined;

    let raf = 0;
    let lastX = 0;
    let lastY = 0;

    const flush = () => {
      raf = 0;
      if (!el.isConnected) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--glow-x", `${lastX - rect.left}px`);
      el.style.setProperty("--glow-y", `${lastY - rect.top}px`);
    };

    const onMove = (event) => {
      lastX = event.clientX;
      lastY = event.clientY;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const onEnter = (event) => {
      /* Seed the position BEFORE the glow fades in — no jump from the
         previous hover's coordinates. */
      lastX = event.clientX;
      lastY = event.clientY;
      flush();
      el.setAttribute("data-glow", "on");
    };
    const onLeave = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      el.removeAttribute("data-glow");
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointercancel", onLeave);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointercancel", onLeave);
      el.removeAttribute("data-glow");
      el.style.removeProperty("--glow-x");
      el.style.removeProperty("--glow-y");
    };
  }, [ref, enabled, reduced]);
}

/**
 * Compat stub: the old full-screen spotlight wash is deleted by design —
 * the glow now lives on panels via useCursorGlow (Panel's `glow` prop).
 * Kept as a null render so the pre-integration App.jsx still compiles;
 * integration removes the usage.
 */
export function CursorSpotlight() {
  return null;
}

export default CursorSpotlight;
