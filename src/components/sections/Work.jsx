import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { ListRow } from "../ui/ListRow";
import { Chip } from "../ui/Chip";
import { Metric } from "../ui/Metric";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { cn } from "../../utils/cn";
import {
  ATTACK_SURFACE,
  PAYMENT_SUCCESS,
  LOAD_TIME,
  CHAT_SAVINGS,
  RESOLUTION,
  COVERAGE,
} from "../../config/metrics";
import { experienceLabel, SEARS_START } from "../../utils/experience";
import { EXPERIENCE } from "../../data/experience";

/**
 * Work — replaces Experience.jsx (DESIGN-V2 Part B §SECTIONS --- work ---).
 *
 * Anatomy: SectionHeader (~/work) → WINS STRIP (3 Metric blocks, mono
 * source-tags per A7, hairline-divided asymmetric row, each linking to its
 * evidence row) → Sears case block (header row + 4 outcome-first highlight
 * rows + award callout + <details> disclosure + tech chips) → MiniOrange
 * one-row → education hairline strip + LeetCode link.
 *
 * Evidence-row ids (anchor targets for the wins strip AND the ~/about
 * "stack --receipts" panel): work-checkout, work-hardening, work-stripe,
 * work-table, work-chat (award row), work-more (details), work-openai,
 * work-wiki, work-offers. Navigating to any of them — via the wins strip,
 * a hash link from another section, or a deep link — flashes the target
 * row's border in accent for 800ms (§ABOUT receipts pattern).
 *
 * Numbers: wins/coverage/resolution from src/config/metrics.js; Sears
 * tenure from utils/experience.js (never hardcoded). Copy is the rewritten
 * outcome-first blueprint text — changelog voice, no marketing adjectives.
 */

const FLASH_MS = 800;

/* Sears checkout tenure — derives from SEARS_START, ages itself (A3). */
const SEARS_TENURE = experienceLabel(SEARS_START);

/* ── WINS STRIP — the three headline outcomes, each with provenance ── */
const WINS = [
  {
    id: "work-hardening",
    value: ATTACK_SURFACE,
    label: "client-side attack surface",
    source: "csp report-uri telemetry",
  },
  {
    id: "work-stripe",
    value: PAYMENT_SUCCESS,
    label: "payment success after Stripe migration",
    source: "shopyourway.com checkout",
  },
  {
    id: "work-chat",
    value: CHAT_SAVINGS,
    label: "saved by replacing vendor chat",
    source: "vendor contract — annualized",
  },
];

/* ── Sears highlights — outcome-first: metric chip + bold lead +
     one supporting sentence. Order per blueprint. ─────────────────── */
const HIGHLIGHTS = [
  {
    id: "work-checkout",
    chip: `PCI-DSS · ${SEARS_TENURE} yrs`,
    lead: "Owns the PCI-DSS checkout on shopyourway.com.",
    support: `A no-login, ref-ID-validated React checkout taking live card payments across saved and custom cards — ${SEARS_TENURE} years of continuous ownership.`,
  },
  {
    id: "work-hardening",
    chip: `${ATTACK_SURFACE} attack surface`,
    lead: "Locked card data inside a sandboxed iframe.",
    support:
      "SRI hash injection and strict Content Security Policies with report-uri telemetry — injected scripts lost their reach into the payment fields.",
  },
  {
    id: "work-stripe",
    chip: `${PAYMENT_SUCCESS} success · ${LOAD_TIME} load`,
    lead: "Moved payment processing to Stripe Elements.",
    support:
      "Retired the legacy in-house card backend and offloaded validation plus PCI scope to Stripe — payment success up, checkout load time down.",
  },
  {
    id: "work-table",
    chip: `${COVERAGE} coverage`,
    lead: "Built the in-house React-Table library, adopted company-wide.",
    support:
      "Priority-based sorting, multi-column filtering, virtualization, and full WCAG accessibility — shipped with CI/CD and Docusaurus docs.",
  },
];

