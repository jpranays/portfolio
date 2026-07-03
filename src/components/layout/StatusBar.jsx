import { forwardRef, memo, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useVelocity,
} from "framer-motion";
import { ArrowUp, Terminal } from "lucide-react";
import { cn } from "../../utils/cn";
import { useAccent } from "../../hooks/useAccent";
import { useAvailability } from "../../hooks/useAvailability";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { useNpmStats } from "../../hooks/useNpmStats";
import { displayNpmWeekly } from "../../config/metrics";
import { AccentPopover } from "../effects/AccentPicker";
import { MusicToggle, getTrackName } from "../effects/MusicPlayer";
import { useOperatorMode } from "../effects/EasterEgg";

/**
 * StatusBar — THE SIGNATURE COMPONENT (DESIGN-V2 Part B §SECTIONS statusbar,
 * contract A4: StatusBar({ onOpenTerminal, onOpenShortcuts, musicPlaying,
 * onToggleMusic })).
 *
 * Fixed bottom, 36px (40px + safe-area on touch), surface-0 ~90% +
 * backdrop-saturate, hairline top border whose top edge carries the 2px
 * accent scroll-progress fill (ScrollProgress's new home — framer scaleX,
 * no spring). Left: availability dot — the page's ONLY looping animation
 * (2.4s pulse, off under reduced motion) + 'open to work' → #contact.
 * Center (md+): live npm readout (metrics floor + as-of tag on failure),
 * Pune clock (per-minute), scroll % + velocity glyph (▲/▼ during fast
 * scrolls — the redesigned scroll-velocity tilt), now-playing track while
 * music plays. Right: music EQ toggle, accent swatch → AccentPopover,
 * terminal glyph, '?' shortcuts, back-to-top after 100vh.
 *
 * Mobile trims the center readout and keeps 4 controls:
 * availability + music + accent + back-to-top.
 */

/** Now-playing label — single source is MusicPlayer's getTrackName(). */
const TRACK_NAME = getTrackName();

const VELOCITY_THRESHOLD = 1400; // px/s — "fast scroll"
const GLYPH_HOLD_MS = 400;

const KOLKATA_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatKolkata() {
  return KOLKATA_FMT.format(new Date());
}

