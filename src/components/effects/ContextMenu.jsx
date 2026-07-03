import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  Copy,
  Github,
  Link2,
  Moon,
  Palette,
  Sun,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useOverlay } from "../../hooks/useOverlay";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { useAccent } from "../../hooks/useAccent";
import { useToast } from "./Toast";

/**
 * ContextMenu — scoped right-click hijack (DESIGN-V2 Part B §EXTRAS (13)).
 *
 * The custom menu appears ONLY on backdrop / section-background surfaces.
 * The native menu is preserved on links, form fields, media, other
 * interactive elements, selected text, and inside any open overlay.
 *
 * Styled like the palette (same system): surface-1 panel, hairline border,
 * overlay radius, overlay-only shadow. Full menu keyboard pattern: focus
 * moves to the first item on open, ArrowUp/Down cycle, Home/End jump,
 * ArrowRight/Left open/close the accent submenu, Escape closes and focus
 * restores (useOverlay). All listeners are cleaned up on unmount.
 *
 * Actions: copy email, copy URL, view source, theme, accent submenu.
 */

const EMAIL = "pranay1315@gmail.com";
const SOURCE_URL = "https://github.com/jpranays/pranay-portfolio";
const MENU_WIDTH = 232;
const MENU_EST_HEIGHT = 248;
const EDGE = 8;

/** Native menu stays on anything interactive / media / selected text. */
const NATIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "[contenteditable='']",
  "[contenteditable='true']",
  "audio",
  "video",
  "img",
  "svg",
  "iframe",
  "kbd",
  "[data-native-menu]",
].join(",");

function isNativeTerritory(target) {
  if (!(target instanceof Element)) return true;
  if (target.closest(NATIVE_SELECTOR)) return true;
  /* Inside another overlay (palette, terminal, popover…) → native menu */
  if (target.closest("[role='dialog'],[role='menu'],[role='listbox']")) return true;
  const selection = window.getSelection?.();
  if (selection && !selection.isCollapsed && selection.toString().trim()) return true;
  return false;
}

function applyTheme(mode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem("pj-theme", mode);
  } catch {
    /* storage unavailable — theme still applies for the session */
  }
}

/* ── row primitives (palette anatomy: icon · label · right meta) ─────── */

const MenuItem = forwardRef(function MenuItem(
  { icon: Icon, label, meta, className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={cn(
        "flex min-h-[40px] w-full items-center gap-3 px-3 text-left text-[14px] font-medium text-primary transition-colors duration-fast hover:bg-surface-2 focus:bg-surface-2",
        className
      )}
      {...rest}
    >
      {Icon && (
        <Icon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta}
    </button>
  );
});

function Separator() {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className="mx-3 my-1 h-px bg-hairline"
    />
  );
}

/* ── component ───────────────────────────────────────────────────────── */

