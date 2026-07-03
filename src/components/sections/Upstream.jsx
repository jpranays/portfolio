import { Suspense, lazy, memo, useEffect, useState } from "react";
import { motion } from "framer-motion";

/* react-github-calendar (+ its activity-calendar/tooltip deps) is the
   heaviest below-the-fold dependency — code-split it out of the entry
   chunk (DESIGN-V2 bundle budget; calendar is a sanctioned lazy target). */
const GitHubCalendar = lazy(() =>
  import("react-github-calendar").then((m) => ({ default: m.GitHubCalendar }))
);
import { Panel } from "../ui/Panel";
import { ListRow } from "../ui/ListRow";
import { Chip } from "../ui/Chip";
import { Metric } from "../ui/Metric";
import { SectionHeader } from "../ui/SectionHeader";
import { OSS_CONTRIBUTIONS } from "../../data/opensource";
import { AS_OF, GH_FLOORS, OSS_MONTHLY, PR_COUNT } from "../../config/metrics";
import { useMotionPreference } from "../../hooks/useMotionPreference";

/**
 * Upstream — merged-PR evidence + ONE live GitHub panel
 * (DESIGN-V2 Part B §SECTIONS upstream; replaces OpenSource.jsx).
 *
 * Anatomy:
 *   - SectionHeader '~/upstream' + h2 + reworded combined-total sub-line
 *     (PR_COUNT / OSS_MONTHLY from config/metrics — never hardcoded).
 *   - Four featured PR rows (react-tooltip, Mantine, PrimeReact, RSuite):
 *     library name 16px/500 + package mono chip + mono accent PR link +
 *     one-line summary + right-aligned impact numeral labeled
 *     "that library's monthly downloads" (per-library labeling kills the
 *     6M-vs-total paradox; numerals parsed from data/opensource.js).
 *   - "also merged" — five single-line whole-row PR links, 14px.
 *   - ONE live panel: mono header 'github --activity', react-github-calendar
 *     themed via the color-mix --ap-cal-1..5 ramp from globals.css, footer of
 *     3 inline mono stats with cache + as-of degradation (A1: never
 *     spinners-forever, never zeros). On mobile the calendar collapses into
 *     a <details> 'show contribution graph'.
 */

const GH_USER = "jpranays";
const GH_PROFILE = `https://github.com/${GH_USER}`;

/* Featured order per the blueprint; the rest are the "also merged" tail. */
const FEATURED_IDS = ["react-tooltip", "mantine", "primereact", "rsuite"];
const ALSO_IDS = [
  "grommet",
  "react-dropdown-select",
  "hamburger-react",
  "react-cron-generator",
  "crontab-react",
];

/* ≤8-word summaries for the single-line rows (copy, not data). */
const ALSO_SUMMARIES = {
  grommet: "Tip performance and test coverage",
  "react-dropdown-select": "UX and accessibility improvements",
  "hamburger-react": "Button props and accessibility",
  "react-cron-generator": "Option to disable the cron maker",
  "crontab-react": "Accessibility pass across the generator",
};

const BY_ID = Object.fromEntries(OSS_CONTRIBUTIONS.map((c) => [c.id, c]));

/* Leading numeral of the per-library impact string ("6M+ monthly users"
   → "6M+") — sourced from data/opensource.js, never retyped here. */
const impactNumeral = (item) => item.impact.split(" ")[0];

/* ── Calendar theming (A5/A7): the 5-step ramp is DERIVED in globals.css
     via color-mix from --ap-vivid — the theme arrays reference the CSS
     vars directly, so an accent pick re-themes the heatmap on demand.
     Both scheme arrays point at the same vars; the vars themselves
     resolve per theme. colorScheme still follows the site theme so the
     library never falls back to the system media query. ─────────────── */
const CAL_RAMP = [
  "var(--ap-cal-1)",
  "var(--ap-cal-2)",
  "var(--ap-cal-3)",
  "var(--ap-cal-4)",
  "var(--ap-cal-5)",
];
const CAL_THEME = { light: CAL_RAMP, dark: CAL_RAMP };

/* ── Motion (A6): one-shot 12px rise + fade 320ms, 40ms row stagger,
     viewport-once. useMotionPreference disables the JS-driven pass;
     the global CSS kill-switch is the safety net. ───────────────────── */
const VIEWPORT = { once: true, margin: "-40px" };
const groupVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};

function useGroupMotion() {
  const reduced = useMotionPreference();
  return {
    reduced,
    groupProps: reduced
      ? { initial: false }
      : {
          variants: groupVariants,
          initial: "hidden",
          whileInView: "show",
          viewport: VIEWPORT,
        },
    rowProps: reduced ? {} : { variants: rowVariants },
  };
}