/* ── <details> disclosure — the quieter shipments from the role ────── */
const MORE_FROM_ROLE = [
  {
    id: "work-openai",
    text: "Integrated OpenAI's streaming API — live markdown rendering with error handling, response regeneration, and request abortion.",
  },
  {
    id: "work-wiki",
    text: "Rebuilt the internal wiki on Next.js SSG with incremental builds — fast, searchable docs.",
  },
  {
    id: "work-offers",
    text: "Shipped a no-code offers platform — vendors schedule ad campaigns through cron-based automation; adopted by 3+ high-profile vendors.",
  },
];

const DETAILS_IDS = new Set(["work-more", ...MORE_FROM_ROLE.map((b) => b.id)]);

const FLASHABLE_IDS = new Set([
  ...HIGHLIGHTS.map((r) => r.id),
  "work-chat",
  ...DETAILS_IDS,
]);

const SEARS_TECH =
  EXPERIENCE.find((e) => e.company === "Sears India")?.tech ?? [];

function Work() {
  const reduced = useMotionPreference();
  const [flashedId, setFlashedId] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const flashTimer = useRef(null);

  /* 800ms one-shot accent border flash on the target row. */
  const flash = useCallback((id) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashedId(id);
    flashTimer.current = setTimeout(() => setFlashedId(null), FLASH_MS);
  }, []);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  /* Wins-strip links: smooth-scroll (instant under reduced motion),
     record the hash without a jump, flash the evidence row. */
  const jumpTo = useCallback(
    (event, id) => {
      event.preventDefault();
      if (DETAILS_IDS.has(id)) setMoreOpen(true);
      window.history.replaceState(null, "", `#${id}`);
      requestAnimationFrame(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      });
      flash(id);
    },
    [reduced, flash]
  );

  /* External navigation — :target deep links on load and hash links from
     other sections (the ~/about receipts panel) — flashes the row too, and
     opens the <details> first when the target lives inside it. */
  useEffect(() => {
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!FLASHABLE_IDS.has(id)) return;
      if (DETAILS_IDS.has(id)) {
        setMoreOpen(true);
        requestAnimationFrame(() => {
          document
            .getElementById(id)
            ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        });
      }
      flash(id);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [flash, reduced]);

  /* Section entrance (A6): one-shot 12px rise + fade 320ms, 40ms row
     stagger, viewport-once. Reduced motion renders everything in place. */
  const rise = reduced
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
      };
  const stagger = {
    hidden: {},
    show: reduced ? {} : { transition: { staggerChildren: 0.04 } },
  };

  const flashClass = (id) => flashedId === id && "border-accent";

  return (
    <section id="work" aria-labelledby="work-heading">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="border-t border-hairline py-16 lg:py-20"
        >
          <motion.div variants={rise}>
            <SectionHeader
              id="work-heading"
              eyebrow="~/work"
              title="Payments infrastructure, hardened and measured"
            />
          </motion.div>

          {/* ── WINS STRIP — hairline-divided asymmetric row, not cards ── */}
          <motion.div
            variants={stagger}
            className="mb-10 grid grid-cols-1 divide-y divide-hairline border-y border-hairline sm:grid-cols-[1fr_1.25fr_1.1fr] sm:divide-x sm:divide-y-0"
          >
            {WINS.map((win) => (
              <motion.a
                key={win.id}
                variants={rise}
                href={`#${win.id}`}
                onClick={(e) => jumpTo(e, win.id)}
                className="block py-5 transition-colors duration-fast hover:bg-surface-2 sm:px-6 sm:py-6 sm:first:pl-0"
              >
                <Metric value={win.value} label={win.label} sourceTag={win.source} />
                <span className="sr-only">— jump to the evidence row</span>
              </motion.a>
            ))}
          </motion.div>

          {/* ── Sears case block ──────────────────────────────────────── */}
          <motion.div
            variants={rise}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
          >
            <h3 className="text-lg font-semibold leading-[1.4] text-primary">
              Senior Software Developer
            </h3>
            <span className="text-base text-secondary">Sears India</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="font-mono text-[13px] text-secondary">
                Mar 2023 — present
              </span>
              <Chip>Current</Chip>
            </span>
          </motion.div>

          <motion.ul variants={stagger} className="mt-4 space-y-2">
            {HIGHLIGHTS.map((row) => (
              <ListRow
                key={row.id}
                as={motion.li}
                variants={rise}
                id={row.id}
                className={cn(
                  "items-start border border-hairline bg-surface-1 p-4",
                  flashClass(row.id)
                )}
              >
                <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                  <Chip variant="accent" className="w-fit shrink-0 sm:mt-0.5">
                    {row.chip}
                  </Chip>
                  <span className="block max-w-[65ch] text-base leading-relaxed">
                    <span className="font-semibold text-primary">{row.lead}</span>{" "}
                    <span className="text-secondary">{row.support}</span>
                  </span>
                </span>
              </ListRow>
            ))}
          </motion.ul>

          {/* ── AWARD CALLOUT — 2px accent left border ────────────────── */}
          <motion.div
            variants={rise}
            id="work-chat"
            className={cn(
              "mt-4 flex items-start gap-3 border border-l-2 border-transparent border-l-accent py-3 pl-4 pr-3 transition-colors duration-fast",
              flashClass("work-chat")
            )}
          >
            <Award aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-accent-text" />
            <p className="max-w-[65ch] text-base leading-relaxed text-secondary">
              <span className="font-semibold text-primary">Excellence Award</span> — led
              the Node.js + Socket.IO chat platform that replaced a vendor, cut
              resolution time <span className="tnum">{RESOLUTION}</span>, and saves{" "}
              <span className="tnum">{CHAT_SAVINGS}</span>.
            </p>
          </motion.div>

          {/* ── more from this role — native disclosure ───────────────── */}
          <motion.div variants={rise} className="mt-4">
            <details
              id="work-more"
              className="group"
              open={moreOpen}
              onToggle={(e) => setMoreOpen(e.currentTarget.open)}
            >
              <summary className="flex min-h-[40px] w-fit cursor-pointer list-none items-center gap-2 font-mono text-[13px] font-medium text-secondary transition-colors duration-fast hover:text-primary [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-base group-open:rotate-90"
                >
                  ▸
                </span>
                more from this role ({MORE_FROM_ROLE.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {MORE_FROM_ROLE.map((bullet) => (
                  <li
                    key={bullet.id}
                    id={bullet.id}
                    className={cn(
                      "flex gap-3 rounded-panel border border-transparent px-3 py-1.5 text-base leading-relaxed text-secondary transition-colors duration-fast",
                      flashClass(bullet.id)
                    )}
                  >
                    <span aria-hidden="true" className="select-none font-mono text-tertiary">
                      –
                    </span>
                    <span className="max-w-[65ch]">{bullet.text}</span>
                  </li>
                ))}
              </ul>
            </details>
          </motion.div>

          {/* ── tech chips — one line, neutral mono 12px ──────────────── */}
          <motion.ul
            variants={rise}
            aria-label="Technologies at Sears"
            className="mt-6 flex flex-wrap gap-1.5"
          >
            {SEARS_TECH.map((tech) => (
              <li key={tech}>
                <Chip>{tech}</Chip>
              </li>
            ))}
          </motion.ul>

          {/* ── MiniOrange — one compact row ──────────────────────────── */}
          <motion.div
            variants={rise}
            className="mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-hairline py-4"
          >
            <span className="text-[15px] font-medium text-primary">
              Web Developer · MiniOrange
            </span>
            <span className="font-mono text-[13px] text-secondary">Jul–Nov 2022</span>
            <span className="tnum max-w-[65ch] text-[15px] text-secondary">
              — shrank the WordPress SSO plugin 1.5 MB → 270 KB (+70% downloads).
            </span>
          </motion.div>

          {/* ── education — single hairline strip + LeetCode ──────────── */}
          <motion.div
            variants={rise}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-hairline py-3"
          >
            <p className="tnum text-[15px] text-secondary">
              B.E. Computer Engineering, P.E.S. Modern College Pune · 9.05 CGPA ·
              2018–2022
            </p>
            <a
              href="https://leetcode.com/u/jpranays"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-1 text-[13px] font-medium text-accent-text underline-offset-4 transition-colors duration-fast hover:underline"
            >
              LeetCode <span aria-hidden="true">↗</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default memo(Work);
