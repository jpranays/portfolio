import { useCallback, useEffect, useState } from "react";

/**
 * useAccent — accent state (DESIGN-V2 A2/A5).
 *
 * The accent is applied as html[data-accent="…"] and persisted to
 * localStorage "pj-accent" (the same key the pre-paint script in index.html
 * reads). All token resolution happens in globals.css — this hook never
 * touches colors directly and dispatches nothing; callers use setAccent.
 *
 * It also listens for "portfolio:set-accent" CustomEvents (detail: accent
 * key) so the terminal and command palette can trigger a pick, and keeps all
 * hook instances in sync by observing the data-accent attribute.
 */

const STORAGE_KEY = "pj-accent";
const DEFAULT_ACCENT = "signal";
const TRANSITION_MS = 400;

/** { key, label, swatchVar } — swatchVar is a static per-accent CSS variable
 *  (theme-aware) for rendering picker swatches of NON-active accents. */
export const ACCENTS = [
  { key: "signal", label: "Signal", swatchVar: "--swatch-signal" },
  { key: "ion", label: "Ion", swatchVar: "--swatch-ion" },
  { key: "photon", label: "Photon", swatchVar: "--swatch-photon" },
  { key: "ember", label: "Ember", swatchVar: "--swatch-ember" },
  { key: "pulse", label: "Pulse", swatchVar: "--swatch-pulse" },
  { key: "mono", label: "Mono", swatchVar: "--swatch-mono" },
];

const VALID = new Set(ACCENTS.map((a) => a.key));

let transitionTimer = null;

/** Apply an accent: html dataset + localStorage + ONE 400ms CSS-variable
 *  transition (instant under prefers-reduced-motion via the CSS kill-switch
 *  and the guard below). Safe to call outside React. */
export function applyAccent(key) {
  if (!VALID.has(key) || typeof document === "undefined") return;
  const root = document.documentElement;

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduced && root.getAttribute("data-accent") !== key) {
    root.classList.add("accent-transition");
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.classList.remove("accent-transition");
      transitionTimer = null;
    }, TRANSITION_MS);
  }

  root.setAttribute("data-accent", key);
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* storage unavailable — accent still applies for the session */
  }
}

function readAccent() {
  if (typeof document === "undefined") return DEFAULT_ACCENT;
  const fromDom = document.documentElement.getAttribute("data-accent");
  if (fromDom && VALID.has(fromDom)) return fromDom;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID.has(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_ACCENT;
}

export function useAccent() {
  const [accent, setAccentState] = useState(readAccent);

  const setAccent = useCallback((key) => {
    applyAccent(key);
    /* state syncs via the attribute observer below (all instances at once) */
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    /* Keep every useAccent instance in sync with the html attribute */
    const observer = new MutationObserver(() => {
      const current = root.getAttribute("data-accent");
      if (current && VALID.has(current)) setAccentState(current);
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-accent"] });

    /* Terminal / palette trigger path (A4): detail is the accent key */
    const onSetAccent = (event) => {
      const key =
        typeof event.detail === "string" ? event.detail : event.detail?.accent;
      if (key && VALID.has(key)) applyAccent(key);
    };
    window.addEventListener("portfolio:set-accent", onSetAccent);

    return () => {
      observer.disconnect();
      window.removeEventListener("portfolio:set-accent", onSetAccent);
    };
  }, []);

  return { accent, setAccent, ACCENTS };
}

export default useAccent;