/* ── Small in-file media-query hook (mobile <details> control) ───────── */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    setMatches(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/* ── Site color scheme for the calendar (html.dark, set by useTheme) ── */
function useColorScheme() {
  const [dark, setDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return dark ? "dark" : "light";
}

/* ── Minimal GitHub activity fetch: contributions past year + public
     repos + followers, cached 1h in localStorage. Degradation contract
     (A1): stale cache renders stamped `as of <its month>`; no cache at
     all renders honest floor values stamped `as of AS_OF`. Never
     spinners-forever, never zeros. ─────────────────────────────────── */
const GH_CACHE_KEY = `pj-gh-activity-${GH_USER}`;
const GH_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/* Floor values live in config/metrics.js (GH_FLOORS, imported above) with
   the other floors, per A3. */

function readActivityCache() {
  try {
    const raw = localStorage.getItem(GH_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (
      typeof ts !== "number" ||
      typeof data?.contributions !== "number" ||
      typeof data?.repos !== "number" ||
      typeof data?.followers !== "number"
    ) {
      return null;
    }
    return { data, ts };
  } catch {
    return null;
  }
}

const formatActivity = (data) => ({
  contributions: data.contributions.toLocaleString("en-US"),
  repos: data.repos.toLocaleString("en-US"),
  followers: data.followers.toLocaleString("en-US"),
});

/* "as of 2026-05" from a cache timestamp */
const asOfMonth = (ts) => new Date(ts).toISOString().slice(0, 7);

function useGitHubActivity() {
  const [state, setState] = useState(() => {
    const cached = readActivityCache();
    if (cached && Date.now() - cached.ts < GH_CACHE_TTL) {
      return { values: formatActivity(cached.data), live: true, asOf: null };
    }
    if (cached) {
      return {
        values: formatActivity(cached.data),
        live: false,
        asOf: asOfMonth(cached.ts),
      };
    }
    return { values: GH_FLOORS, live: false, asOf: AS_OF };
  });

  useEffect(() => {
    const cached = readActivityCache();
    if (cached && Date.now() - cached.ts < GH_CACHE_TTL) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const [profileRes, contribRes] = await Promise.all([
          fetch(`https://api.github.com/users/${GH_USER}`),
          fetch(
            `https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`
          ),
        ]);
        if (!profileRes.ok || !contribRes.ok) throw new Error("gh_fetch_failed");

        const profile = await profileRes.json();
        const contrib = await contribRes.json();

        const contributions =
          typeof contrib?.total?.lastYear === "number"
            ? contrib.total.lastYear
            : Array.isArray(contrib?.contributions)
              ? contrib.contributions.reduce((s, c) => s + (c.count || 0), 0)
              : 0;
        const data = {
          contributions,
          repos: profile?.public_repos,
          followers: profile?.followers,
        };

        const valid = Object.values(data).every(
          (v) => typeof v === "number" && Number.isFinite(v) && v > 0
        );
        if (!valid) throw new Error("gh_bad_shape");

        try {
          localStorage.setItem(
            GH_CACHE_KEY,
            JSON.stringify({ data, ts: Date.now() })
          );
        } catch {
          /* storage unavailable — still render live */
        }

        if (!cancelled) {
          setState({ values: formatActivity(data), live: true, asOf: null });
        }
      } catch {
        /* keep the fallback already in state (stale cache or floors) */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/* Live values swap in with a 180ms crossfade (§INTERACTIONS) — keyed
   remount fades the new value; reduced motion swaps instantly. */
function SwapValue({ value, className }) {
  const reduced = useMotionPreference();
  return (
    <motion.span
      key={value}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className={className}
    >
      {value}
    </motion.span>
  );
}

/* ── Featured PR row ─────────────────────────────────────────────────── */
function FeaturedRow({ item, rowProps }) {
  return (
    <motion.li
      {...rowProps}
      className="rounded-panel border border-hairline bg-surface-1 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3 className="text-base font-medium leading-snug text-primary">
            {item.library}
          </h3>
          <Chip>{item.package}</Chip>
          <a
            href={item.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${item.library} pull request ${item.pr} on GitHub`}
            className="-my-3 inline-flex items-center gap-1 rounded py-3 font-mono text-[13px] font-medium text-accent-text underline-offset-2 hover:underline"
          >
            PR {item.pr} ↗
          </a>
        </div>
        <p className="mt-1.5 truncate text-base leading-relaxed text-secondary">
          {item.description}
        </p>
      </div>
      <Metric
        value={impactNumeral(item)}
        label="that library’s monthly downloads"
        className="mt-3 shrink-0 sm:mt-0 sm:items-end sm:text-right"
      />
    </motion.li>
  );
}

/* ── The single live GitHub panel ────────────────────────────────────── */
function GitHubActivityPanel() {
  const colorScheme = useColorScheme();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [graphOpen, setGraphOpen] = useState(false);
  const { values, live, asOf } = useGitHubActivity();

  const stats = [
    { key: "contributions", label: "contributions past year" },
    { key: "repos", label: "public repos" },
    { key: "followers", label: "followers" },
  ];

  return (
    <Panel
      size="lg"
      glow
      header="github --activity"
      headerRight={
        <a
          href={GH_PROFILE}
          target="_blank"
          rel="noopener noreferrer"
          className="-my-3 inline-flex items-center gap-1 rounded py-3 font-mono text-[13px] font-medium text-accent-text underline-offset-2 hover:underline"
        >
          @{GH_USER} ↗
        </a>
      }
    >
      {/* Calendar — collapsed behind <details> on mobile so it never
          costs above-the-fold scroll; forced open (summary hidden) md+ */}
      <details
        className="group"
        open={isDesktop || graphOpen}
        onToggle={(e) => setGraphOpen(e.currentTarget.open)}
      >
        <summary className="flex min-h-[40px] w-fit cursor-pointer list-none items-center gap-2 rounded font-mono text-[13px] font-medium text-secondary transition-colors duration-fast hover:text-primary md:hidden [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-base group-open:rotate-90"
          >
            ▸
          </span>
          <span className="group-open:hidden">show contribution graph</span>
          <span className="hidden group-open:inline">
            hide contribution graph
          </span>
        </summary>
        <div className="overflow-x-auto pt-2 font-mono text-xs text-secondary md:pt-0">
          <Suspense
            fallback={
              <div
                aria-hidden="true"
                className="h-32 w-full animate-pulse rounded bg-surface-2"
              />
            }
          >
          <GitHubCalendar
            username={GH_USER}
            colorScheme={colorScheme}
            theme={CAL_THEME}
            blockSize={11}
            blockMargin={4}
            blockRadius={2}
            fontSize={12}
            showTotalCount={false}
            labels={{ legend: { less: "less", more: "more" } }}
            errorMessage={`couldn’t load the contribution graph — see github.com/${GH_USER}`}
            style={{ width: "100%" }}
          />
          </Suspense>
        </div>
      </details>

      {/* Footer — 3 inline mono stats, live w/ cache + as-of degradation */}
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline pt-4 font-mono text-[13px] text-secondary">
        {stats.map(({ key, label }, i) => (
          <span key={key} className="flex items-baseline gap-x-3">
            {i > 0 && (
              <span aria-hidden="true" className="text-tertiary">
                ·
              </span>
            )}
            <span className="flex items-baseline gap-1.5">
              <SwapValue
                value={values[key]}
                className="tnum font-medium text-primary"
              />
              <span>{label}</span>
            </span>
          </span>
        ))}
        <span className="ml-auto text-tertiary">
          {live ? "github — live" : `as of ${asOf}`}
        </span>
      </div>
    </Panel>
  );
}

/* ── Section ─────────────────────────────────────────────────────────── */
function Upstream() {
  const { groupProps, rowProps } = useGroupMotion();
  const featured = FEATURED_IDS.map((id) => BY_ID[id]).filter(Boolean);
  const also = ALSO_IDS.map((id) => BY_ID[id]).filter(Boolean);

  return (
    <section id="upstream" aria-label="Upstream — merged pull requests">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div className="border-t border-hairline py-16 lg:py-20">
          {/* Header + featured evidence rows */}
          <motion.div {...groupProps}>
            <motion.div {...rowProps}>
              <SectionHeader
                eyebrow="~/upstream"
                title={`${PR_COUNT} PRs merged into libraries you probably use`}
                sub={`combined, these libraries are downloaded ${OSS_MONTHLY} times a month`}
              />
            </motion.div>

            <ul className="space-y-2">
              {featured.map((item) => (
                <FeaturedRow key={item.id} item={item} rowProps={rowProps} />
              ))}
            </ul>
          </motion.div>

          {/* also merged — five single-line whole-row PR links */}
          <motion.div {...groupProps} className="mt-10">
            <motion.h3
              {...rowProps}
              className="font-mono text-[13px] font-medium tracking-[0.02em] text-secondary"
            >
              also merged
            </motion.h3>
            <ul className="mt-3 divide-y divide-hairline">
              {also.map((item) => (
                <motion.li key={item.id} {...rowProps}>
                  <ListRow
                    href={item.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${item.library} — pull request ${item.pr} on GitHub`}
                    meta={
                      <span className="whitespace-nowrap font-mono text-[13px] font-medium text-accent-text underline-offset-2 group-hover:underline">
                        PR {item.pr} ↗
                      </span>
                    }
                  >
                    <span className="flex min-w-0 items-baseline gap-2.5">
                      <span className="shrink-0 text-sm font-medium leading-snug text-primary">
                        {item.library}
                      </span>
                      <span className="truncate text-sm leading-snug text-secondary">
                        {ALSO_SUMMARIES[item.id] ?? item.description}
                      </span>
                    </span>
                  </ListRow>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* ONE live GitHub panel */}
          <motion.div {...groupProps} className="mt-10">
            <motion.div {...rowProps}>
              <GitHubActivityPanel />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default memo(Upstream);
