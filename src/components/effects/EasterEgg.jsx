import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKonamiCode } from "../../hooks/useKonamiCode";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { useToast } from "./Toast";

/**
 * EasterEgg — operator mode (DESIGN-V2 Part B §EXTRAS (12), A7).
 *
 * Unlock paths (all end up here):
 *   - Konami code on keyboard (useKonamiCode)
 *   - 7 taps on the titlebar monogram → Titlebar dispatches
 *     "portfolio:operator-unlock" (A4)
 *   - terminal `konami` command → same event
 *   - palette "unlock operator mode" action → same event
 *
 * Payoff choreography (full motion): titlebar → rail → status bar flash in
 * sequence (240ms each, body carries stage classes so chrome can also react),
 * then ONE 24-particle confetti burst in the five accent hues (hand-rolled
 * spans, no dependency) + toast "Operator mode unlocked — scanlines on".
 *
 * Operator mode = html[data-operator="on"], persisted to localStorage
 * "pj-operator". The .scanlines CSS (globals.css) is applied by the terminal
 * dock + status bar while the attribute is set. Firing the unlock again
 * toggles the mode OFF (palette / terminal / konami all toggle).
 *
 * Reduced motion: no choreography, no confetti — scanlines only, plus the
 * toast "You found it. Respect." (A6).
 */

export const OPERATOR_STORAGE_KEY = "pj-operator";
export const OPERATOR_EVENT = "portfolio:operator-unlock";

const STAGE_MS = 240; // per chrome-zone flash
const CONFETTI_MS = 1500; // burst lifetime
const PARTICLE_COUNT = 24;

/** Body classes per choreography stage — chrome components/CSS may hook
 *  these; EasterEgg also renders its own flash strips so the payoff is
 *  visible regardless. */
const STAGE_BODY_CLASS = {
  1: "konami-stage-titlebar",
  2: "konami-stage-rail",
  3: "konami-stage-statusbar",
};

/* ── shared operator-mode state helpers ─────────────────────────────── */

/** True while operator mode is engaged (html[data-operator="on"]). */
export function isOperatorOn() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.dataset.operator === "on"
  );
}

function setOperator(on) {
  const root = document.documentElement;
  if (on) {
    root.dataset.operator = "on";
  } else {
    delete root.dataset.operator;
  }
  try {
    localStorage.setItem(OPERATOR_STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable — mode still applies for the session */
  }
}

/**
 * useOperatorMode — reactive operator-mode flag for any component that needs
 * to apply the .scanlines class (TerminalOverlay, StatusBar). Observes the
 * html[data-operator] attribute so there is exactly one source of truth.
 */
export function useOperatorMode() {
  const [on, setOn] = useState(isOperatorOn);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setOn(root.dataset.operator === "on");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-operator"] });
    return () => observer.disconnect();
  }, []);

  return on;
}

/* ── confetti ────────────────────────────────────────────────────────── */

/** The five accent hues — theme-aware swatch variables from globals.css. */
const HUE_VARS = [
  "--swatch-signal",
  "--swatch-ion",
  "--swatch-photon",
  "--swatch-ember",
  "--swatch-pulse",
];

function makeParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    /* Upward fan: -90° ± 75°, then gravity pulls the tail back down */
    const angle = ((-90 + (Math.random() * 150 - 75)) * Math.PI) / 180;
    const dist = 140 + Math.random() * 220;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    return {
      id: i,
      x: [0, dx * 0.85, dx],
      y: [0, dy, dy + 220],
      rotate: (Math.random() * 2 - 1) * 360,
      size: 6 + Math.random() * 5,
      duration: 0.9 + Math.random() * 0.5,
      delay: Math.random() * 0.08,
      colorVar: HUE_VARS[i % HUE_VARS.length],
      round: Math.random() > 0.72,
    };
  });
}

/* ── flash strip geometry (fixed chrome zones per §LAYOUT) ──────────── */

