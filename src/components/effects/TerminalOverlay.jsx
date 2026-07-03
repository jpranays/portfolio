import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal as TerminalIcon, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useOverlay } from "../../hooks/useOverlay";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { useNpmStats } from "../../hooks/useNpmStats";
import { ACCENTS } from "../../hooks/useAccent";
import { useToast } from "./Toast";
import { useOperatorMode, OPERATOR_EVENT, isOperatorOn } from "./EasterEgg";
import { Kbd } from "../ui/Kbd";
import { EXPERIENCE } from "../../data/experience";
import { OSS_CONTRIBUTIONS } from "../../data/opensource";
import { experienceLabel, SEARS_START } from "../../utils/experience";
import {
  AS_OF,
  OSS_MONTHLY,
  PR_COUNT,
  ATTACK_SURFACE,
  PAYMENT_SUCCESS,
  LOAD_TIME,
  CHAT_SAVINGS,
  RESOLUTION,
  COVERAGE,
  displayNpmWeekly,
  displayPkgWeekly,
} from "../../config/metrics";

/**
 * TerminalOverlay — bottom-docked terminal panel (DESIGN-V2 A4,
 * Part B §EXTRAS (2)). Warp/VSCode idiom, NOT a modal: slides up 320px
 * above the status bar at --dur-panel with the panel ease; the page behind
 * stays visible. Focus is trapped inside via useOverlay (Escape closes,
 * focus restores). Opens via backtick, the status-bar terminal button, or
 * the palette — App owns that state and passes { open, onClose }.
 *
 * The boot line types ONCE per session (the sanctioned descendant of the
 * old typewriter): aria-hidden while animating, with an sr-only transcript;
 * instant under reduced motion.
 *
 * Commands (contract, A4): help, whoami, stack, work, oss, npm, prs, hire,
 * email, resume, theme <light|dark>, accent <name>, clear, exit, konami.
 * Every number comes from src/config/metrics.js, src/data/*, or
 * utils/experience.js — never hardcoded (A3).
 *
 * Operator mode (html[data-operator="on"]) applies the .scanlines texture.
 */

const EMAIL = "pranay1315@gmail.com";
const RESUME_URL = "/Pranay_Jadhav_Resume.pdf";
const PACKAGES = ["react-fast-hooks", "cli-gh"];
const FEATURED_PR_IDS = ["react-tooltip", "mantine", "primereact", "rsuite"];

const BOOT_TEXT =
  "pranay@portfolio — session start · type 'help' for commands · Esc closes";

/* The boot line types once per session; later opens render it instantly. */
let bootHasTyped = false;

/* Output tone → token classes (12px floor respected — output is 13px mono) */
const TONE = {
  head: "text-primary font-medium",
  body: "text-secondary",
  accent: "text-accent-text",
  dim: "text-tertiary",
  err: "text-danger",
};

let nextBlockId = 0;

/* ── helpers ─────────────────────────────────────────────────────────── */

function applyTheme(mode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem("pj-theme", mode);
  } catch {
    /* storage unavailable — theme still applies for the session */
  }
}

/**
 * Now-playing readout for `whoami` (A7 steal-idea: music state as telemetry).
 * The MusicPlayer audio manager may surface state as (checked in order):
 *   1. window.__pjNowPlaying — { playing, track } object or getter fn
 *   2. html[data-music="on"] (+ optional data-track)
 *   3. any playing <audio> element in the DOM
 * Returns a track label while music plays, else null.
 */
function getNowPlaying() {
  try {
    const g = window.__pjNowPlaying;
    const state = typeof g === "function" ? g() : g;
    if (state && typeof state === "object") {
      return state.playing ? state.track || "lofi" : null;
    }
    const ds = document.documentElement.dataset;
    if (ds.music === "on" || ds.music === "playing") return ds.track || "lofi";
    const audio = Array.from(document.querySelectorAll("audio")).find(
      (a) => !a.paused && !a.ended && a.currentTime > 0
    );
    if (audio) {
      const base = (audio.currentSrc || audio.src || "").split("/").pop() || "";
      const name = base.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
      return name || "lofi";
    }
  } catch {
    /* fall through */
  }
  return null;
}

function truncate(str, max = 64) {
  return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
}

/* ── command engine ──────────────────────────────────────────────────── */

