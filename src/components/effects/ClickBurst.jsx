import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMotionPreference } from "../../hooks/useMotionPreference";

/**
 * ClickBurst — 24px square crosshair ping (DESIGN-V2 §EXTRAS 11, A7).
 *
 * A 1px accent square expands 0→24px with a faint center crosshair over
 * ~280ms — an instrument "ping", not confetti. Fires ONLY on primary
 * actions: elements matching [data-ping] or .btn-accent (via closest()),
 * never on every click. Keyboard-activated clicks (event.detail === 0)
 * ping at the element's center. Fully disabled under reduced motion.
 */

const PING_SELECTOR = "[data-ping], .btn-accent";
const PING_SIZE = 24; /* px — final square edge */
const PING_MS = 280; /* within the 240–300ms contract */
const MAX_CONCURRENT = 4;

let _nextId = 0;

export function ClickBurst() {
  const reduced = useMotionPreference();
  const [pings, setPings] = useState([]);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    const onClick = (event) => {
      if (reducedRef.current) return;
      const actionEl =
        event.target instanceof Element ? event.target.closest(PING_SELECTOR) : null;
      if (!actionEl) return;

      let x = event.clientX;
      let y = event.clientY;
      /* Keyboard activation reports (0,0)-ish coords — center on the element */
      if (event.detail === 0) {
        const rect = actionEl.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }

      const id = ++_nextId;
      setPings((prev) => [...prev.slice(-(MAX_CONCURRENT - 1)), { id, x, y }]);
    };

    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const remove = useCallback((id) => {
    setPings((prev) => prev.filter((p) => p.id !== id));
  }, []);

  if (reduced || pings.length === 0) return null;

  return (
    <>
      {pings.map((ping) => (
        <motion.span
          key={ping.id}
          aria-hidden="true"
          initial={{ scale: 0.15, opacity: 0.9 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: PING_MS / 1000, ease: "easeOut" }}
          onAnimationComplete={() => remove(ping.id)}
          className="pointer-events-none fixed z-[9996] block"
          style={{
            left: ping.x,
            top: ping.y,
            width: PING_SIZE,
            height: PING_SIZE,
            marginLeft: -PING_SIZE / 2,
            marginTop: -PING_SIZE / 2,
            border: "1px solid var(--ap-vivid)",
          }}
        >
          {/* center crosshair — two hairlines at low alpha */}
          <span
            className="absolute left-0 top-1/2 h-px w-full"
            style={{ backgroundColor: "var(--ap-vivid)", opacity: 0.4 }}
          />
          <span
            className="absolute left-1/2 top-0 h-full w-px"
            style={{ backgroundColor: "var(--ap-vivid)", opacity: 0.4 }}
          />
        </motion.span>
      ))}
    </>
  );
}

export default ClickBurst;