const STRIP_CLASS = {
  1: "left-0 right-0 top-0 h-12", // titlebar (48px)
  2: "left-0 top-12 bottom-10 w-1.5 xl:w-2", // section rail edge
  3: "left-0 right-0 bottom-0 h-10", // status bar (36–40px)
};

/* ── component ───────────────────────────────────────────────────────── */

function EasterEggImpl() {
  const toast = useToast();
  const reduced = useMotionPreference();

  const [stage, setStage] = useState(0); // 0 idle · 1 titlebar · 2 rail · 3 statusbar
  const [particles, setParticles] = useState(null);

  const busyRef = useRef(false);
  const timersRef = useRef([]);
  const toastRef = useRef(toast);
  const reducedRef = useRef(reduced);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  /* Restore persisted operator mode on mount — silent, no choreography. */
  useEffect(() => {
    try {
      if (localStorage.getItem(OPERATOR_STORAGE_KEY) === "on") {
        document.documentElement.dataset.operator = "on";
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* Mirror the choreography stage onto <body> as class stages. */
  useEffect(() => {
    const body = document.body;
    Object.values(STAGE_BODY_CLASS).forEach((cls) => body.classList.remove(cls));
    if (stage > 0) body.classList.add(STAGE_BODY_CLASS[stage]);
    return () => {
      Object.values(STAGE_BODY_CLASS).forEach((cls) => body.classList.remove(cls));
    };
  }, [stage]);

  /* Clear pending timers on unmount. */
  useEffect(
    () => () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    },
    []
  );

  const schedule = useCallback((fn, ms) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  /** The single toggle entry point for every unlock path. */
  const handleToggle = useCallback(() => {
    if (busyRef.current) return;

    /* Already unlocked → toggle OFF (palette / terminal / konami path). */
    if (isOperatorOn()) {
      setOperator(false);
      toastRef.current.info("Operator mode off — scanlines off");
      return;
    }

    /* Reduced motion: toast + scanlines only. */
    if (reducedRef.current) {
      setOperator(true);
      toastRef.current.easter("You found it. Respect.");
      return;
    }

    /* Full payoff: titlebar → rail → status bar, then confetti + scanlines. */
    busyRef.current = true;
    setStage(1);
    schedule(() => setStage(2), STAGE_MS);
    schedule(() => setStage(3), STAGE_MS * 2);
    schedule(() => {
      setStage(0);
      setOperator(true);
      setParticles(makeParticles());
      toastRef.current.easter("Operator mode unlocked — scanlines on");
    }, STAGE_MS * 3);
    schedule(() => {
      setParticles(null);
      busyRef.current = false;
    }, STAGE_MS * 3 + CONFETTI_MS);
  }, [schedule]);

  /* Keyboard path. */
  useKonamiCode(handleToggle);

  /* Event path (titlebar 7-tap, palette action, terminal `konami`) — A4. */
  useEffect(() => {
    window.addEventListener(OPERATOR_EVENT, handleToggle);
    return () => window.removeEventListener(OPERATOR_EVENT, handleToggle);
  }, [handleToggle]);

  return (
    <>
      {/* Sequential accent flash over the chrome zones */}
      <AnimatePresence>
        {stage > 0 && (
          <motion.div
            key={stage}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`pointer-events-none fixed z-[90] ${STRIP_CLASS[stage]}`}
            style={{
              backgroundColor: "color-mix(in oklab, var(--ap-vivid) 30%, transparent)",
            }}
          />
        )}
      </AnimatePresence>

      {/* ONE 24-particle confetti burst in the five accent hues */}
      {particles && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-[38%] z-[92]"
        >
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: [1, 1, 0], rotate: p.rotate, scale: 0.9 }}
              transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                backgroundColor: `var(${p.colorVar})`,
                borderRadius: p.round ? "9999px" : "2px",
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

export const EasterEgg = memo(EasterEggImpl);

export default EasterEgg;
