import { cn } from "../../utils/cn";

/**
 * Chip — mono 12px tag (DESIGN-V2 A2).
 *
 * Variants:
 *   neutral (default) — surface-2 fill + hairline border, secondary text
 *   accent            — --ap-dim wash + --ap-text (metric chips, active
 *                       states). Under the mono accent the wash is
 *                       achromatic; chips remain legible without color.
 */
export function Chip({ variant = "neutral", className, children, ...rest }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-xs font-medium leading-5",
        variant === "accent"
          ? "bg-accent-dim text-accent-text"
          : "border border-hairline bg-surface-2 text-secondary",
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Chip;
