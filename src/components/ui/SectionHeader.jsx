import { cn } from "../../utils/cn";

/**
 * SectionHeader — mono eyebrow (~/path) + h2 + optional sub-line
 * (DESIGN-V2 A2, Part B §TYPOGRAPHY / §LAYOUT).
 *
 * h2: 24px/1.25 mobile → 28px lg, weight 600, tracking -0.01em.
 * Header→body gap is the fixed 48px (mb-12).
 *
 * Props:
 *   eyebrow  mono path, e.g. "~/work"
 *   title    the h2 text
 *   sub      optional sub-line (16px secondary, 65ch max)
 */
export function SectionHeader({ eyebrow, title, sub, className, ...rest }) {
  return (
    <header className={cn("mb-12", className)} {...rest}>
      {eyebrow != null && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-2xl font-semibold leading-[1.25] tracking-[-0.01em] text-primary lg:text-[28px]">
        {title}
      </h2>
      {sub != null && (
        <p className="mt-2 max-w-[65ch] text-base leading-relaxed text-secondary">
          {sub}
        </p>
      )}
    </header>
  );
}

export default SectionHeader;
