import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { SectionHeader } from "../ui/SectionHeader";
import { Panel } from "../ui/Panel";
import { ListRow } from "../ui/ListRow";
import { Chip } from "../ui/Chip";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import {
  yearsSince,
  experienceLabel,
  SEARS_START,
  PROFESSIONAL_START,
} from "../../utils/experience";
import { CHAT_SAVINGS, PAYMENT_SUCCESS } from "../../config/metrics";

/* ── tenure phrasing (A3: durations come from utils/experience.js) ──── */

function ordinalYear(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
}

/** "4th" — the ordinal year of the Sears tenure, self-aging. */
const SEARS_YEAR = ordinalYear(Math.floor(yearsSince(SEARS_START)) + 1);

/* ── stack --receipts: every skill is a claim with a receipt ────────── */

const RECEIPTS = [
  {
    tech: "React",
    claim: `${experienceLabel()} yrs — checkout + the table library`,
    target: "work-checkout",
  },
  {
    tech: "TypeScript",
    claim: `everything since ${PROFESSIONAL_START.getFullYear()} — the typed table library`,
    target: "work-table",
  },
  {
    tech: "Node.js",
    claim: `the ${CHAT_SAVINGS} chat platform`,
    target: "work-chat",
  },
  {
    tech: "Next.js",
    claim: "SSG wiki rebuild",
    target: "work",
  },
  {
    tech: "Stripe",
    claim: `${PAYMENT_SUCCESS} payment success`,
    target: "work-stripe",
  },
];

/* One wrapped chip line — the long tail of the cut Skills section
   (sourced from the old src/data/skills.js groups). */
const ALSO_FLUENT = [
  "Socket.IO",
  "Express.js",
  "MongoDB",
  "Redis",
  "Jest",
  "React Testing Library",
  "TailwindCSS",
  "SCSS / Sass",
  "Redux / Zustand",
  "Vite",
  "Docusaurus",
  "GitHub Actions",
];

/* Interests from the old About INTERESTS data, emoji dropped. */
const OFF_HOURS = "off-hours: boxing & UFC, road trips, football.";

/* ── motion (A6: one-shot 12px rise + fade 320ms, 40ms row stagger) ── */

const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

function About() {
  const reduced = useMotionPreference();

  /**
   * Receipt click: smooth-scroll to the evidence row in ~/work and flash
   * its border in the accent for 800ms. Row ids are the shared contract
   * with Work.jsx: #work-checkout, #work-csp, #work-stripe, #work-table,
   * #work-chat ("work" alone targets the section for evidence that lives
   * in the role's details disclosure).
   */
  const jumpToReceipt = useCallback(
    (targetId) => {
      const el = document.getElementById(targetId);
      if (!el) return;

      el.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: targetId === "work" ? "start" : "center",
      });

      if (targetId === "work") return; // section anchor — no row border to flash

      const prevTransition = el.style.transition;
      el.style.transition = "border-color 150ms ease";
      el.style.borderColor = "var(--ap-vivid)";
      window.setTimeout(() => {
        el.style.borderColor = "";
        window.setTimeout(() => {
          el.style.transition = prevTransition;
        }, 200);
      }, 800);
    },
    [reduced]
  );

  return (
    <section id="about" aria-label="About">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div className="border-t border-hairline py-16 lg:py-20">
          <motion.div
            variants={stagger}
            initial={reduced ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.div variants={rise}>
              <SectionHeader
                eyebrow="~/about"
                title="Checkout security by day, open source by night"
              />
            </motion.div>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              {/* ── Left: the human story only — zero stat restatements ── */}
              <motion.div variants={rise} className="lg:col-span-7">
                <div className="max-w-[65ch] space-y-4 text-base leading-[1.65] text-secondary">
                  <p>
                    I got into software by pulling websites apart with
                    view-source and rebuilding them until they behaved. A
                    computer engineering degree in Pune followed, then a first
                    job spent shrinking an overweight WordPress plugin — an
                    early lesson that deleting code is a feature.
                  </p>
                  <p>
                    Now in my {SEARS_YEAR} year at Sears, I look after checkout
                    — the one page where a bug costs real money and real trust.
                    Payments work rewires you: security stops being a checklist
                    and becomes a habit you carry into everything else.
                    Developer tooling is the counterweight — when a problem
                    keeps recurring, it turns into a package, or a patch to the
                    library that almost solved it.
                  </p>
                  <p>
                    Off the clock I&apos;m still in Pune and still shipping —
                    lately around streaming AI interfaces and how to test them
                    honestly. Most of what I know about writing software came
                    from reading other people&apos;s pull requests; sending
                    some back feels like paying the same bill.
                  </p>
                  <p className="pt-2 font-mono text-[13px] text-tertiary">
                    numbers live in{" "}
                    <a
                      href="#work"
                      className="underline underline-offset-2 transition-colors duration-fast hover:text-secondary"
                    >
                      ~/work
                    </a>{" "}
                    and{" "}
                    <a
                      href="#upstream"
                      className="underline underline-offset-2 transition-colors duration-fast hover:text-secondary"
                    >
                      ~/upstream
                    </a>
                    .
                  </p>
                </div>
              </motion.div>

              {/* ── Right: stack --receipts (the Skills section, replaced) ── */}
              <motion.div variants={rise} className="lg:col-span-5">
                <Panel
                  as="aside"
                  size="lg"
                  header="stack --receipts"
                  glow
                  aria-label="Stack with receipts"
                >
                  <motion.ul
                    variants={stagger}
                    role="list"
                    className="-mx-3 divide-y divide-hairline"
                  >
                    {RECEIPTS.map((r) => (
                      <motion.li key={r.tech} variants={rise}>
                        <ListRow
                          type="button"
                          onClick={() => jumpToReceipt(r.target)}
                          aria-label={`${r.tech}: ${r.claim} — jump to the evidence in the work section`}
                          title={r.tech}
                          sub={r.claim}
                          meta={
                            <span
                              aria-hidden="true"
                              className="font-medium text-accent-text"
                            >
                              →
                            </span>
                          }
                        />
                      </motion.li>
                    ))}
                  </motion.ul>

                  <div className="mt-5 border-t border-hairline pt-4">
                    <p className="font-mono text-[13px] font-medium text-tertiary">
                      also fluent
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ALSO_FLUENT.map((name) => (
                        <Chip key={name}>{name}</Chip>
                      ))}
                    </div>
                    <p className="mt-4 text-[14px] leading-relaxed text-secondary">
                      {OFF_HOURS}
                    </p>
                  </div>
                </Panel>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default memo(About);
