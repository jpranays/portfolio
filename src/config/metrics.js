/**
 * metrics.js — the anti-contradiction module (DESIGN-V2 §A3).
 *
 * Every number quoted ANYWHERE on the site — components, index.html meta,
 * JSON-LD — comes from this file. Live values (npm, GitHub) degrade to these
 * floor constants stamped "as of <AS_OF>" — never spinners-forever, never zeros.
 *
 * Experience durations come from src/utils/experience.js — never hardcode years.
 *
 * NOTE: index.html cannot import this module; its meta/JSON-LD numbers are
 * hand-synced to these floors (~25K weekly, 10M+ monthly). If you change a
 * floor here, update index.html in the same commit.
 */

/* ── npm ─────────────────────────────────────────────────────────── */

/** Combined weekly download floor across published packages. Display "~25K". */
export const NPM_WEEKLY_FLOOR = 25000;

/** Per-package weekly download floors (fallbacks for the ships panels). */
export const PKG_FLOORS = {
  "react-fast-hooks": 20000,
  "cli-gh": 5000,
};

/** Stamp applied to any floor value shown in place of live data. */
export const AS_OF = "2026-07";

/* ── open source ─────────────────────────────────────────────────── */

/** Combined monthly downloads of the libraries with merged PRs. */
export const OSS_MONTHLY = "10M+";

/** Merged upstream pull requests. */
export const PR_COUNT = 9;

/* ── GitHub activity floors (Upstream panel footer) ──────────────── */

/** Fallbacks for the live GitHub stats, verified against the live API at
 *  AS_OF (actuals then: contributions 299 / repos 37 / followers 40).
 *  Shown stamped `as of ${AS_OF}` whenever the fetch degrades. */
export const GH_FLOORS = {
  contributions: "290+",
  repos: "35+",
  followers: "35+",
};

/* ── work wins (the wins strip + evidence rows) ──────────────────── */

/** Client-side attack surface reduction from the PCI checkout hardening. */
export const ATTACK_SURFACE = "−80%";

/** Payment success lift after the Stripe migration. */
export const PAYMENT_SUCCESS = "+12%";

/** Checkout load-time reduction shipped alongside the Stripe migration. */
export const LOAD_TIME = "−35%";

/** Annual savings from replacing the vendor chat platform. */
export const CHAT_SAVINGS = "$30K/yr";

/** Resolution-time reduction delivered by the chat platform. */
export const RESOLUTION = "55%";

/** Test coverage on the checkout codebase. */
export const COVERAGE = "90%";

/* ── helpers ─────────────────────────────────────────────────────── */

/**
 * Compact human format: 25000 → "25K", 20300 → "20K" (values ≥10 in their unit
 * round to a whole), 5100 → "5.1K", 1200000 → "1.2M", 950 → "950".
 */
export function formatK(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "0";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  const compact = (v) => (v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
  if (abs >= 1e6) return `${sign}${compact(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${compact(abs / 1e3)}K`;
  return `${sign}${Math.round(abs)}`;
}

/**
 * Display contract for the combined npm weekly number (hero sentence, status
 * bar readout). Pass the live total from useNpmStats, or null when the fetch
 * failed / hasn't resolved into anything usable.
 *
 * @param {number|null} liveTotal
 * @returns {{ value: string, raw: number, isLive: boolean, asOf: string|null }}
 *   value  — formatted string ready to render ("25,412" live, "~25K" floor)
 *   raw    — the underlying number (live total or the floor)
 *   isLive — true when showing live data (source-tag "npm registry — live");
 *            false when degraded (stamp `as of ${asOf}`)
 */
export function displayNpmWeekly(liveTotal) {
  if (typeof liveTotal === "number" && Number.isFinite(liveTotal) && liveTotal > 0) {
    return { value: liveTotal.toLocaleString("en-US"), raw: liveTotal, isLive: true, asOf: null };
  }
  return {
    value: `~${formatK(NPM_WEEKLY_FLOOR)}`,
    raw: NPM_WEEKLY_FLOOR,
    isLive: false,
    asOf: AS_OF,
  };
}

/**
 * Same contract as displayNpmWeekly but for a single package panel.
 *
 * @param {string} pkg - package name, must exist in PKG_FLOORS
 * @param {number|null} liveCount
 */
export function displayPkgWeekly(pkg, liveCount) {
  if (typeof liveCount === "number" && Number.isFinite(liveCount) && liveCount > 0) {
    return { value: liveCount.toLocaleString("en-US"), raw: liveCount, isLive: true, asOf: null };
  }
  const floor = PKG_FLOORS[pkg] ?? 0;
  return { value: `~${formatK(floor)}`, raw: floor, isLive: false, asOf: AS_OF };
}
