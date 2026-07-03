import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { cn } from "../../utils/cn";
import { Panel } from "../ui/Panel";
import { Kbd } from "../ui/Kbd";
import { useNpmStats } from "../../hooks/useNpmStats";
import { useOssImpact } from "../../hooks/useOssImpact";
import { useAvailability } from "../../hooks/useAvailability";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { AS_OF, OSS_MONTHLY, displayNpmWeekly, formatK } from "../../config/metrics";
import { OSS_CONTRIBUTIONS } from "../../data/opensource";

/**
 * Hero — OPERATOR (DESIGN-V2 Part B §SECTIONS hero).
 *
 * pt-28 pb-16 (NOT min-h-screen). lg grid 7/5: content cols 1–7, live panel
 * cols 8–12. Motion budget: the h1 masked rise (once) — signature restraint,
 * no other animation here (the status bar owns the page's only loop).
 *
 * Props:
 *   onOpenPalette  opens the CommandPalette (App owns overlay state, A4);
 *                  falls back to the `portfolio:open-palette` CustomEvent.
 */

/* ── last merged PR — inline fetch, sessionStorage cache (per blueprint) ── */

const GH_CACHE_KEY = "gh-last-pr-jpranays";
const GH_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const GH_EVENTS_URL =
  "https://api.github.com/users/jpranays/events/public?per_page=100";

