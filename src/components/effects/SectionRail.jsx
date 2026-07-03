import { memo } from "react";
import { cn } from "../../utils/cn";

/**
 * SectionRail — SectionDots promoted to a labeled minimap (DESIGN-V2 Part B
 * §LAYOUT + §EXTRAS (6)).
 *
 * At xl+ only: a 176px sticky left rail listing sections as mono text rows
 * ('~/', '~/work', …) with a 2px accent bar on the active row. Below xl it
 * disappears entirely — breadcrumb + palette + status bar cover navigation
 * (this frees the 1024–1240px gutter collision).
 *
 * Receives `activeSection` (a section id from useActiveSection in App).
 * Rows are native anchors, so smooth scrolling comes from the CSS
 * `scroll-behavior` (auto under reduced motion via the global kill-switch)
 * and each target's `scroll-margin-top` clears the fixed titlebar.
 *
 * App places this inside the xl grid column next to <main>; the component
 * hides itself below xl and handles its own stickiness.
 */

/** Section ids must match the ids App renders + observes. */
export const SECTIONS = [
  { id: "hero", label: "~/" },
  { id: "work", label: "~/work" },
  { id: "ships", label: "~/ships" },
  { id: "upstream", label: "~/upstream" },
  { id: "about", label: "~/about" },
  { id: "contact", label: "~/contact" },
];

export const SectionRail = memo(function SectionRail({ activeSection }) {
  return (
    <nav
      data-chrome="rail"
      aria-label="Section index"
      className="hidden w-44 shrink-0 xl:block"
    >
      <ul role="list" className="sticky top-20 flex flex-col gap-0.5">
        {SECTIONS.map(({ id, label }) => {
          const active = activeSection === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "relative flex h-8 items-center rounded-panel px-3 font-mono text-[13px] transition-colors duration-fast hover:bg-surface-2 hover:text-primary",
                  active ? "font-medium text-primary" : "text-secondary"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity duration-base",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});

export default SectionRail;
