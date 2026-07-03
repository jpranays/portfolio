import { memo, useEffect, useRef, useState } from "react";
import { Github, Moon, Search, Sun } from "lucide-react";
import { cn } from "../../utils/cn";
import { Kbd } from "../ui/Kbd";
import { useToast } from "../effects/Toast";
import { useMotionPreference } from "../../hooks/useMotionPreference";

/**
 * Titlebar — the app window's top chrome (DESIGN-V2 Part B §SECTIONS titlebar,
 * contract A4: Titlebar({ onOpenPalette, theme, toggleTheme, activeSection })).
 *
 * Fixed top, 48px, surface-0 at ~90% + backdrop-saturate (.app-chrome),
 * hairline bottom border. Left: 28px 'PJ' monogram tile — click scrolls to
 * top, 7 rapid taps dispatch `portfolio:operator-unlock` (the touch Konami
 * path; toast confirms at tap 5), hover crossfades to mono '@jpranays'
 * (aria-label constant). Center (md+): live breadcrumb 'pranay-jadhav /
 * {section}' — clicking opens the palette. Right: the ⌘K button (visible at
 * EVERY breakpoint — input-styled at md+, 40px icon button on mobile),
 * theme toggle (one-shot 180ms icon morph), GitHub link.
 *
 * The old hamburger drawer is gone — the palette is the mobile nav.
 */

const GITHUB_URL = "https://github.com/jpranays";

/** Constant across the hover crossfade (A7 wordmark crossfade). */
const MONOGRAM_ARIA = "Pranay Jadhav — scroll to top";

/** Breadcrumb segment 2 per section id (ids owned by App/useActiveSection). */
const SECTION_LABELS = {
  hero: "home",
  work: "work",
  ships: "ships",
  upstream: "upstream",
  about: "about",
  contact: "contact",
};

const TAP_WINDOW_MS = 1500;
const TAPS_TO_UNLOCK = 7;
const TAP_TEASE_AT = 5;

export const Titlebar = memo(function Titlebar({
  onOpenPalette,
  theme,
  toggleTheme,
  activeSection,
}) {
  const toast = useToast();
  const reduced = useMotionPreference();

  /* Resolve dark for the icon morph — theme may be "system". */
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const isDark = theme === "system" ? systemDark : theme === "dark";

  /* 7-tap Konami counter (aria-hidden — never announced) */
  const tapsRef = useRef({ count: 0, timer: null });
  useEffect(() => () => clearTimeout(tapsRef.current.timer), []);

  const handleMonogram = () => {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });

    const taps = tapsRef.current;
    clearTimeout(taps.timer);
    taps.count += 1;

    if (taps.count === TAP_TEASE_AT) {
      toast.info("2 more…", 2000);
    }
    if (taps.count >= TAPS_TO_UNLOCK) {
      taps.count = 0;
      window.dispatchEvent(new CustomEvent("portfolio:operator-unlock"));
      return;
    }
    taps.timer = setTimeout(() => {
      taps.count = 0;
    }, TAP_WINDOW_MS);
  };

  const sectionLabel = SECTION_LABELS[activeSection] ?? activeSection ?? "home";

  return (
    <header
      data-chrome="titlebar"
      className="app-chrome fixed inset-x-0 top-0 z-40 h-12 border-b border-hairline"
    >
      <div className="mx-auto flex h-full max-w-[1120px] items-center gap-3 px-5 sm:px-8">
        {/* ── Monogram tile: scroll-top + tap-konami + @jpranays crossfade ── */}
        <button
          type="button"
          onClick={handleMonogram}
          aria-label={MONOGRAM_ARIA}
          className="group relative -ml-1.5 flex shrink-0 items-center rounded-panel p-1.5"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-hairline bg-surface-2 font-mono text-xs font-medium text-primary transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0"
          >
            PJ
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1.5 flex items-center whitespace-nowrap font-mono text-[13px] font-medium text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            @jpranays
          </span>
        </button>

        {/* ── Breadcrumb (md+) — click opens the palette ── */}
        <div className="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden h-8 min-w-0 items-center gap-1.5 rounded-panel px-2 font-mono text-[13px] text-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-primary md:flex"
            aria-label={`pranay-jadhav / ${sectionLabel} — open command palette`}
          >
            <span className="truncate">pranay-jadhav</span>
            <span aria-hidden="true" className="text-tertiary">
              /
            </span>
            <span aria-current="location" className="truncate text-primary">
              {sectionLabel}
            </span>
          </button>
        </div>

        {/* ── Right cluster ── */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* ⌘K — input-styled at md+, icon button on mobile (every breakpoint) */}
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Search and jump — open command palette"
            className="hidden h-8 w-44 items-center gap-2 rounded-panel border border-strong bg-surface-1 px-2.5 text-left transition-colors duration-fast hover:bg-surface-2 md:flex lg:w-56"
          >
            <Search size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-tertiary" />
            <span className="min-w-0 flex-1 truncate text-[13px] text-tertiary">
              {"Search & jump…"}
            </span>
            <Kbd aria-hidden="true">⌘K</Kbd>
          </button>
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Search and jump — open command palette"
            className="flex h-10 w-10 items-center justify-center rounded-panel text-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-primary md:hidden"
          >
            <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>

          {/* Theme toggle — one-shot 180ms icon morph */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch theme (current: ${theme ?? "light"})`}
            className="relative flex h-8 w-8 items-center justify-center rounded-panel text-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-primary [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"
          >
            <Sun
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              className={cn(
                "absolute transition-all duration-base ease-out",
                isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
              )}
            />
            <Moon
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              className={cn(
                "absolute transition-all duration-base ease-out",
                isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              )}
            />
          </button>

          {/* GitHub */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile — @jpranays"
            className="flex h-8 w-8 items-center justify-center rounded-panel text-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-primary [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"
          >
            <Github size={16} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
});

export default Titlebar;
