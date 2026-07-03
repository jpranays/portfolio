import { Fragment, memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import { Panel } from "../ui/Panel";
import { ListRow } from "../ui/ListRow";
import { Chip } from "../ui/Chip";
import { Metric } from "../ui/Metric";
import { SectionHeader } from "../ui/SectionHeader";
import { Sparkline } from "../ui/Sparkline";
import { useNpmStats } from "../../hooks/useNpmStats";
import { useNpmPackageInfo } from "../../hooks/useNpmPackageInfo";
import { useNpmRange } from "../../hooks/useNpmRange";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { useToast } from "../effects/Toast";
import { displayNpmWeekly, displayPkgWeekly, formatK } from "../../config/metrics";
import { PROJECTS } from "../../data/projects";

/**
 * Ships — '~/ships' (DESIGN-V2 Part B §SECTIONS ships; replaces Projects).
 *
 * The canonical and ONLY detailed home of package download numbers:
 * two symmetric panel-lg package panels (the page's one allowed symmetric
 * pair) with live version/gzip chips, the owned weekly-downloads Metric
 * (live from npm, floor + 'as of' stamp on failure), a 7-day-per-point
 * sparkline (useNpmRange), install row with copy button, and footer links.
 * Below: 'more ships' — four dense Raycast-style list rows.
 *
 * Category tabs and the portfolio-inside-portfolio card are CUT
 * ('view source' lives in the footer).
 */

const projectById = (id) => PROJECTS.find((p) => p.id === id);

/* Panel copy is component-owned (changelog voice); every NUMBER comes from
   config/metrics.js or the live npm APIs — never hardcoded (A3). */
const PACKAGES = [
  {
    name: "react-fast-hooks",
    install: "npm i react-fast-hooks",
    tagline: "Zero-dependency React hooks — TypeScript-first, tree-shakeable.",
    project: projectById("react-fast-hooks"),
  },
  {
    name: "cli-gh",
    install: "npm i -g cli-gh",
    tagline: "Repos, pull requests, and issues from the terminal — minimal setup.",
    project: projectById("cli-gh"),
  },
];

const MORE_SHIP_IDS = ["ui-challenges", "page-load-indicator", "snap-shots", "private-chat"];
const MORE_SHIPS = MORE_SHIP_IDS.map(projectById).filter(Boolean);

/* Section entrance (A6): one-shot 12px rise + fade 320ms, 40ms stagger,
   viewport-once. Reduced motion renders the final state immediately. */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const riseVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};
const VIEWPORT = { once: true, margin: "-40px" };

/** Live gzip bytes → compact kB string (mirrors metrics.formatK rounding). */
function formatGzip(bytes) {
  const kb = bytes / 1024;
  return `${kb >= 10 ? Math.round(kb) : Math.round(kb * 10) / 10} kB`;
}

