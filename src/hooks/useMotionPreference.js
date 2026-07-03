import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The single reduced-motion hook (DESIGN-V2 A6) — consumed by every effect
 * (palette, terminal dock, confetti, ripple, EQ bars, count-ups, cursor glow,
 * smooth scroll). Returns true when the user prefers reduced motion, and
 * updates live if the OS setting changes.
 *
 * The global CSS kill-switch in globals.css is the safety net for anything
 * CSS-driven; this hook is for JS-driven motion.
 *
 * @returns {boolean} true when motion should be reduced/disabled
 */
export function useMotionPreference() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export default useMotionPreference;
