import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { cn } from "../../utils/cn";

/**
 * MusicPlayer — status-bar resident (DESIGN-V2 §EXTRAS 5, §STATUSBAR).
 *
 * Named export  MusicToggle({ playing, onToggle })
 *   The status-bar icon button: 3 EQ bars that animate ONLY while audio
 *   plays (static bars when paused or under reduced motion), 12px tooltip
 *   carrying the track name, aria-pressed state.
 *
 * Default export MusicPlayer({ playing })
 *   Headless audio manager: renders null, owns the singleton <audio>
 *   element (lazily created on first play), fades in/out on `playing`
 *   changes. App owns the playing state (via the kept useMusicPlayer hook
 *   or useState) and passes it down — this component never toggles itself.
 *
 * getTrackName() is a module-level getter so the StatusBar readout and the
 * terminal `whoami` can import the now-playing name without rendering
 * anything ("listening: lofi — playing").
 */

/* ── track (same audio asset path as the old player) ─────────────── */
const TRACK_SRC = "/music/background.mp3";
const TRACK_NAME = "lofi";
const TARGET_VOL = 0.35;
const FADE_IN_MS = 1800;
const FADE_OUT_MS = 1200;

/** Now-playing track name — importable by StatusBar / TerminalOverlay. */
export function getTrackName() {
  return TRACK_NAME;
}

/* ── module-level audio singleton ─────────────────────────────────── */
let _audio = null;
let _fadeId = null;

function getAudio() {
  if (!_audio && typeof Audio !== "undefined") {
    _audio = new Audio(TRACK_SRC);
    _audio.loop = true;
    _audio.volume = 0;
    _audio.preload = "none";
  }
  return _audio;
}

function fadeTo(audio, target, ms, onDone) {
  if (_fadeId) clearInterval(_fadeId);
  const start = audio.volume;
  const diff = target - start;
  const steps = 40;
  let step = 0;
  _fadeId = setInterval(() => {
    step += 1;
    audio.volume = Math.min(1, Math.max(0, start + diff * (step / steps)));
    if (step >= steps) {
      clearInterval(_fadeId);
      _fadeId = null;
      onDone?.();
    }
  }, ms / steps);
}

/* ── EQ bars — the toggle's glyph ─────────────────────────────────── */
const BARS = [
  { rest: 0.45, peak: 1.0, delay: 0 },
  { rest: 0.8, peak: 0.35, delay: 0.14 },
  { rest: 0.55, peak: 0.85, delay: 0.28 },
];

function EqBars({ animate }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
      {BARS.map((bar, i) => (
        <motion.span
          key={i}
          className="block w-[2px] rounded-full bg-current"
          style={{ height: 12, originY: 1 }}
          animate={
            animate
              ? { scaleY: [bar.rest, bar.peak, 0.2, bar.rest] }
              : { scaleY: bar.rest }
          }
          transition={
            animate
              ? { duration: 0.9, repeat: Infinity, delay: bar.delay, ease: "easeInOut" }
              : { duration: 0 }
          }
        />
      ))}
    </span>
  );
}

/**
 * MusicToggle — EQ-bar icon button for the status bar.
 * Bars animate only while `playing` and motion is allowed; otherwise the
 * bars render static (paused = low rest heights). 12px tooltip shows the
 * track name; aria-pressed carries state non-visually.
 */
export function MusicToggle({ playing, onToggle, className }) {
  const reduced = useMotionPreference();
  const label = playing ? `Pause music — ${TRACK_NAME}` : `Play music — ${TRACK_NAME}`;

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-pressed={playing}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-panel transition-colors duration-fast",
          playing ? "text-accent-text" : "text-secondary",
          "hover:bg-surface-2 hover:text-primary",
          className
        )}
      >
        <EqBars animate={playing && !reduced} />
      </button>
      {/* 12px tooltip w/ track name (sans per the typography contract) */}
      <span
        role="presentation"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap
                   rounded border border-hairline bg-surface-1 px-2 py-1 text-xs text-secondary
                   opacity-0 transition-opacity duration-fast
                   group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {playing ? `${TRACK_NAME} — playing` : `play ${TRACK_NAME}`}
      </span>
    </span>
  );
}

/**
 * MusicPlayer — headless audio manager (default export).
 * Drives the module-level audio element from the `playing` prop:
 * fade-in on play, fade-out then pause on stop. Renders nothing.
 */
export function MusicPlayer({ playing = false }) {
  const mountedRef = useRef(false);

  useEffect(() => {
    /* Never autoplay on mount — only react to real toggles */
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (!playing) return undefined;
    }

    const audio = getAudio();
    if (!audio) return undefined;

    if (playing) {
      audio.play().catch(() => {
        /* autoplay policy — the next user-gesture toggle will succeed */
      });
      fadeTo(audio, TARGET_VOL, FADE_IN_MS);
    } else {
      fadeTo(audio, 0, FADE_OUT_MS, () => audio.pause());
    }
    return undefined;
  }, [playing]);

  /* Stop cleanly if the manager unmounts mid-play */
  useEffect(
    () => () => {
      if (_fadeId) {
        clearInterval(_fadeId);
        _fadeId = null;
      }
      _audio?.pause();
    },
    []
  );

  return null;
}

export default MusicPlayer;