function PackagePanel({ pkg, info, liveDownloads, statsLoading }) {
  const toast = useToast();
  const { data: range } = useNpmRange(pkg.name);
  const weekly = displayPkgWeekly(pkg.name, liveDownloads);

  /* Degraded (fetch settled without data) → floor stamped 'as of <date>'
     (A1). While still loading, show the floor unstamped — never spinners. */
  const degraded = !weekly.isLive && !statsLoading;

  const copyInstall = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pkg.install);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed — clipboard unavailable");
    }
  }, [pkg.install, toast]);

  const links = [
    { label: "GitHub", href: pkg.project?.github },
    { label: "Docs", href: pkg.project?.docs },
    { label: "npm", href: pkg.project?.npm },
  ].filter((l) => l.href);

  return (
    <Panel
      size="lg"
      glow
      className="flex h-full flex-col"
      header={
        <span className="font-mono text-base font-medium text-primary">{pkg.name}</span>
      }
      headerRight={
        <>
          {info?.version != null && <Chip>v{info.version}</Chip>}
          {info?.gzip != null && <Chip>{formatGzip(info.gzip)} gzip</Chip>}
        </>
      }
    >
      <div className="flex flex-1 flex-col gap-4">
        {/* The OWNED METRIC + 7-day sparkline (hidden when range is null) */}
        <div className="flex items-end justify-between gap-4">
          <Metric
            value={weekly.isLive ? weekly.raw : weekly.value}
            label={
              weekly.isLive ? (
                <>
                  weekly downloads · <span className="font-mono">live from npm</span>
                </>
              ) : (
                "weekly downloads"
              )
            }
            sourceTag={degraded ? `as of ${weekly.asOf}` : null}
          />
          <Sparkline data={range} className="mb-1" />
        </div>

        <p className="flex-1 text-sm leading-relaxed text-secondary">{pkg.tagline}</p>

        {/* Install row — inset surface-2 code block + copy button */}
        <div className="flex items-center gap-2 rounded-panel bg-surface-2 py-1 pl-3 pr-1">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-primary">
            {pkg.install}
          </code>
          <button
            type="button"
            onClick={copyInstall}
            aria-label={`Copy install command: ${pkg.install}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel text-secondary transition-colors duration-fast hover:bg-surface-1 hover:text-primary"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Footer links — 13px, 40px tap targets via inner min-height */}
        <div className="-my-2 flex items-center gap-2 text-[13px] font-medium">
          {links.map((link, i) => (
            <Fragment key={link.label}>
              {i > 0 && (
                <span aria-hidden="true" className="text-tertiary">
                  ·
                </span>
              )}
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center rounded text-secondary underline-offset-4 transition-colors duration-fast hover:text-primary hover:underline"
              >
                {link.label}
              </a>
            </Fragment>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Ships() {
  const reduced = useMotionPreference();
  const stats = useNpmStats();
  const info = useNpmPackageInfo();

  const weeklyTotal = displayNpmWeekly(stats.data?.total ?? null);
  const infoFor = (name) => info.data?.find((p) => p.name === name) ?? null;
  const downloadsFor = (name) =>
    stats.data?.packages?.find((p) => p.name === name)?.downloads ?? null;

  return (
    <section id="ships">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div className="border-t border-hairline py-16 lg:py-20">
        {/* Lead: header + the one allowed symmetric panel pair */}
        <motion.div
          variants={containerVariants}
          initial={reduced ? false : "hidden"}
          whileInView="show"
          viewport={VIEWPORT}
        >
          <motion.div variants={riseVariants}>
            <SectionHeader
              eyebrow="~/ships"
              title={`Two packages on npm, ~${formatK(weeklyTotal.raw)} installs a week`}
            />
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2">
            {PACKAGES.map((pkg) => (
              <motion.div key={pkg.name} variants={riseVariants} className="min-w-0">
                <PackagePanel
                  pkg={pkg}
                  info={infoFor(pkg.name)}
                  liveDownloads={downloadsFor(pkg.name)}
                  statsLoading={stats.loading}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* more ships — four dense Raycast-style rows; whole row is the link */}
        <motion.div
          variants={containerVariants}
          initial={reduced ? false : "hidden"}
          whileInView="show"
          viewport={VIEWPORT}
          className="mt-10"
        >
          <motion.h3 variants={riseVariants} className="eyebrow mb-4">
            more ships
          </motion.h3>
          <ul className="-mx-3 space-y-2">
            {MORE_SHIPS.map((project) => (
              <motion.li key={project.id} variants={riseVariants}>
                <ListRow
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={project.title}
                  sub={project.description}
                  meta={
                    <>
                      {project.tags.slice(0, 3).map((tag) => (
                        <Chip key={tag} className="hidden md:inline-flex">
                          {tag}
                        </Chip>
                      ))}
                      <span aria-hidden="true" className="text-tertiary">
                        ↗
                      </span>
                    </>
                  }
                />
              </motion.li>
            ))}
          </ul>
        </motion.div>
        </div>
      </div>
    </section>
  );
}

export default memo(Ships);