const HELP_LINES = [
  { t: "commands", tone: "head" },
  { t: "  help                this list" },
  { t: "  whoami              identity + live telemetry" },
  { t: "  stack               technologies, with receipts" },
  { t: "  work                roles and measured outcomes" },
  { t: "  oss                 upstream contributions, headline" },
  { t: "  prs                 every merged PR" },
  { t: "  npm                 weekly downloads per package" },
  { t: "  hire                jump to ~/contact" },
  { t: `  email               copy ${EMAIL}` },
  { t: "  resume              open the resume pdf ↗" },
  { t: "  theme <light|dark>  switch theme" },
  { t: `  accent <name>       ${ACCENTS.map((a) => a.key).join(" | ")}` },
  { t: "  clear               clear the buffer" },
  { t: "  exit                close the terminal (Esc works too)" },
  { t: "  konami              you know the rest", tone: "dim" },
];

function whoamiLines(npmData) {
  const npm = displayNpmWeekly(npmData?.total ?? null);
  const lines = [
    { t: "Pranay Jadhav", tone: "head" },
    { t: "  role      Senior Software Developer · Sears India · Pune, IN" },
    {
      t: `  exp       ${experienceLabel()} yrs professional · ${experienceLabel(
        SEARS_START
      )} yrs at Sears`,
    },
    {
      t: `  npm       ${npm.value}/wk ${
        npm.isLive ? "· npm registry — live" : `· as of ${npm.asOf}`
      }`,
    },
    { t: `  oss       ${OSS_MONTHLY} devs/month across ${PR_COUNT} merged PRs` },
    { t: `  email     ${EMAIL}` },
    { t: "  status    open to senior frontend roles", tone: "accent" },
  ];
  const track = getNowPlaying();
  if (track) {
    lines.push({ t: `  listening ${track} — playing`, tone: "accent" });
  }
  return lines;
}

function stackLines() {
  return [
    { t: "stack --receipts", tone: "head" },
    { t: `  React       ${experienceLabel()} yrs — checkout + the react-table library` },
    { t: "  TypeScript  everything since 2022" },
    { t: `  Node.js     the ${CHAT_SAVINGS} chat platform` },
    { t: "  Next.js     SSG wiki rebuild" },
    { t: `  Stripe      ${PAYMENT_SUCCESS} payment success` },
    { t: "" },
    {
      t: "also fluent: Socket.IO · MongoDB · Jest · Tailwind · Express · Figma",
      tone: "dim",
    },
  ];
}

function workLines() {
  const sears = EXPERIENCE.find((e) => e.current) ?? EXPERIENCE[0];
  const mini = EXPERIENCE.find((e) => !e.current);
  const lines = [
    { t: `${sears.role} · ${sears.company} · ${sears.period}`, tone: "head" },
    { t: `  · PCI-DSS checkout ownership — ${ATTACK_SURFACE} client-side attack surface` },
    { t: `  · Stripe migration — ${PAYMENT_SUCCESS} payment success · ${LOAD_TIME} load time` },
    { t: `  · Node.js + Socket.IO chat platform — resolution time −${RESOLUTION} · ${CHAT_SAVINGS} saved` },
    { t: `  · react-table library — ${COVERAGE} coverage, adopted company-wide` },
  ];
  if (mini) {
    lines.push(
      { t: "" },
      { t: `${mini.role} · ${mini.company} · ${mini.period}`, tone: "head" },
      { t: "  · WordPress SSO plugin 1.5MB → 270KB (+70% downloads)" }
    );
  }
  return lines;
}

function ossLines() {
  const featured = FEATURED_PR_IDS.map((id) =>
    OSS_CONTRIBUTIONS.find((c) => c.id === id)
  ).filter(Boolean);
  return [
    {
      t: `${PR_COUNT} PRs merged · combined ${OSS_MONTHLY} downloads/month`,
      tone: "head",
    },
    ...featured.map((c) => ({
      t: `  ${c.library.padEnd(14)} ${c.pr.padEnd(7)} ${c.impact}`,
    })),
    { t: "run 'prs' for the full list", tone: "dim" },
  ];
}

function prsLines() {
  return [
    { t: `merged upstream (${OSS_CONTRIBUTIONS.length})`, tone: "head" },
    ...OSS_CONTRIBUTIONS.map((c) => ({
      t: `  ${c.library.padEnd(22)} ${c.pr.padEnd(7)} ${truncate(c.description, 56)}`,
    })),
  ];
}

function npmLines(npmData) {
  const livePkgs = npmData?.packages ?? null;
  const rows = PACKAGES.map((pkg) => {
    const liveCount = livePkgs?.find((p) => p.name === pkg)?.downloads ?? null;
    const d = displayPkgWeekly(pkg, liveCount);
    return { t: `  ${pkg.padEnd(18)} ${`${d.value}/wk`.padStart(12)}` };
  });
  const total = displayNpmWeekly(npmData?.total ?? null);
  return [
    { t: "weekly downloads", tone: "head" },
    ...rows,
    { t: `  ${"total".padEnd(18)} ${`${total.value}/wk`.padStart(12)}`, tone: "accent" },
    {
      t: total.isLive ? "npm registry — live" : `floor values — as of ${AS_OF}`,
      tone: "dim",
    },
  ];
}

