/**
 * OPERATOR — Tailwind config (DESIGN-V2 A2).
 * All semantic colors map to the CSS variables declared in
 * src/styles/globals.css, so they switch with .dark and data-accent
 * automatically. Components use ONLY these tokens — no color literals.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    fontFamily: {
      sans: ["Geist", "system-ui"],
      mono: ['"Geist Mono"', "ui-monospace"],
    },
    extend: {
      colors: {
        /* Neutral scale */
        base: "var(--bg-base)",
        "surface-0": "var(--surface-0)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        hairline: "var(--border-hairline)",
        strong: "var(--border-strong)",

        /* Text tiers — text-primary / text-secondary / text-tertiary */
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",

        /* Accent tokens (per-accent × per-theme, resolved in CSS) */
        accent: {
          DEFAULT: "var(--ap-vivid)",
          vivid: "var(--ap-vivid)",
          text: "var(--ap-text)",
          dim: "var(--ap-dim)",
          ring: "var(--ap-ring)",
          on: "var(--ap-on-accent)",
        },

        /* Semantic — fixed, separate from the accent */
        success: "var(--success)",
        danger: "var(--danger)",
      },
      borderRadius: {
        panel: "8px", /* panels, rows, inputs */
        overlay: "10px", /* palette, popovers, modals */
      },
      transitionDuration: {
        fast: "120ms", /* hover bg, chip states */
        base: "180ms", /* buttons, icon morphs */
        panel: "240ms", /* popovers, terminal dock */
      },
      transitionTimingFunction: {
        panel: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};
