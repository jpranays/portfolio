import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { useToast } from "./Toast";

/**
 * IntroAnimation — ≤700ms once-ever boot moment (DESIGN-V2 §EXTRAS 14).
 *
 * A status-bar-styled boot line types "pranay — session start ▊" on the
 * bare bg, then the whole frame wipes upward while the hero h1 reveal is
 * already running underneath. No progress bar, no "Loading…".
 *
 * Budget: ~310ms typing + ~140ms hold + 250ms wipe ≈ 700ms.
 * Skipped ENTIRELY on revisit (localStorage "pj-intro") and under
 * prefers-reduced-motion (which also stamps the flag — once-ever means
 * once-ever). The overlay is aria-hidden decoration; nothing announces.
 *
 * Also exports OnboardingNudge — the one-time ⌘K nudge (§EXTRAS 15 as
 * amended by A7): fires on first scroll past the hero (IntersectionObserver
 * on #work), pointer-aware copy, delivered via the toast system, persisted
 * to localStorage "pj-nudge".
 */

const INTRO_KEY = "pj-intro";
const BOOT_TEXT = "pranay — session start";
const TYPE_MS = 14; /* per char → ~310ms for the full line */
const HOLD_MS = 140;
const WIPE_S = 0.25;

function markSeen(key) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* storage unavailable — intro simply replays next visit */
  }
}

function hasSeen(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function IntroAnimation() {
  const reduced = useMotionPreference();
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && !hasSeen(INTRO_KEY)
  );
  const [chars, setChars] = useState(0);
  const [wiping, setWiping] = useState(false);

  /* Reduced motion: skip entirely, but still stamp once-ever */
  useEffect(() => {
    if (visible && reduced) {
      markSeen(INTRO_KEY);
      setVisible(false);
    }
  }, [visible, reduced]);

  /* Type → hold → wipe. Seen-flag is stamped at start so an interrupted
     boot never replays. */
  useEffect(() => {
    if (!visible || reduced) return undefined;
    markSeen(INTRO_KEY);

    let typed = 0;
    let holdTimer = null;
    const typeTimer = setInterval(() => {
      typed = Math.min(typed + 1, BOOT_TEXT.length);
      setChars(typed);
      if (typed >= BOOT_TEXT.length) {
        clearInterval(typeTimer);
        holdTimer = setTimeout(() => setWiping(true), HOLD_MS);
      }
    }, TYPE_MS);

    return () => {
      clearInterval(typeTimer);
      if (holdTimer) clearTimeout(holdTimer);
    };
  }, [visible, reduced]);

  if (!visible || reduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ y: 0 }}
      animate={wiping ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: WIPE_S, ease: [0.32, 0.72, 0, 1] }}
      onAnimationComplete={() => {
        if (wiping) setVisible(false);
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-base"
    >
      {/* status-bar-styled boot line */}
      <div className="flex h-9 items-center gap-2.5 rounded-panel border border-hairline bg-surface-0 px-4">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
        <span className="whitespace-pre font-mono text-xs font-medium text-secondary">
          {BOOT_TEXT.slice(0, chars)}
        </span>
        <span className="-ml-1 font-mono text-xs text-accent-text">▊</span>
      </div>
    </motion.div>
  );
}

/* ── one-time ⌘K nudge ────────────────────────────────────────────── */

const NUDGE_KEY = "pj-nudge";
const NUDGE_FINE = "Press ⌘K to jump anywhere";
const NUDGE_COARSE = "Tap ⌘K in the top bar to jump anywhere";

/**
 * OnboardingNudge — renders nothing; observes #work and fires the ⌘K
 * toast once, the first time the visitor scrolls past the hero.
 * Engagement-triggered (not an idle timer), pointer-aware copy.
 * Must be rendered inside ToastProvider.
 */
export function OnboardingNudge() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (hasSeen(NUDGE_KEY)) return undefined;

    const target = document.getElementById("work");
    if (!target || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        markSeen(NUDGE_KEY);
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        toastRef.current.info(coarse ? NUDGE_COARSE : NUDGE_FINE);
      },
      { threshold: 0.15 }
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  return null;
}