function ContextMenuImpl() {
  const toast = useToast();
  const reduced = useMotionPreference();
  const { accent, setAccent, ACCENTS } = useAccent();

  const [state, setState] = useState({ open: false, x: 0, y: 0 });
  const [accentOpen, setAccentOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const accentTriggerRef = useRef(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const close = useCallback(() => {
    setState((s) => (s.open ? { ...s, open: false } : s));
    setAccentOpen(false);
  }, []);

  const { containerRef, overlayProps } = useOverlay({
    open: state.open,
    onClose: close,
  });

  /* Scoped hijack — one window listener, cleaned up on unmount. */
  useEffect(() => {
    const onContextMenu = (event) => {
      /* Right-click on the menu itself: keep it, suppress the native menu. */
      if (containerRef.current?.contains(event.target)) {
        event.preventDefault();
        return;
      }
      if (isNativeTerritory(event.target)) {
        if (stateRef.current.open) close();
        return; /* native menu proceeds */
      }
      event.preventDefault();
      const x = Math.max(
        EDGE,
        Math.min(event.clientX, window.innerWidth - MENU_WIDTH - EDGE)
      );
      const y = Math.max(
        EDGE,
        Math.min(event.clientY, window.innerHeight - MENU_EST_HEIGHT - EDGE)
      );
      setAccentOpen(false);
      setIsDark(document.documentElement.classList.contains("dark"));
      setState({ open: true, x, y });
    };

    window.addEventListener("contextmenu", onContextMenu);
    return () => window.removeEventListener("contextmenu", onContextMenu);
  }, [close, containerRef]);

  /* Outside pointer / resize close — active only while open. */
  useEffect(() => {
    if (!state.open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) close();
    };
    const onResize = () => close();
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("resize", onResize);
    };
  }, [state.open, close, containerRef]);

  /* Re-clamp to the viewport once real dimensions are known (and when the
     accent submenu expands). */
  useLayoutEffect(() => {
    if (!state.open) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let { x, y } = state;
    if (rect.right > window.innerWidth - EDGE) {
      x = Math.max(EDGE, window.innerWidth - rect.width - EDGE);
    }
    if (rect.bottom > window.innerHeight - EDGE) {
      y = Math.max(EDGE, window.innerHeight - rect.height - EDGE);
    }
    if (x !== state.x || y !== state.y) setState((s) => ({ ...s, x, y }));
  }, [state, accentOpen, containerRef]);

  /* Full menu keyboard pattern (Escape + focus restore live in useOverlay). */
  const handleMenuKeyDown = useCallback(
    (event) => {
      const container = containerRef.current;
      if (!container) return;
      const items = Array.from(
        container.querySelectorAll("[role='menuitem'],[role='menuitemradio']")
      ).filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement);

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          items[(index + 1) % items.length].focus();
          break;
        case "ArrowUp":
          event.preventDefault();
          items[(index - 1 + items.length) % items.length].focus();
          break;
        case "Home":
          event.preventDefault();
          items[0].focus();
          break;
        case "End":
          event.preventDefault();
          items[items.length - 1].focus();
          break;
        case "ArrowRight":
          if (document.activeElement === accentTriggerRef.current) {
            event.preventDefault();
            setAccentOpen(true);
            requestAnimationFrame(() => {
              container
                .querySelector("[role='menuitemradio']")
                ?.focus();
            });
          }
          break;
        case "ArrowLeft":
          if (accentOpen) {
            event.preventDefault();
            setAccentOpen(false);
            accentTriggerRef.current?.focus();
          }
          break;
        default:
          break;
      }
    },
    [accentOpen, containerRef]
  );

  /* ── actions ───────────────────────────────────────────────────────── */

  const copyToClipboard = useCallback(
    (text, message) => {
      close();
      navigator.clipboard
        ?.writeText(text)
        .then(() => toast.success(message))
        .catch(() => toast.error("Copy failed"));
    },
    [close, toast]
  );

  const viewSource = useCallback(() => {
    close();
    window.open(SOURCE_URL, "_blank", "noopener,noreferrer");
  }, [close]);

  const toggleTheme = useCallback(() => {
    applyTheme(isDark ? "light" : "dark");
    close();
  }, [isDark, close]);

  const pickAccent = useCallback(
    (key) => {
      setAccent(key);
      close();
    },
    [setAccent, close]
  );

  const currentSwatchVar =
    ACCENTS.find((a) => a.key === accent)?.swatchVar ?? "--swatch-signal";

  return (
    <AnimatePresence>
      {state.open && (
        <motion.div
          ref={containerRef}
          {...overlayProps}
          role="menu"
          aria-modal={undefined}
          aria-label="Page actions"
          initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
          transition={{ duration: reduced ? 0 : 0.16, ease: [0.32, 0.72, 0, 1] }}
          onKeyDown={handleMenuKeyDown}
          className="fixed z-[80] w-[232px] rounded-overlay border border-hairline bg-surface-1 py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
          style={{ left: state.x, top: state.y, transformOrigin: "top left" }}
        >
          <MenuItem
            icon={Copy}
            label="Copy email"
            onClick={() => copyToClipboard(EMAIL, "Email copied to clipboard")}
          />
          <MenuItem
            icon={Link2}
            label="Copy URL"
            onClick={() =>
              copyToClipboard(window.location.href, "URL copied to clipboard")
            }
          />

          <Separator />

          <MenuItem icon={Github} label="View source ↗" onClick={viewSource} />

          <Separator />

          <MenuItem
            icon={isDark ? Sun : Moon}
            label={`Switch to ${isDark ? "light" : "dark"} theme`}
            onClick={toggleTheme}
          />

          {/* Accent submenu — inline expansion, radio-group semantics */}
          <MenuItem
            ref={accentTriggerRef}
            icon={Palette}
            label="Accent"
            aria-haspopup="true"
            aria-expanded={accentOpen}
            onClick={() => setAccentOpen((v) => !v)}
            meta={
              <span className="flex shrink-0 items-center gap-2" aria-hidden="true">
                <span
                  className="h-3 w-3 rounded-full border border-hairline"
                  style={{ backgroundColor: `var(${currentSwatchVar})` }}
                />
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-tertiary transition-transform duration-fast",
                    accentOpen && "rotate-90"
                  )}
                />
              </span>
            }
          />
          {accentOpen && (
            <div role="group" aria-label="Accent">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={accent === a.key}
                  tabIndex={-1}
                  onClick={() => pickAccent(a.key)}
                  className="flex min-h-[40px] w-full items-center gap-3 py-1 pl-10 pr-3 text-left text-[14px] font-medium text-primary transition-colors duration-fast hover:bg-surface-2 focus:bg-surface-2"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full border border-hairline"
                    style={{ backgroundColor: `var(${a.swatchVar})` }}
                  />
                  <span className="min-w-0 flex-1 truncate">{a.label}</span>
                  {accent === a.key && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-accent-text"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const ContextMenu = memo(ContextMenuImpl);

export default ContextMenu;
