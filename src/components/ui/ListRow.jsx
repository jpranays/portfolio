import { cn } from "../../utils/cn";

/**
 * ListRow — Raycast-anatomy row (DESIGN-V2 A2): icon, label (+ optional
 * one-line sub), right-aligned kbd/meta. min-height 44px (touch target),
 * hover shifts to surface-2 at 120ms — background only, no transform.
 *
 * The whole row is the interactive element when `href` or `onClick` is
 * given (renders <a> / <button>); pass `as` to override.
 *
 * Props:
 *   as     element type override (default: a if href, button if onClick,
 *          else div)
 *   icon   optional leading node (aria-hidden slot)
 *   title  primary label — 15px/500
 *   sub    optional one-line truncated description — 13px secondary
 *   meta   optional right-aligned node (chips, kbd, ↗) — 13px secondary
 */
export function ListRow({
  as,
  href,
  icon,
  title,
  sub,
  meta,
  className,
  children,
  ...rest
}) {
  const Comp = as || (href ? "a" : rest.onClick ? "button" : "div");

  return (
    <Comp
      href={href}
      className={cn(
        "group flex min-h-[44px] w-full items-center gap-3 rounded-panel px-3 py-2 text-left transition-colors duration-fast hover:bg-surface-2",
        Comp === "button" && "appearance-none",
        className
      )}
      {...rest}
    >
      {icon != null && (
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center text-secondary"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        {title != null && (
          <span className="block truncate text-[15px] font-medium leading-snug text-primary">
            {title}
          </span>
        )}
        {sub != null && (
          <span className="block truncate text-[13px] leading-snug text-secondary">
            {sub}
          </span>
        )}
        {children}
      </span>
      {meta != null && (
        <span className="ml-auto flex shrink-0 items-center gap-2 text-[13px] text-secondary">
          {meta}
        </span>
      )}
    </Comp>
  );
}

export default ListRow;