/** Pune wall-clock, updated exactly per minute (aligned to :00). */
function useKolkataMinutes() {
  const [time, setTime] = useState(formatKolkata);
  useEffect(() => {
    let interval;
    const timeout = setTimeout(() => {
      setTime(formatKolkata());
      interval = setInterval(() => setTime(formatKolkata()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);
  return time;
}

/** Decorative separator between center readouts. */
function Sep() {
  return (
    <span aria-hidden="true" className="text-tertiary">
      ·
    </span>
  );
}

/**
 * 32px (40px touch) icon button with a 12px tooltip (fine pointers only)
 * + aria-label. Tooltip text is aria-hidden — the label carries it.
 */
const BarButton = forwardRef(function BarButton(
  { label, tooltip, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "group relative inline-flex h-8 w-8 items-center justify-center rounded-panel text-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-primary [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10",
        className
      )}
      {...rest}
    >
      {tooltip && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded border border-hairline bg-surface-1 px-1.5 py-0.5 text-xs text-secondary opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-visible:opacity-100 [@media(pointer:coarse)]:hidden"
        >
          {tooltip}
        </span>
      )}
      {children}
    </button>
  );
});

export const StatusBar = memo(function StatusBar({
  onOpenTerminal,
  onOpenShortcuts,
  musicPlaying,
  onToggleMusic,
}) {
  const reduced = useMotionPreference();
  const operatorOn = useOperatorMode();
  const { accent } = useAccent();
  const { available } = useAvailability();
  const { data } = useNpmStats();
  const npm = displayNpmWeekly(data?.total ?? null);
  const time = useKolkataMinutes();

  /* ── Scroll telemetry: progress fill + % readout + velocity glyph ── */
  const { scrollY, scrollYProgress } = useScroll();
  const velocity = useVelocity(scrollY);
  const [pct, setPct] = useState(0);
  const [glyph, setGlyph] = useState(null); // "up" | "down" | null
  const [showTop, setShowTop] = useState(false);
  const glyphTimer = useRef(null);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (Number.isFinite(v)) setPct(Math.min(100, Math.max(0, Math.round(v * 100))));
  });

  useMotionValueEvent(scrollY, "change", (y) => {
    setShowTop(y > window.innerHeight);
  });

  useMotionValueEvent(velocity, "change", (v) => {
    if (reduced) return;
    if (Math.abs(v) > VELOCITY_THRESHOLD) {
      setGlyph(v > 0 ? "down" : "up");
      clearTimeout(glyphTimer.current);
      glyphTimer.current = setTimeout(() => setGlyph(null), GLYPH_HOLD_MS);
    }
  });

  useEffect(() => {
    /* initial values on mount (deep links land mid-page) */
    const v = scrollYProgress.get();
    if (Number.isFinite(v)) setPct(Math.min(100, Math.max(0, Math.round(v * 100))));
    setShowTop(scrollY.get() > window.innerHeight);
    return () => clearTimeout(glyphTimer.current);
  }, [scrollY, scrollYProgress]);

  /* ── Accent popover ── */
  const [accentOpen, setAccentOpen] = useState(false);
  const swatchRef = useRef(null);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });

  return (
    <div
      data-chrome="statusbar"
      className={cn(
        "app-chrome fixed inset-x-0 bottom-0 z-40 border-t border-hairline",
        operatorOn && "scanlines"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* 2px accent scroll-progress fill along the top edge — no spring */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 origin-left bg-accent"
        style={{ scaleX: scrollYProgress }}
      />

      <div className="flex h-9 items-center justify-between gap-3 px-3 sm:px-4 [@media(pointer:coarse)]:h-10">
        {/* ── Left: availability — the page's ONLY looping animation ── */}
        <a
          href="#contact"
          className="flex h-full min-w-0 shrink-0 items-center gap-2 px-1 font-mono text-xs text-secondary transition-colors duration-fast hover:text-primary"
          aria-label={
            available
              ? "Availability: open to work — go to contact"
              : "Availability: heads-down — go to contact"
          }
        >
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            {available && !reduced && (
              <motion.span
                className="absolute inset-0 rounded-full bg-success"
                animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <span
              className={cn(
                "relative h-2 w-2 rounded-full",
                available ? "bg-success" : "bg-strong"
              )}
            />
          </span>
          <span className="truncate">{available ? "open to work" : "heads-down"}</span>
        </a>

        {/* ── Center (md+): live readout ── */}
        <div className="tnum hidden min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap font-mono text-xs text-secondary md:flex">
          <motion.span
            key={npm.value}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            npm ▸ {npm.value}/wk
            {!npm.isLive && <span> · as of {npm.asOf}</span>}
          </motion.span>
          <Sep />
          <span>PUNE {time}</span>
          <Sep />
          <span className="flex items-center gap-1">
            <span>{pct}%</span>
            <span aria-hidden="true" className="w-[1ch] text-accent-text">
              {glyph ? (glyph === "up" ? "▲" : "▼") : ""}
            </span>
          </span>
          {musicPlaying && (
            <>
              <Sep />
              <span className="truncate text-accent-text">♪ {TRACK_NAME}</span>
            </>
          )}
        </div>

        {/* ── Right: icon cluster ── */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {/* (1) music EQ toggle — owned by MusicPlayer.jsx (40px on touch) */}
          <MusicToggle
            playing={musicPlaying}
            onToggle={onToggleMusic}
            className="[@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"
          />

          {/* (2) accent swatch → AccentPopover */}
          <div className="relative">
            <BarButton
              ref={swatchRef}
              label={`Change accent color (current: ${accent})`}
              tooltip={`accent: ${accent}`}
              aria-haspopup="dialog"
              aria-expanded={accentOpen}
              onClick={() => setAccentOpen((v) => !v)}
            >
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 rounded-full border border-hairline"
                style={{ backgroundColor: "var(--ap-vivid)" }}
              />
            </BarButton>
            <AccentPopover
              open={accentOpen}
              onClose={() => setAccentOpen(false)}
              anchorRef={swatchRef}
            />
          </div>

          {/* (3) terminal — hidden on mobile (4-control trim) */}
          <BarButton
            label="Open terminal"
            tooltip="terminal · `"
            onClick={onOpenTerminal}
            className="hidden md:inline-flex"
          >
            <Terminal size={15} strokeWidth={1.75} aria-hidden="true" />
          </BarButton>

          {/* (4) shortcuts — hidden on mobile */}
          <BarButton
            label="Keyboard shortcuts"
            tooltip="shortcuts · ?"
            onClick={onOpenShortcuts}
            className="hidden md:inline-flex"
          >
            <span aria-hidden="true" className="font-mono text-[13px] font-medium">
              ?
            </span>
          </BarButton>

          {/* (5) back-to-top — appears after 100vh */}
          <AnimatePresence>
            {showTop && (
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
              >
                <BarButton label="Back to top" tooltip="back to top" onClick={scrollToTop}>
                  <ArrowUp size={15} strokeWidth={1.75} aria-hidden="true" />
                </BarButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

export default StatusBar;
