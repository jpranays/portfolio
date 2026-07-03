import { memo } from "react";
import { Kbd } from "../ui/Kbd";

/**
 * Footer — one hairline-topped band (DESIGN-V2 Part B §SECTIONS footer).
 *
 * Three zones on md+ (stacked on mobile):
 *   left   — '© <year> Pranay Jadhav · Pune, IN' 13px Geist SANS (mono is
 *            reserved for code/paths per the usage contract)
 *   center — the social long-tail as labeled 13px text links, wrapped row,
 *            40px tap targets (the 8-icon row exiled here from the hero)
 *   right  — 'view source ↗' (replaces the deleted self-referential project
 *            card) + mono 12px 'built with …' + pointer-aware shortcuts hint
 *
 * Bottom padding clears the fixed status bar + safe-area. Plus the
 * aria-hidden Konami tease (A7). No sitemap columns, no newsletter,
 * no second nav.
 */

const SOURCE_URL = "https://github.com/jpranays/pranay-portfolio";

/** Social long-tail — labeled text links (order per §SECTIONS footer). */
const SOCIAL_LINKS = [
  { label: "X", href: "https://x.com/jpranays" },
  { label: "Reddit", href: "https://www.reddit.com/user/jpranays/" },
  { label: "Discord", href: "https://discord.com/users/jpranays" },
  { label: "WhatsApp", href: "https://wa.me/918888399676" },
  { label: "Gmail", href: "mailto:pranay1315@gmail.com" },
  { label: "npm", href: "https://www.npmjs.com/~jpranays" },
  { label: "GitHub", href: "https://github.com/jpranays" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/jpranays" },
];

export const Footer = memo(function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer data-chrome="footer" role="contentinfo" className="border-t border-hairline">
      <div
        className="mx-auto max-w-[1120px] px-5 pt-10 sm:px-8"
        /* clears the 36–40px fixed status bar + notch safe-area */
        style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col gap-8 md:grid md:grid-cols-[auto_1fr_auto] md:items-start md:gap-10">
          {/* ── Left ── */}
          <p className="flex min-h-10 items-center text-[13px] text-secondary">
            © {year} Pranay Jadhav · Pune, IN
          </p>

          {/* ── Center: social long-tail ── */}
          <nav aria-label="Social links">
            <ul role="list" className="-mx-2 flex flex-wrap items-center md:justify-center">
              {SOCIAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center px-2 text-[13px] text-secondary transition-colors duration-fast hover:text-primary hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Right ── */}
          <div className="flex flex-col items-start gap-1 md:items-end">
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center text-[13px] text-secondary transition-colors duration-fast hover:text-primary hover:underline"
            >
              view source ↗
            </a>
            <p className="font-mono text-xs text-secondary">
              built with React · Vite · Tailwind
            </p>
            <p className="pt-1 text-[13px] text-tertiary">
              <span className="inline-flex items-center gap-1 [@media(pointer:coarse)]:hidden">
                press <Kbd>?</Kbd> for shortcuts
              </span>
              <span className="hidden [@media(pointer:coarse)]:inline">
                tap ⌘K above to jump anywhere
              </span>
            </p>
          </div>
        </div>

        {/* ── Konami tease — aria-hidden whisper (A7) ── */}
        <p
          aria-hidden="true"
          className="mt-10 select-none text-center font-mono text-xs text-tertiary"
        >
          ↑ ↑ ↓ ↓ … you know the rest
        </p>
      </div>
    </footer>
  );
});

export default Footer;
