import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  Check,
  Code2,
  Copy,
  FileDown,
  Github,
  GitPullRequest,
  Home,
  Keyboard,
  Linkedin,
  Mail,
  Monitor,
  Moon,
  Music,
  Package,
  Palette,
  Pause,
  Search,
  Sparkles,
  Sun,
  Terminal,
  Twitter,
  User,
} from "lucide-react";
import { useOverlay } from "../../hooks/useOverlay";
import { useAccent } from "../../hooks/useAccent";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { useToast } from "./Toast";
import { Kbd } from "../ui/Kbd";
import { Chip } from "../ui/Chip";
import { cn } from "../../utils/cn";

/**
 * CommandPalette — the protagonist (DESIGN-V2 Part B §EXTRAS (1), A4).
 *
 * Raycast anatomy: input on top, grouped rows (Sections / Actions / Toys /
 * Links), icon + label + right-aligned kbd/meta. Hand-rolled includes-scoring
 * filter (no cmdk), full combobox keyboard nav (arrows / enter / escape),
 * useOverlay for trap + restore + scroll lock + inert siblings.
 *
 * Contract: `CommandPalette({ open, onClose, ...handlers })`
 *   theme, toggleTheme          — theme action label + cycle
 *   musicPlaying, onToggleMusic — Toys ▸ play/pause music
 *   onOpenTerminal              — Toys ▸ open terminal (App owns the state)
 *   onOpenShortcuts             — Actions ▸ keyboard shortcuts
 *
 * Lazy-load friendly default export — App React.lazy()'s this module.
 */

const EMAIL = "pranay1315@gmail.com";
const RESUME_URL = "/Pranay_Jadhav_Resume.pdf";

const SECTION_ITEMS = [
  { id: "sec-hero", section: "hero", label: "Top", icon: Home, path: "~", keywords: "home hero top start" },
  { id: "sec-work", section: "work", label: "Work", icon: Briefcase, path: "~/work", keywords: "experience sears payments checkout pci stripe career" },
  { id: "sec-ships", section: "ships", label: "Ships", icon: Package, path: "~/ships", keywords: "projects npm packages react-fast-hooks cli-gh downloads" },
  { id: "sec-upstream", section: "upstream", label: "Upstream", icon: GitPullRequest, path: "~/upstream", keywords: "open source oss prs merged github contributions" },
  { id: "sec-about", section: "about", label: "About", icon: User, path: "~/about", keywords: "bio story stack receipts pune" },
  { id: "sec-contact", section: "contact", label: "Contact", icon: Mail, path: "~/contact", keywords: "email hire reach call form" },
];

const LINK_ITEMS = [
  { id: "link-github", label: "GitHub", icon: Github, href: "https://github.com/jpranays", meta: "@jpranays ↗", keywords: "code repos profile git" },
  { id: "link-linkedin", label: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/in/jpranays", meta: "in/jpranays ↗", keywords: "profile network cv" },
  { id: "link-x", label: "X", icon: Twitter, href: "https://x.com/jpranays", meta: "@jpranays ↗", keywords: "twitter social" },
  { id: "link-npm", label: "npm", icon: Package, href: "https://www.npmjs.com/~jpranays", meta: "~jpranays ↗", keywords: "packages registry publish" },
  { id: "link-leetcode", label: "LeetCode", icon: Code2, href: "https://leetcode.com/u/jpranays", meta: "u/jpranays ↗", keywords: "problems dsa algorithms" },
  { id: "link-source", label: "View source", icon: Github, href: "https://github.com/jpranays/pranay-portfolio", meta: "↗", keywords: "portfolio repo site code" },
];

const THEME_NEXT = { light: "dark", dark: "system", system: "light" };
const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };

/**
 * Simple includes-scoring (no deps): label prefix > label substring >
 * word-prefix in keywords > loose substring anywhere. 0 = filtered out.
 */
function scoreItem(item, query) {
  if (!query) return 1;
  const label = item.label.toLowerCase();
  const hay = `${label} ${item.keywords ?? ""}`.toLowerCase();
  if (label.startsWith(query)) return 4;
  if (label.includes(query)) return 3;
  if (hay.split(/\s+/).some((word) => word.startsWith(query))) return 2;
  if (hay.includes(query)) return 1;
  return 0;
}

