import { useState, useEffect } from "react";

/**
 * useNpmRange — trailing 7-day-per-point sparkline data (last ~8 weeks)
 * per package (DESIGN-V2 A2, steal-idea: 7-day sparkline beside the live
 * weekly-downloads numeral).
 *
 * Fetches https://api.npmjs.org/downloads/range/last-year/<pkg> (last-month
 * only yields ~4 weekly buckets; last-year covers the ~56 days needed),
 * takes the trailing 56 daily points (after trimming up to a week of
 * trailing zero-days — npm stats lag ~1 day), and sums them into 8
 * chronological weekly buckets.
 *
 * sessionStorage cache (shared key, per-package entries, 6h TTL). On any
 * error `data` resolves to null — callers hide the sparkline; the weekly
 * numeral's own floor/as-of degradation is handled elsewhere.
 *
 * @param {string} pkg npm package name
 * @returns {{ loading: boolean, data: number[] | null }}
 */

const CACHE_KEY = "npm-range-jpranays";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours (matches useNpmPackageInfo)
const BUCKET_DAYS = 7;
const MAX_POINTS = 8; // ~8 trailing weeks
const MAX_ZERO_TRIM = 7; // trim at most a week of lagging zero-days

function readCache(pkg) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const entry = store?.[pkg];
    if (!entry || Date.now() - entry.ts > CACHE_TTL) return null;
    return Array.isArray(entry.points) ? entry.points : null;
  } catch {
    return null;
  }
}

function writeCache(pkg, points) {
  try {
    let store = {};
    try {
      store = JSON.parse(sessionStorage.getItem(CACHE_KEY)) ?? {};
    } catch {
      store = {};
    }
    store[pkg] = { points, ts: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — fetch still resolves */
  }
}

/**
 * Chronological daily counts → up to MAX_POINTS weekly sums.
 * Returns null when there isn't enough data for a meaningful line
 * (< 2 whole weeks).
 */
function bucketWeekly(daily) {
  const days = daily.slice();

  /* npm reports zeros for the most recent day(s) before stats settle —
     drop them so the last bucket isn't artificially low. Capped so a
     genuinely dormant package isn't trimmed to nothing. */
  let trimmed = 0;
  while (days.length > 0 && days[days.length - 1] === 0 && trimmed < MAX_ZERO_TRIM) {
    days.pop();
    trimmed += 1;
  }

  const usable = Math.min(days.length, BUCKET_DAYS * MAX_POINTS);
  const whole = Math.floor(usable / BUCKET_DAYS) * BUCKET_DAYS;
  if (whole < BUCKET_DAYS * 2) return null;

  const tail = days.slice(days.length - whole);
  const points = [];
  for (let i = 0; i < tail.length; i += BUCKET_DAYS) {
    points.push(tail.slice(i, i + BUCKET_DAYS).reduce((sum, v) => sum + v, 0));
  }
  return points;
}

/* Module-level promise map so parallel hook calls share one fetch per pkg */
const _promises = {};

function fetchRange(pkg) {
  const cached = readCache(pkg);
  if (cached) return Promise.resolve(cached);
  if (_promises[pkg]) return _promises[pkg];

  _promises[pkg] = fetch(`https://api.npmjs.org/downloads/range/last-year/${pkg}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`npm range ${r.status}`))))
    .then((json) => {
      const daily = Array.isArray(json?.downloads)
        ? json.downloads.map((d) => (typeof d?.downloads === "number" ? d.downloads : 0))
        : null;
      const points = daily ? bucketWeekly(daily) : null;
      if (points) writeCache(pkg, points);
      delete _promises[pkg];
      return points;
    })
    .catch(() => {
      delete _promises[pkg];
      return null; // error → null → callers hide the sparkline
    });

  return _promises[pkg];
}

export function useNpmRange(pkg) {
  const [state, setState] = useState({ loading: true, data: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, data: null });
    fetchRange(pkg).then((data) => {
      if (!cancelled) setState({ loading: false, data });
    });
    return () => {
      cancelled = true;
    };
  }, [pkg]);

  return state;
}

export default useNpmRange;
