import { useEffect, useRef } from "react";

/**
 * useOverlay — the ONE overlay primitive (DESIGN-V2 A4, Risk #9).
 *
 * Every overlay (CommandPalette, TerminalOverlay, ShortcutsModal,
 * AccentPopover, ContextMenu) uses this so a11y is provably uniform:
 *   - focus trap (Tab / Shift+Tab cycle inside the container)
 *   - initial focus (initialFocusRef → first focusable → container)
 *   - focus restore to the previously focused element on close
 *   - Escape → onClose
 *   - body scroll lock while open
 *   - marks <body> children that don't contain the overlay inert
 *     (where supported) — i.e. #root's siblings, or #root itself when
 *     the overlay is portaled to <body>
 *
 * @param {object}   opts
 * @param {boolean}  opts.open            whether the overlay is open
 * @param {Function} opts.onClose         called on Escape
 * @param {object}  [opts.initialFocusRef] ref to the element that should
 *                                         receive focus when the overlay opens
 * @returns {{ containerRef: object, overlayProps: object }}
 *   Attach containerRef + spread overlayProps onto the overlay container.
 */
export function useOverlay({ open, onClose, initialFocusRef } = {}) {
  const containerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement;

    /* Body scroll lock */
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* Inert everything at body level that doesn't contain the overlay */
    const inerted = [];
    if ("inert" in HTMLElement.prototype) {
      Array.from(document.body.children).forEach((el) => {
        if (el === container || el.contains(container)) return;
        if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.inert) return;
        el.inert = true;
        inerted.push(el);
      });
    }

    /* Initial focus — next frame so the overlay's content has mounted */
    const raf = requestAnimationFrame(() => {
      const target =
        (initialFocusRef && initialFocusRef.current) ||
        getFocusable(container)[0] ||
        container;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = container.contains(active);

      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      inerted.forEach((el) => {
        el.inert = false;
      });
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, initialFocusRef]);

  return {
    containerRef,
    overlayProps: { role: "dialog", "aria-modal": true, tabIndex: -1 },
  };
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0 && !el.closest("[inert]")
  );
}

export default useOverlay;
