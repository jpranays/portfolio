import { useState, useEffect } from "react";

const STORAGE_KEY = "pj-theme";

/* DESIGN-V2 §PALETTE DARK: dark is the default. With nothing stored, the
   pre-paint script in index.html resolves dark UNLESS the OS explicitly
   prefers light — "system" here mirrors that exact rule so html class,
   theme-color, and this hook's fallback agree. */
const LIGHT_QUERY = "(prefers-color-scheme: light)";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "system";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "light" || stored === "dark" ? stored : "system";
    } catch {
      return "system";
    }
  });

  const [systemLight, setSystemLight] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(LIGHT_QUERY).matches;
  });

  // Always track OS preference changes
  useEffect(() => {
    const mq = window.matchMedia(LIGHT_QUERY);
    const handler = (e) => setSystemLight(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isDark = theme === "system" ? !systemLight : theme === "dark";

  // Apply class + persist
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      if (theme === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      /* storage unavailable — theme still applies for the session */
    }
  }, [theme, isDark]);

  /* The terminal (`theme light|dark`) and the context menu write html.dark
     + localStorage directly (A4 gives them no handler), so observe the
     class and adopt external changes — App's state never goes stale. */
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const domDark = root.classList.contains("dark");
      setTheme((t) => {
        const light = window.matchMedia(LIGHT_QUERY).matches;
        const stateDark = t === "system" ? !light : t === "dark";
        return stateDark === domDark ? t : domDark ? "dark" : "light";
      });
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // cycle: light → dark → system → light
  const toggle = () =>
    setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "system" : "light"));

  return { theme, toggle, isDark };
}