/* ── component ───────────────────────────────────────────────────────── */

function TerminalOverlayImpl({ open, onClose }) {
  const reduced = useMotionPreference();
  const operatorOn = useOperatorMode();
  const toast = useToast();
  const { data: npmData } = useNpmStats();

  const [blocks, setBlocks] = useState([]);
  const [showBoot, setShowBoot] = useState(true);
  const [bootShown, setBootShown] = useState(bootHasTyped ? BOOT_TEXT : "");
  const [bootTyping, setBootTyping] = useState(false);
  const [input, setInput] = useState("");

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const historyRef = useRef([]);
  const histIdxRef = useRef(-1);
  const timersRef = useRef([]);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const { containerRef, overlayProps } = useOverlay({
    open,
    onClose,
    initialFocusRef: inputRef,
  });

  /* Status-bar clearance: 36px desktop / 40px touch (+ safe area). */
  const [bottomOffset] = useState(() => {
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
    return `calc(${coarse ? 40 : 36}px + env(safe-area-inset-bottom, 0px))`;
  });

  /* Boot line — types once per session, instant thereafter / under
     reduced motion. aria-hidden while animated; sr-only transcript. */
  useEffect(() => {
    if (!open || bootHasTyped) return undefined;
    if (reduced) {
      bootHasTyped = true;
      setBootShown(BOOT_TEXT);
      return undefined;
    }
    setBootTyping(true);
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(i + 2, BOOT_TEXT.length);
      setBootShown(BOOT_TEXT.slice(0, i));
      if (i >= BOOT_TEXT.length) {
        window.clearInterval(id);
        bootHasTyped = true;
        setBootTyping(false);
      }
    }, 24);
    return () => {
      window.clearInterval(id);
      /* If interrupted mid-type, settle on the full line for next open. */
      bootHasTyped = true;
      setBootShown(BOOT_TEXT);
      setBootTyping(false);
    };
  }, [open, reduced]);

  /* Keep the log pinned to the newest output. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [blocks, bootShown, open]);

  /* Clear any pending jump timers on unmount. */
  useEffect(
    () => () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    },
    []
  );

  const closeThenScrollTo = useCallback(
    (sectionId) => {
      timersRef.current.push(
        window.setTimeout(() => {
          onCloseRef.current?.();
          timersRef.current.push(
            window.setTimeout(() => {
              document.getElementById(sectionId)?.scrollIntoView({
                behavior: reduced ? "auto" : "smooth",
              });
            }, 80)
          );
        }, 320)
      );
    },
    [reduced]
  );

  const execute = useCallback(
    (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      const [name, ...restParts] = trimmed.split(/\s+/);
      const cmd = name.toLowerCase();
      const arg = restParts.join(" ").toLowerCase();

      const print = (lines) => {
        setBlocks((prev) => [
          ...prev,
          { id: ++nextBlockId, cmd: trimmed, lines },
        ]);
      };

      switch (cmd) {
        case "help":
          print(HELP_LINES);
          break;

        case "whoami":
          print(whoamiLines(npmData));
          break;

        case "stack":
          print(stackLines());
          break;

        case "work":
          print(workLines());
          break;

        case "oss":
          print(ossLines());
          break;

        case "prs":
          print(prsLines());
          break;

        case "npm":
          print(npmLines(npmData));
          break;

        case "hire":
          print([
            { t: "opening ~/contact — I reply within 24 hours.", tone: "accent" },
          ]);
          closeThenScrollTo("contact");
          break;

        case "email":
          print([{ t: EMAIL, tone: "head" }, { t: "copied to clipboard", tone: "dim" }]);
          navigator.clipboard
            ?.writeText(EMAIL)
            .then(() => toast.success("Email copied to clipboard"))
            .catch(() => toast.error("Copy failed — the address is printed above"));
          break;

        case "resume":
          print([{ t: "opening resume ↗", tone: "accent" }]);
          window.open(RESUME_URL, "_blank", "noopener,noreferrer");
          window.dispatchEvent(new CustomEvent("portfolio:resume-download"));
          break;

        case "theme":
          if (arg === "light" || arg === "dark") {
            applyTheme(arg);
            print([{ t: `theme set to ${arg}`, tone: "accent" }]);
          } else {
            print([{ t: "usage: theme <light|dark>", tone: "err" }]);
          }
          break;

        case "accent": {
          const valid = ACCENTS.some((a) => a.key === arg);
          if (valid) {
            window.dispatchEvent(
              new CustomEvent("portfolio:set-accent", { detail: arg })
            );
            print([{ t: `accent set to ${arg}`, tone: "accent" }]);
          } else {
            print([
              {
                t: `usage: accent <${ACCENTS.map((a) => a.key).join("|")}>`,
                tone: "err",
              },
            ]);
          }
          break;
        }

        case "clear":
          setBlocks([]);
          setShowBoot(false);
          break;

        case "exit":
        case "close":
          onCloseRef.current?.();
          break;

        case "konami":
          print([
            {
              t: isOperatorOn()
                ? "operator mode disengaging…"
                : "↑ ↑ ↓ ↓ ← → ← → B A — operator mode engaging…",
              tone: "accent",
            },
          ]);
          window.dispatchEvent(new CustomEvent(OPERATOR_EVENT));
          break;

        default:
          print([
            { t: `command not found: ${cmd} — try 'help'`, tone: "err" },
          ]);
      }
    },
    [npmData, toast, closeThenScrollTo]
  );

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const trimmed = input.trim();
      if (trimmed) {
        historyRef.current = [
          trimmed,
          ...historyRef.current.filter((c) => c !== trimmed),
        ].slice(0, 50);
        execute(trimmed);
      }
      histIdxRef.current = -1;
      setInput("");
    },
    [input, execute]
  );

  const handleInputKeyDown = useCallback((event) => {
    const history = historyRef.current;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = Math.min(histIdxRef.current + 1, history.length - 1);
      histIdxRef.current = next;
      setInput(history[next] ?? "");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = histIdxRef.current - 1;
      if (next < 0) {
        histIdxRef.current = -1;
        setInput("");
      } else {
        histIdxRef.current = next;
        setInput(history[next] ?? "");
      }
    }
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          {...overlayProps}
          aria-label="Terminal"
          initial={reduced ? { opacity: 0 } : { y: "110%" }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: "110%" }}
          transition={{
            duration: reduced ? 0 : 0.24,
            ease: [0.32, 0.72, 0, 1],
          }}
          className={cn(
            "fixed inset-x-0 z-[60] flex h-[320px] max-h-[60vh] flex-col border-t border-hairline bg-surface-1",
            operatorOn && "scanlines"
          )}
          style={{ bottom: bottomOffset }}
        >
          {/* Header row */}
          <div className="flex h-10 shrink-0 items-center gap-3 border-b border-hairline px-4 sm:px-6">
            <TerminalIcon className="h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-secondary">
              pranay@portfolio: ~
            </span>
            <span
              className="hidden items-center gap-1.5 text-[13px] text-tertiary sm:flex"
              aria-hidden="true"
            >
              <Kbd>`</Kbd> to toggle
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close terminal"
              className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-panel text-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Output log */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            className="tnum flex-1 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed sm:px-6"
          >
            {showBoot && (
              <p className="mb-2 text-secondary">
                <span aria-hidden="true">
                  {bootShown}
                  {bootTyping && <span className="text-accent-text">▊</span>}
                </span>
                <span className="sr-only">{BOOT_TEXT}</span>
              </p>
            )}
            {blocks.map((block) => (
              <div key={block.id} className="mb-2">
                <p className="whitespace-pre-wrap break-words">
                  <span aria-hidden="true" className="text-accent-text">
                    ❯{" "}
                  </span>
                  <span className="text-primary">{block.cmd}</span>
                </p>
                {block.lines.map((line, i) =>
                  line.t === "" ? (
                    <div key={i} className="h-2" aria-hidden="true" />
                  ) : (
                    <p
                      key={i}
                      className={cn(
                        "whitespace-pre-wrap break-words",
                        TONE[line.tone] ?? TONE.body
                      )}
                    >
                      {line.t}
                    </p>
                  )
                )}
              </div>
            ))}
          </div>

          {/* Input row — 16px input per A1 (iOS never auto-zooms) */}
          <form
            onSubmit={handleSubmit}
            className="flex h-12 shrink-0 items-center gap-2 border-t border-hairline px-4 sm:px-6"
          >
            <span className="font-mono text-[13px] text-accent-text" aria-hidden="true">
              ❯
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="type a command — try 'help'"
              aria-label="Terminal command input"
              className="h-8 min-w-0 flex-1 bg-transparent font-mono text-[16px] text-primary placeholder:text-tertiary"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="send"
            />
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const TerminalOverlay = memo(TerminalOverlayImpl);

export default TerminalOverlay;
