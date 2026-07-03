import {
  Suspense,
  lazy,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useActiveSection } from "./hooks/useActiveSection";
import { useTheme } from "./hooks/useTheme";
import { useMusicPlayer } from "./hooks/useMusicPlayer";
import { useTabTitle } from "./hooks/useTabTitle";
import { ToastProvider, useToast } from "./components/effects/Toast";
import { Titlebar } from "./components/layout/Titlebar";
import { StatusBar } from "./components/layout/StatusBar";
import { Footer } from "./components/layout/Footer";
import { SectionRail, SECTIONS } from "./components/effects/SectionRail";
import { IntroAnimation, OnboardingNudge } from "./components/effects/IntroAnimation";
import { ShortcutsModal } from "./components/effects/ShortcutsModal";
import { ContextMenu } from "./components/effects/ContextMenu";
import { ClickBurst } from "./components/effects/ClickBurst";
import { EasterEgg } from "./components/effects/EasterEgg";
import { getTrackName } from "./components/effects/MusicPlayer";
import Hero from "./components/sections/Hero";
import Work from "./components/sections/Work";
import Ships from "./components/sections/Ships";
import Upstream from "./components/sections/Upstream";
import About from "./components/sections/About";
import Contact from "./components/sections/Contact";

/**
 * App — integration only (DESIGN-V2 A2/A4).
 *
 * Owns all overlay state and passes handlers down; everything else crossing
 * trees rides the A4 CustomEvents. Fixed chrome map (§LAYOUT): titlebar top /
 * rail left (xl) / status bar bottom / toasts bottom-center — four zones,
 * zero overlaps. The old scroll-velocity page tilt and grain overlay are
 * gone: their redesigned replacements live in the status-bar velocity
 * readout and the operator-mode scanlines.
 */

/* Heavy overlays are code-split and load on first invocation (§EXTRAS 1).
   Once loaded they STAY mounted with an `open` prop so their AnimatePresence
   exit animations can play. */
const CommandPalette = lazy(() => import("./components/effects/CommandPalette"));
const TerminalOverlay = lazy(() => import("./components/effects/TerminalOverlay"));

/* Section ids — single source shared with the rail (and the palette's own
   section list targets the same ids). */
const SECTION_IDS = SECTIONS.map((s) => s.id);

function isTypingTarget() {
  const el = document.activeElement;
  return Boolean(
    el &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable)
  );
}

