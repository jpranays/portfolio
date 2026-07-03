import { memo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useOverlay } from "../../hooks/useOverlay";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { Panel } from "../ui/Panel";
import { Kbd } from "../ui/Kbd";

/**
 * ShortcutsModal — the cheat sheet (DESIGN-V2 Part B §EXTRAS (3), A4).
 *
 * Opened by the '?' key, the status-bar '?' button, or the palette entry.
 * A Panel of grouped rows with real 12px Kbd chips at AA; useOverlay handles
 * focus trap/restore, Escape, scroll lock, inert siblings. '?' also closes
 * it while open. The konami row is an aria-hidden whisper — '…you know the
 * rest' — matching the footer tease.
 *
 * Contract: `ShortcutsModal({ open, onClose })`
 */

const GROUPS = [
  {
    heading: "global",
    rows: [
      { keys: ["⌘", "K"], desc: "Command palette — search & jump" },
      { keys: ["`"], desc: "Terminal" },
      { keys: ["?"], desc: "This cheat sheet" },
    ],
  },
  {
    heading: "appearance",
    rows: [
      { keys: ["t"], desc: "Toggle theme" },
      { keys: ["1–6"], desc: "Pick an accent — inside the swatch popover" },
    ],
  },
  {
    heading: "classified",
    hidden: true,
    rows: [{ keys: ["↑", "↑", "↓", "↓"], desc: "…you know the rest" }],
  },
];

function ShortcutsModalImpl({ open, onClose }) {
  const reduced = useMotionPreference();
  const { containerRef, overlayProps } = useOverlay({ open, onClose });

  /* '?' toggles the sheet shut while open (Escape is handled by useOverlay).
     Capture phase + stopPropagation so an App-level '?' opener doesn't
     immediately re-open it. */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "?" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const dur = reduced ? 0 : 0.16;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcuts-modal"
          className="fixed inset-0 z-[80] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur, ease: "easeOut" }}
        >
          {/* Scrim — click to close */}
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Sheet — 160ms scale 0.98→1, overlay radius + the one allowed shadow */}
          <motion.div
            ref={containerRef}
            {...overlayProps}
            aria-label="Keyboard shortcuts"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.98 }}
            transition={{ duration: dur, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-md"
          >
            <Panel
              size="lg"
              header="shortcuts --list"
              headerRight={
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close shortcuts"
                  className="-my-2 -mr-2 flex h-10 w-10 items-center justify-center rounded-panel text-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-primary"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              }
              className="rounded-overlay shadow-[0_16px_48px_rgb(0_0_0/0.16)] dark:shadow-[0_16px_48px_rgb(0_0_0/0.5)]"
            >
              <div className="space-y-5">
                {GROUPS.map((group) => (
                  <section key={group.heading} aria-hidden={group.hidden || undefined}>
                    <h3 className="font-mono text-xs font-medium tracking-[0.02em] text-secondary">
                      {group.heading}
                    </h3>
                    <ul className="mt-1 divide-y divide-hairline">
                      {group.rows.map((row) => (
                        <li
                          key={row.desc}
                          className="flex min-h-[40px] items-center justify-between gap-4 py-2"
                        >
                          <span className="text-sm text-secondary">{row.desc}</span>
                          <span className="flex shrink-0 items-center gap-1">
                            {row.keys.map((k, i) => (
                              <Kbd key={`${k}-${i}`}>{k}</Kbd>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              <p className="mt-5 flex items-center justify-center gap-1.5 border-t border-hairline pt-4 font-mono text-xs text-secondary">
                press <Kbd>?</Kbd> or <Kbd>esc</Kbd> to dismiss
              </p>
            </Panel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ShortcutsModal = memo(ShortcutsModalImpl);

export { ShortcutsModal };
export default ShortcutsModal;