function CommandPaletteImpl({
  open,
  onClose,
  theme = "dark",
  toggleTheme,
  musicPlaying = false,
  onToggleMusic,
  onOpenTerminal,
  onOpenShortcuts,
}) {
  const toast = useToast();
  const reduced = useMotionPreference();
  const { accent, setAccent, ACCENTS } = useAccent();

  const [query, setQuery] = useState("");
  const [view, setView] = useState("root"); // "root" | "accent"
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  /* Escape: in the accent submenu it steps back to root; at root it closes.
     useOverlay routes its Escape handling through this. */
  const handleClose = useCallback(() => {
    if (view === "accent") {
      setView("root");
      setQuery("");
      setActiveIndex(0);
    } else {
      onClose?.();
    }
  }, [view, onClose]);

  const { containerRef, overlayProps } = useOverlay({
    open,
    onClose: handleClose,
    initialFocusRef: inputRef,
  });

  /* Fresh state on every open */
  useEffect(() => {
    if (open) {
      setQuery("");
      setView("root");
      setActiveIndex(0);
    }
  }, [open]);

  /* ⌘K / Ctrl+K toggles the palette shut while it is open (idempotent with
     an App-level toggle — both resolve to closed). */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const behavior = reduced ? "auto" : "smooth";

  const goToSection = useCallback(
    (sectionId) => {
      onClose?.();
      /* Defer past the close commit so the body scroll lock is released */
      requestAnimationFrame(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior, block: "start" });
        else if (sectionId === "hero") window.scrollTo({ top: 0, behavior });
      });
    },
    [onClose, behavior]
  );

  const copyEmail = useCallback(async () => {
    onClose?.();
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast.success("Email copied to clipboard");
    } catch {
      toast.error(`Copy failed — ${EMAIL}`);
    }
  }, [onClose, toast]);

  const downloadResume = useCallback(() => {
    onClose?.();
    window.dispatchEvent(new CustomEvent("portfolio:resume-download"));
    window.open(RESUME_URL, "_blank", "noopener,noreferrer");
  }, [onClose]);

  /* ── Build the grouped command list for the current view ─────────── */
  const ThemeIcon = THEME_ICONS[theme] ?? Sun;

  const rootGroups = [
    {
      key: "sections",
      heading: "Sections",
      items: SECTION_ITEMS.map((s) => ({
        id: s.id,
        label: s.label,
        icon: s.icon,
        keywords: s.keywords,
        meta: s.path,
        run: () => goToSection(s.section),
      })),
    },
    {
      key: "actions",
      heading: "Actions",
      items: [
        {
          id: "act-copy-email",
          label: "Copy email",
          icon: Copy,
          keywords: "mail clipboard address contact pranay1315",
          run: copyEmail,
        },
        {
          id: "act-resume",
          label: "Download resume",
          icon: FileDown,
          keywords: "cv pdf hire download",
          meta: "↗",
          run: downloadResume,
        },
        {
          id: "act-theme",
          label: `Theme → ${THEME_NEXT[theme] ?? "dark"}`,
          icon: ThemeIcon,
          keywords: "toggle theme dark light system mode appearance",
          kbd: "t",
          run: () => {
            toggleTheme?.();
            onClose?.();
          },
        },
        {
          id: "act-accent",
          label: "Change accent",
          icon: Palette,
          keywords: "color signal ion photon ember pulse mono swatch pick",
          meta: "›",
          run: () => {
            setView("accent");
            setQuery("");
            setActiveIndex(0);
          },
        },
        {
          id: "act-shortcuts",
          label: "Keyboard shortcuts",
          icon: Keyboard,
          keywords: "help keys cheat sheet hotkeys",
          kbd: "?",
          run: () => {
            onClose?.();
            onOpenShortcuts?.();
          },
        },
      ],
    },
    {
      key: "toys",
      heading: "Toys",
      items: [
        {
          id: "toy-terminal",
          label: "Open terminal",
          icon: Terminal,
          keywords: "cli shell console commands whoami",
          kbd: "`",
          run: () => {
            onClose?.();
            onOpenTerminal?.();
          },
        },
        {
          id: "toy-music",
          label: musicPlaying ? "Pause music" : "Play music",
          icon: musicPlaying ? Pause : Music,
          keywords: "audio lofi sound ambient eq",
          run: () => {
            onToggleMusic?.();
            onClose?.();
          },
        },
        {
          id: "toy-operator",
          label: "Unlock operator mode",
          icon: Sparkles,
          keywords: "konami easter egg secret scanlines confetti sudo",
          run: () => {
            onClose?.();
            window.dispatchEvent(new CustomEvent("portfolio:operator-unlock"));
          },
        },
      ],
    },
    {
      key: "links",
      heading: "Links",
      items: LINK_ITEMS.map((l) => ({
        id: l.id,
        label: l.label,
        icon: l.icon,
        keywords: l.keywords,
        meta: l.meta,
        run: () => {
          onClose?.();
          window.open(l.href, "_blank", "noopener,noreferrer");
        },
      })),
    },
  ];

  const accentGroups = [
    {
      key: "accent",
      heading: "Accent",
      items: ACCENTS.map((a, i) => ({
        id: `accent-${a.key}`,
        label: a.label,
        keywords: `accent color ${a.key}`,
        swatchVar: a.swatchVar,
        kbd: String(i + 1),
        current: a.key === accent,
        run: () => {
          setAccent(a.key);
          onClose?.();
        },
      })),
    },
  ];

  const q = query.trim().toLowerCase();
  const groups = (view === "accent" ? accentGroups : rootGroups)
    .map((g) => ({
      ...g,
      items: g.items
        .map((item) => ({ item, score: scoreItem(item, q) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item),
    }))
    .filter((g) => g.items.length > 0);

  const flat = groups.flatMap((g) => g.items);
  const clampedIndex = flat.length ? Math.min(activeIndex, flat.length - 1) : -1;
  const activeItem = clampedIndex >= 0 ? flat[clampedIndex] : null;
  const activeId = activeItem ? `cp-opt-${activeItem.id}` : undefined;

  /* Keep the keyboard cursor visible */
  useEffect(() => {
    if (!activeId) return;
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const onInputKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flat.length) setActiveIndex((i) => (Math.min(i, flat.length - 1) + 1) % flat.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length) setActiveIndex((i) => (Math.min(i, flat.length - 1) - 1 + flat.length) % flat.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      activeItem?.run();
      return;
    }
    if (event.key === "Backspace" && query === "" && view === "accent") {
      event.preventDefault();
      setView("root");
      setActiveIndex(0);
      return;
    }
    if (view === "accent" && query === "" && /^[1-6]$/.test(event.key)) {
      const picked = ACCENTS[Number(event.key) - 1];
      if (picked) {
        event.preventDefault();
        setAccent(picked.key);
        onClose?.();
      }
    }
  };

  const dur = reduced ? 0 : 0.16;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="command-palette"
          className="fixed inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur, ease: "easeOut" }}
        >
          {/* Scrim — click to close */}
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            aria-hidden="true"
            onClick={handleClose}
          />

          {/* Panel — 160ms scale 0.98→1 (A6 / §INTERACTIONS) */}
          <div className="pointer-events-none absolute inset-x-0 top-[14vh] flex justify-center px-4">
            <motion.div
              ref={containerRef}
              {...overlayProps}
              aria-label="Command palette"
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.98 }}
              transition={{ duration: dur, ease: [0.32, 0.72, 0, 1] }}
              className="pointer-events-auto w-full max-w-[640px] overflow-hidden rounded-overlay border border-hairline bg-surface-1 shadow-[0_16px_48px_rgb(0_0_0/0.16)] dark:shadow-[0_16px_48px_rgb(0_0_0/0.5)]"
            >
              {/* Input row */}
              <div className="flex h-14 items-center gap-3 border-b border-hairline px-4">
                {view === "accent" ? (
                  <Chip>accent</Chip>
                ) : (
                  <Search className="h-4 w-4 shrink-0 text-tertiary" aria-hidden="true" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="cp-listbox"
                  aria-activedescendant={activeId}
                  aria-autocomplete="list"
                  aria-label={view === "accent" ? "Search accents" : "Search commands"}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onInputKeyDown}
                  placeholder={view === "accent" ? "Switch accent…" : "Type a command or search…"}
                  className="h-full min-w-0 flex-1 bg-transparent text-base text-primary caret-accent outline-none placeholder:text-tertiary"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <Kbd className="hidden sm:inline-flex">esc</Kbd>
              </div>

              {/* Results */}
              <div
                id="cp-listbox"
                role="listbox"
                aria-label={view === "accent" ? "Accents" : "Commands"}
                className="max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain p-2"
              >
                {flat.length === 0 && (
                  <p className="py-10 text-center font-mono text-[13px] text-secondary">
                    no matches for “{query}”
                  </p>
                )}

                {groups.map((g) => (
                  <div key={g.key} role="group" aria-labelledby={`cp-group-${g.key}`}>
                    <div
                      id={`cp-group-${g.key}`}
                      className="px-3 pb-1 pt-3 font-mono text-xs font-medium text-secondary"
                    >
                      {g.heading}
                    </div>
                    {g.items.map((item) => {
                      const isActive = activeItem?.id === item.id;
                      const Icon = item.icon;
                      return (
                        <div
                          id={`cp-opt-${item.id}`}
                          key={item.id}
                          role="option"
                          aria-selected={isActive}
                          onMouseMove={() => setActiveIndex(flat.indexOf(item))}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => item.run()}
                          className={cn(
                            "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-panel px-3 py-2 transition-colors duration-fast",
                            isActive && "bg-accent-dim"
                          )}
                        >
                          {item.swatchVar ? (
                            <span
                              aria-hidden="true"
                              className="flex h-5 w-5 shrink-0 items-center justify-center"
                            >
                              <span
                                className="h-3 w-3 rounded-full border border-strong"
                                style={{ backgroundColor: `var(${item.swatchVar})` }}
                              />
                            </span>
                          ) : Icon ? (
                            <Icon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                          ) : null}

                          <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-primary">
                            {item.label}
                          </span>

                          {item.current && (
                            <span className="flex items-center gap-1 font-mono text-xs text-secondary">
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              current
                            </span>
                          )}
                          {item.kbd != null && <Kbd>{item.kbd}</Kbd>}
                          {item.meta != null && (
                            <span className="font-mono text-xs text-secondary">{item.meta}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-hairline px-4 py-2 font-mono text-xs text-secondary">
                <span className="flex items-center gap-1.5">
                  <Kbd>↑↓</Kbd> navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd>↵</Kbd> {view === "accent" ? "apply" : "run"}
                </span>
                {view === "accent" && (
                  <span className="flex items-center gap-1.5">
                    <Kbd>⌫</Kbd> back
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1.5">
                  <Kbd>esc</Kbd> {view === "accent" ? "back" : "close"}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const CommandPalette = memo(CommandPaletteImpl);

export { CommandPalette };
export default CommandPalette;