function readGhCache() {
  try {
    const raw = sessionStorage.getItem(GH_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > GH_CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeGhCache(data) {
  try {
    sessionStorage.setItem(GH_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* storage unavailable — live value simply isn't cached */
  }
}

// Module-level promise so a remount never doubles the request
let _ghPromise = null;

async function fetchLastMergedPr() {
  const cached = readGhCache();
  if (cached) return cached;
  if (_ghPromise) return _ghPromise;

  _ghPromise = fetch(GH_EVENTS_URL, {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((events) => {
      const ev = Array.isArray(events)
        ? events.find(
            (e) =>
              e.type === "PullRequestEvent" &&
              e.payload?.action === "closed" &&
              e.payload?.pull_request?.merged
          )
        : null;
      if (!ev) return Promise.reject(new Error("no merged PR in recent events"));
      const pr = ev.payload.pull_request;
      const data = {
        repo: ev.repo?.name?.split("/").pop() ?? "repo",
        number: pr.number,
        mergedAt: pr.merged_at ?? ev.created_at,
      };
      writeGhCache(data);
      _ghPromise = null;
      return data;
    })
    .catch((err) => {
      _ghPromise = null;
      throw err;
    });

  return _ghPromise;
}

/** "3d ago" style relative stamp for the last-PR row. */
function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  if (s < 30 * 86400) return `${Math.floor(s / (7 * 86400))}w ago`;
  return `${Math.floor(s / (30 * 86400))}mo ago`;
}

/* Graceful as-of fallback: the featured react-tooltip PR from the OSS data */
const FALLBACK_PR = OSS_CONTRIBUTIONS.find((c) => c.id === "react-tooltip");

/* ── tiny presentational helpers ─────────────────────────────────── */

function SkeletonBar({ className }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn("inline-block animate-pulse rounded bg-surface-2", className)}
      />
      <span className="sr-only">loading</span>
    </>
  );
}

/** Hairline-separated status row: mono 13px label / Geist 650 tabular value. */
function StatusRow({ label, children, tag }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="shrink-0 font-mono text-[13px] font-medium text-secondary">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-col items-end text-right">
        {children}
        {tag != null && (
          <span className="mt-0.5 font-mono text-[13px] text-tertiary">{tag}</span>
        )}
      </dd>
    </div>
  );
}

/* ── component ───────────────────────────────────────────────────── */

function Hero({ onOpenPalette }) {
  const reduced = useMotionPreference();
  const { available } = useAvailability();
  const { loading: npmLoading, data: npmData } = useNpmStats();
  const { data: ossData } = useOssImpact();

  const [lastPr, setLastPr] = useState({ loading: true, data: null });

  useEffect(() => {
    let cancelled = false;
    fetchLastMergedPr()
      .then((data) => {
        if (!cancelled) setLastPr({ loading: false, data });
      })
      .catch(() => {
        if (!cancelled) setLastPr({ loading: false, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Anti-contradiction display contracts (metrics.js, A3) */
  const npmDisplay = useMemo(
    () => displayNpmWeekly(npmData?.total ?? null),
    [npmData]
  );

  /* OSS reach: live only when it clears the canonical 10M+ floor — the
     hook sums 3 of the 9 libraries, so the floor is the honest figure. */
  const ossDisplay = useMemo(() => {
    const total = ossData?.total;
    if (typeof total === "number" && Number.isFinite(total) && total >= 10_000_000) {
      return { value: `${formatK(total)}+`, isLive: true };
    }
    return { value: OSS_MONTHLY, isLive: false };
  }, [ossData]);

  const openPalette = () => {
    if (typeof onOpenPalette === "function") onOpenPalette();
    else window.dispatchEvent(new CustomEvent("portfolio:open-palette"));
  };

  const onResumeClick = () => {
    window.dispatchEvent(new CustomEvent("portfolio:resume-download"));
  };

  return (
    <section id="hero" className="pt-28 pb-16" aria-label="Introduction">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* ── Content — cols 1–7 ─────────────────────────────────── */}
          <div className="lg:col-span-7">
            {/* Eyebrow row: mono ~/ + availability chip → #contact */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow" aria-hidden="true">
                ~/
              </span>
              <a
                href="#contact"
                className={cn(
                  "relative inline-flex items-center gap-2 rounded px-2 py-1 font-mono text-xs font-medium",
                  "after:absolute after:-inset-2 after:content-['']",
                  "hover:underline hover:underline-offset-2",
                  available
                    ? "bg-accent-dim text-accent-text"
                    : "border border-hairline bg-surface-2 text-secondary"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    available ? "bg-accent" : "bg-tertiary"
                  )}
                />
                {available ? "Open to senior frontend roles" : "Not taking new roles"}
              </a>
            </div>

            {/* h1 — one-shot masked rise, descender-safe, no shimmer, no loop */}
            <h1 className="mt-6 text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] font-[650] leading-[1.1] tracking-[-0.02em] text-primary">
              <span className="-mb-[0.15em] block overflow-hidden pb-[0.15em]">
                <motion.span
                  className="block"
                  initial={reduced ? false : { y: "112%" }}
                  animate={{ y: "0%" }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                  }
                >
                  Pranay Jadhav
                </motion.span>
              </span>
            </h1>

            {/* Static role line — the typewriter is gone; nothing aria-live */}
            <p className="mt-4 text-lg leading-normal text-secondary">
              Senior Software Developer at Sears — React, Node, and payments
              infrastructure.
            </p>
            <p className="sr-only">
              Pranay Jadhav: Senior Software Developer, React and Next.js
              engineer, npm package author, open source contributor, MERN stack
              developer, based in Pune, India.
            </p>

            {/* ONE composite live sentence — the hero's only numbers */}
            <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-secondary">
              I ship npm packages installed{" "}
              <strong className="tnum font-medium text-accent-text">
                {npmDisplay.value}
              </strong>{" "}
              times a week and have code merged into libraries serving{" "}
              <strong className="tnum font-medium text-accent-text">
                {ossDisplay.value}
              </strong>{" "}
              developers a month.
            </p>
            <p className="mt-1.5 min-h-5 font-mono text-[13px] text-tertiary">
              {!npmLoading &&
                (npmDisplay.isLive ? "npm registry — live" : `as of ${AS_OF}`)}
            </p>

            {/* THE SIGNATURE — command-input trigger */}
            <button
              type="button"
              onClick={openPalette}
              aria-haspopup="dialog"
              aria-keyshortcuts="Meta+K"
              className="mt-8 flex h-12 w-full max-w-md items-center gap-3 rounded-panel border border-strong bg-surface-1 px-4 text-left transition-colors duration-fast hover:bg-surface-2"
            >
              <Search className="h-4 w-4 shrink-0 text-tertiary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-base text-tertiary">
                Type a command or jump anywhere
              </span>
              <Kbd aria-hidden="true">⌘K</Kbd>
            </button>

            {/* CTA row */}
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3">
              <a
                href="#contact"
                data-ping
                className="inline-flex h-11 items-center rounded-panel bg-accent px-5 text-[15px] font-medium text-accent-on transition duration-base hover:brightness-95 active:scale-[0.98] dark:hover:brightness-110"
              >
                Get in touch
              </a>
              <a
                href="/Pranay_Jadhav_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onResumeClick}
                className="inline-flex h-11 items-center gap-1.5 rounded-panel border border-strong px-5 text-[15px] font-medium text-primary transition duration-base hover:bg-surface-2 active:scale-[0.98]"
              >
                Resume
                <span aria-hidden="true">↗</span>
              </a>
              <span className="flex items-center gap-4 sm:ml-1">
                <a
                  href="https://github.com/jpranays"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center text-[13px] font-medium text-secondary underline-offset-4 transition-colors duration-fast hover:text-primary hover:underline"
                >
                  GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/jpranays"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center text-[13px] font-medium text-secondary underline-offset-4 transition-colors duration-fast hover:text-primary hover:underline"
                >
                  LinkedIn
                </a>
              </span>
            </div>

            {/* Mobile: horizontal scroll-snap strip of 3 stat chips */}
            <div className="-mx-5 mt-10 px-5 sm:-mx-8 sm:px-8 lg:hidden">
              <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
                <li className="min-w-[10rem] shrink-0 snap-start rounded-panel border border-hairline bg-surface-1 px-4 py-3">
                  <div className="font-mono text-xs font-medium text-secondary">
                    npm / weekly
                  </div>
                  <div className="tnum mt-1 text-[15px] font-[650] leading-6 text-primary">
                    {npmLoading ? <SkeletonBar className="h-4 w-14" /> : npmDisplay.value}
                  </div>
                  {!npmLoading && !npmDisplay.isLive && (
                    <div className="mt-0.5 font-mono text-[13px] text-tertiary">
                      as of {AS_OF}
                    </div>
                  )}
                </li>
                <li className="min-w-[10rem] shrink-0 snap-start rounded-panel border border-hairline bg-surface-1 px-4 py-3">
                  <div className="font-mono text-xs font-medium text-secondary">
                    oss reach / month
                  </div>
                  <div className="tnum mt-1 text-[15px] font-[650] leading-6 text-primary">
                    {ossDisplay.value} libs
                  </div>
                </li>
                <li className="min-w-[10rem] shrink-0 snap-start rounded-panel border border-hairline bg-surface-1 px-4 py-3">
                  <div className="font-mono text-xs font-medium text-secondary">
                    shipping at
                  </div>
                  <div className="mt-1 text-[15px] font-[650] leading-6 text-primary">
                    Sears India · Pune
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* ── Live panel — cols 8–12, lg+ only, sole default glow ── */}
          <div className="hidden lg:col-span-5 lg:block">
            <Panel
              size="lg"
              glow
              header="status --live"
              headerRight={
                <span
                  className="h-1.5 w-1.5 rounded-full bg-success"
                  aria-hidden="true"
                />
              }
            >
              <dl className="divide-y divide-hairline">
                <StatusRow
                  label="npm / weekly"
                  tag={!npmLoading && !npmDisplay.isLive ? `as of ${AS_OF}` : null}
                >
                  {npmLoading ? (
                    <SkeletonBar className="h-4 w-16" />
                  ) : (
                    <span className="tnum text-[15px] font-[650] leading-6 text-primary">
                      {npmDisplay.value}
                    </span>
                  )}
                </StatusRow>

                <StatusRow label="oss reach / month">
                  <span className="tnum text-[15px] font-[650] leading-6 text-primary">
                    {ossDisplay.value} libs
                  </span>
                </StatusRow>

                <StatusRow label="shipping at">
                  <span className="truncate text-[15px] font-[650] leading-6 text-primary">
                    Sears India · Pune
                  </span>
                </StatusRow>

                <StatusRow
                  label="last PR merged"
                  tag={
                    lastPr.loading
                      ? null
                      : lastPr.data
                        ? timeAgo(lastPr.data.mergedAt)
                        : `as of ${AS_OF}`
                  }
                >
                  {lastPr.loading ? (
                    <SkeletonBar className="h-4 w-24" />
                  ) : (
                    <span className="max-w-full truncate font-mono text-[13px] font-medium leading-6 text-primary">
                      {lastPr.data
                        ? `${lastPr.data.repo} #${lastPr.data.number}`
                        : `${FALLBACK_PR.library} ${FALLBACK_PR.pr}`}
                    </span>
                  )}
                </StatusRow>
              </dl>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(Hero);
