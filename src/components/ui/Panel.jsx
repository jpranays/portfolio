import { useRef } from "react";
import { cn } from "../../utils/cn";
import { useCursorGlow } from "../effects/CursorSpotlight";

/**
 * Panel — the card/panel primitive (DESIGN-V2 A2, Part B §LAYOUT).
 *
 * Anatomy: 1px hairline border, radius 8px, surface-1 background, exactly
 * two padding tokens — size="sm" (p-4: rows, stats) / size="lg" (p-6:
 * feature panels). Elevation is border + surface tier only — no shadow.
 *
 * Props:
 *   size        "sm" | "lg" (default "lg")
 *   header      optional mono header row content (e.g. 'status --live')
 *   headerRight optional right-aligned node in the header row (dot, chip)
 *   glow        optional cursor-tracked border glow (pointer:fine only,
 *               disabled under reduced motion) — hero live panel carries
 *               it by default, others opt in
 *   as          element type (default "div")
 */
export function Panel({
  size = "lg",
  header,
  headerRight,
  glow = false,
  as: Comp = "div",
  className,
  children,
  ...rest
}) {
  const hostRef = useRef(null);
  useCursorGlow(hostRef, glow);

  return (
    <Comp
      ref={hostRef}
      className={cn(
        "relative rounded-panel border border-hairline bg-surface-1",
        size === "sm" ? "p-4" : "p-6",
        className
      )}
      {...rest}
    >
      {glow && <span aria-hidden="true" className="panel-glow" />}
      {header != null && (
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-hairline pb-3 font-mono text-[13px] font-medium text-secondary">
          <span className="min-w-0 truncate">{header}</span>
          {headerRight != null && (
            <span className="flex shrink-0 items-center gap-2">{headerRight}</span>
          )}
        </div>
      )}
      {children}
    </Comp>
  );
}

export default Panel;
