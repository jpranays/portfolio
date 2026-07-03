import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, X, Sparkles } from "lucide-react";
import { useMotionPreference } from "../../hooks/useMotionPreference";

/**
 * Toast — restyled for OPERATOR (DESIGN-V2 §EXTRAS 9, §LAYOUT).
 * API unchanged: ToastProvider wraps the app, useToast() returns
 * { success, error, info, easter }.
 *
 * Placement: bottom-center, 12px above the status bar (~52px offset,
 * + safe-area) — the documented toast zone; no fixed control is occluded.
 * Styling: panel anatomy — surface-1, hairline border, radius 8px, no
 * glow, no blur. Container is a polite aria-live region; 4s auto-dismiss.
 */

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  easter: Sparkles,
};

/* Icon tint only — message text is always text-primary (AA on surface-1).
   success/danger are the fixed semantic tokens; easter rides the accent. */
const ICON_TINT = {
  success: "text-success",
  error: "text-danger",
  info: "text-secondary",
  easter: "text-accent-text",
};

const DEFAULT_DURATION = 4000;

let _nextId = 0;

function ToastItem({ toast, onDismiss, reduced }) {
  const Icon = ICONS[toast.type] ?? Info;
  const tint = ICON_TINT[toast.type] ?? ICON_TINT.info;

  return (
    <motion.div
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
      className="flex min-h-[44px] w-max max-w-[calc(100vw-2rem)] items-center gap-2.5
                 rounded-panel border border-hairline bg-surface-1 py-2 pl-3.5 pr-1.5"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${tint}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-primary">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel
                   text-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-primary"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  const reduced = useMotionPreference();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 z-[9994] flex flex-col items-center gap-2 px-4"
      /* 40px status bar + 12px gap, plus the home-indicator inset on touch */
      style={{ bottom: "calc(52px + env(safe-area-inset-bottom, 0px))" }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={onDismiss} reduced={reduced} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (message, type = "success", duration = DEFAULT_DURATION) => {
      const id = ++_nextId;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={add}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const add = useContext(ToastContext);
  return {
    success: (msg, dur) => add(msg, "success", dur),
    error: (msg, dur) => add(msg, "error", dur),
    info: (msg, dur) => add(msg, "info", dur),
    easter: (msg, dur) => add(msg, "easter", dur),
  };
}
