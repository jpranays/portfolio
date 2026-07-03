import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useAccent, ACCENTS } from "../../hooks/useAccent";
import { useOverlay } from "../../hooks/useOverlay";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { Kbd } from "../ui/Kbd";
import { cn } from "../../utils/cn";

/**
 * AccentPicker — an actual picker at last (DESIGN-V2 §EXTRAS 4, A4, A5).
 *
 * Exports AccentPopover({ open, onClose, anchorRef }): a Panel-styled
 * popover of 6 labeled radio swatches (Signal / Ion / Photon / Ember /
 * Pulse / Mono) anchored above the status-bar swatch button.
 *
 *   - proper radiogroup semantics: role="radio", aria-checked, roving
 *     tabindex, arrow-key navigation (select follows focus)
 *   - Kbd 1–6 hotkeys while open
 *   - picks go through useAccent → html[data-accent] + localStorage
 *     'pj-accent' + exactly ONE 400ms variable transition per pick
 *     (instant under prefers-reduced-motion — the hook and the global
 *     CSS kill-switch both guard it)
 *   - the mono accent's selected state carries a check glyph + weight +
 *     wash, never color alone (non-color affordance contract)
 *   - focus trap / restore / Escape / scroll lock via useOverlay
 *
 * No auto-cycle, no style injection, no color literals — the entire old
 * injectStyle()/setInterval machinery is gone by design.
 */

const POPOVER_GAP = 8; /* px between anchor top and popover bottom */

export function AccentPopover({ open, onClose, anchorRef }) {
  const { accent, setAccent } = useAccent();
  const reduced = useMotionPreference();
  const initialFocusRef = useRef(null);
  const { containerRef, overlayProps } = useOverlay({ open, onClose, initialFocusRef });
  const itemRefs = useRef({});
  const [pos, setPos] = useState({ right: 16, bottom: 56 });

  /* ── Anchor-relative position: opens ABOVE the status-bar swatch ── */
  useLayoutEffect(() => {
    if (!open) return undefined;
    const compute = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        right: Math.max(8, window.innerWidth - rect.right),
        bottom: Math.max(8, window.innerHeight - rect.top + POPOVER_GAP),
      });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open, anchorRef]);

  /* ── Kbd 1–6 hotkeys while open ── */
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      const index = Number.parseInt(event.key, 10) - 1;
      if (Number.isNaN(index) || index < 0 || index >= ACCENTS.length) return;
      event.preventDefault();
      setAccent(ACCENTS[index].key);
      itemRefs.current[ACCENTS[index].key]?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setAccent]);

  /* ── Radio pattern: arrows move focus AND selection ── */
  const onGroupKeyDown = useCallback(
    (event) => {
      const current = ACCENTS.findIndex((a) => a.key === accent);
      let next = null;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        next = (current + 1) % ACCENTS.length;
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        next = (current - 1 + ACCENTS.length) % ACCENTS.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = ACCENTS.length - 1;
      }
      if (next == null) return;
      event.preventDefault();
      const target = ACCENTS[next];
      setAccent(target.key);
      itemRefs.current[target.key]?.focus();
    },
    [accent, setAccent]
  );

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[9990]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose?.();
          }}
        >
          <motion.div
            ref={containerRef}
            {...overlayProps}
            aria-label="Accent color"
            initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: reduced ? 0 : 0.16, ease: [0.32, 0.72, 0, 1] }}
            style={{ position: "fixed", right: pos.right, bottom: pos.bottom, transformOrigin: "bottom right" }}
            className="w-56 rounded-overlay border border-hairline bg-surface-1 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
          >
            <p className="px-2 pb-1 pt-0.5 font-mono text-xs font-medium text-secondary" aria-hidden="true">
              accent --set
            </p>
            <div role="radiogroup" aria-label="Accent color" onKeyDown={onGroupKeyDown}>
              {ACCENTS.map((item, index) => {
                const checked = accent === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    ref={(el) => {
                      itemRefs.current[item.key] = el;
                      if (checked) initialFocusRef.current = el;
                    }}
                    onClick={() => setAccent(item.key)}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2.5 rounded-panel px-2 text-left text-[13px] transition-colors duration-fast",
                      checked
                        ? "bg-accent-dim font-medium text-primary"
                        : "text-secondary hover:bg-surface-2 hover:text-primary"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 rounded-full border border-strong"
                      style={{ backgroundColor: `var(${item.swatchVar})` }}
                    />
                    <span className="flex-1">{item.label}</span>
                    {/* non-color selected affordance — required for MONO */}
                    <Check
                      aria-hidden="true"
                      className={cn("h-3.5 w-3.5 shrink-0 text-accent-text", !checked && "invisible")}
                    />
                    <Kbd aria-hidden="true">{index + 1}</Kbd>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* A4: AccentPicker.jsx re-exports the accent hook + list */
export { useAccent, ACCENTS };

export default AccentPopover;