function AppInner() {
  const activeSection = useActiveSection(SECTION_IDS, { threshold: 0.3 });
  const { theme, toggle: toggleTheme } = useTheme();
  const { playing: musicPlaying, toggle: toggleMusic } = useMusicPlayer();
  const toast = useToast();

  useTabTitle();

  /* ── Overlay state (App owns it — A4). The *Mounted flags implement
        "lazy-load on first open, stay mounted afterwards". ── */
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMounted, setPaletteMounted] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMounted, setTerminalMounted] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const openPalette = useCallback(() => {
    setPaletteMounted(true);
    setPaletteOpen(true);
  }, []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openTerminal = useCallback(() => {
    setTerminalMounted(true);
    setTerminalOpen(true);
  }, []);
  const closeTerminal = useCallback(() => setTerminalOpen(false), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  /* Refs so the single global keydown listener never re-registers */
  const terminalOpenRef = useRef(false);
  useEffect(() => {
    terminalOpenRef.current = terminalOpen;
  }, [terminalOpen]);
  const toggleThemeRef = useRef(toggleTheme);
  useEffect(() => {
    toggleThemeRef.current = toggleTheme;
  });
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  });

  /* ── Global keyboard shortcuts (⌘K · ` · ? · t) ── */
  useEffect(() => {
    const onKeyDown = (event) => {
      /* ⌘K / Ctrl+K — TOGGLE the palette. While it is open, the palette's
         own capture listener has already preventDefault()ed and closed it,
         so a defaultPrevented event means "handled — stand down". */
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (event.defaultPrevented) return;
        event.preventDefault();
        setPaletteMounted(true);
        setPaletteOpen((v) => !v);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      /* ` — toggle terminal. Closing wins even while the terminal's own
         input has focus (no command needs a literal backtick); opening is
         guarded against typing surfaces (contact form, palette input). */
      if (event.key === "`") {
        if (terminalOpenRef.current) {
          event.preventDefault();
          setTerminalOpen(false);
          return;
        }
        if (event.defaultPrevented || isTypingTarget()) return;
        event.preventDefault();
        setTerminalMounted(true);
        setTerminalOpen(true);
        return;
      }

      /* ? — shortcuts sheet. The open sheet closes itself in the capture
         phase (with stopPropagation), so this only ever fires to open. */
      if (event.key === "?") {
        if (event.defaultPrevented || isTypingTarget()) return;
        event.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }

      /* t — theme toggle (documented in the shortcuts sheet) */
      if (event.key === "t" && !event.defaultPrevented && !isTypingTarget()) {
        toggleThemeRef.current?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ── A4 CustomEvents — any tree can request an overlay / confirm the
        resume download. (set-accent → useAccent; operator-unlock →
        EasterEgg; the old portfolio:confetti listener is obsolete.) ── */
  useEffect(() => {
    const onOpenPalette = () => {
      setPaletteMounted(true);
      setPaletteOpen(true);
    };
    const onOpenTerminal = () => {
      setTerminalMounted(true);
      setTerminalOpen(true);
    };
    const onOpenShortcuts = () => setShortcutsOpen(true);
    const onResume = () => toastRef.current.success("resume.pdf — download started");

    window.addEventListener("portfolio:open-palette", onOpenPalette);
    window.addEventListener("portfolio:open-terminal", onOpenTerminal);
    window.addEventListener("portfolio:open-shortcuts", onOpenShortcuts);
    window.addEventListener("portfolio:resume-download", onResume);
    return () => {
      window.removeEventListener("portfolio:open-palette", onOpenPalette);
      window.removeEventListener("portfolio:open-terminal", onOpenTerminal);
      window.removeEventListener("portfolio:open-shortcuts", onOpenShortcuts);
      window.removeEventListener("portfolio:resume-download", onResume);
    };
  }, []);

  /* ── Now-playing telemetry (A7): the terminal `whoami` reads
        window.__pjNowPlaying / html[data-music]. useMusicPlayer owns the
        (non-DOM) Audio element, so App surfaces the state here. ── */
  useEffect(() => {
    const track = getTrackName();
    window.__pjNowPlaying = { playing: musicPlaying, track };
    const root = document.documentElement;
    if (musicPlaying) {
      root.dataset.music = "on";
      root.dataset.track = track;
    } else {
      delete root.dataset.music;
      delete root.dataset.track;
    }
  }, [musicPlaying]);

  return (
    <>
      <IntroAnimation />

      <Titlebar
        onOpenPalette={openPalette}
        theme={theme}
        toggleTheme={toggleTheme}
        activeSection={activeSection}
      />

      {/* xl+: the 176px labeled section rail sits in a grid column beside
          the content column (§LAYOUT); below xl it hides itself and the
          breadcrumb + palette + status bar cover navigation. */}
      <div className="mx-auto flex w-full max-w-[1440px] xl:px-4">
        <SectionRail activeSection={activeSection} />
        <div className="min-w-0 flex-1">
          <main id="main-content">
            <Hero onOpenPalette={openPalette} />
            <Work />
            <Ships />
            <Upstream />
            <About />
            <Contact />
          </main>
          {/* Footer's own bottom padding clears the fixed status bar */}
          <Footer />
        </div>
      </div>

      <StatusBar
        onOpenTerminal={openTerminal}
        onOpenShortcuts={openShortcuts}
        musicPlaying={musicPlaying}
        onToggleMusic={toggleMusic}
      />

      {/* ── ambient layer ── */}
      <ContextMenu />
      <ClickBurst />
      <EasterEgg />
      <OnboardingNudge />

      {/* ── overlays — lazy on first open, then kept mounted for exits ── */}
      {paletteMounted && (
        <Suspense fallback={null}>
          <CommandPalette
            open={paletteOpen}
            onClose={closePalette}
            theme={theme}
            toggleTheme={toggleTheme}
            musicPlaying={musicPlaying}
            onToggleMusic={toggleMusic}
            onOpenTerminal={openTerminal}
            onOpenShortcuts={openShortcuts}
          />
        </Suspense>
      )}
      {terminalMounted && (
        <Suspense fallback={null}>
          <TerminalOverlay open={terminalOpen} onClose={closeTerminal} />
        </Suspense>
      )}
      <ShortcutsModal open={shortcutsOpen} onClose={closeShortcuts} />
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

export default memo(App);
