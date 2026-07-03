import { memo, useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { cn } from "../../utils/cn";
import { useMotionPreference } from "../../hooks/useMotionPreference";

const defaultFormat = (v) => Math.round(v).toLocaleString("en-US");

/**
 * Metric — tabular numeral + 13px label + optional mono source-tag
 * (DESIGN-V2 A2, Part B §TYPOGRAPHY).
 *
 * Numeric `value` gets a one-shot 600ms count-up on first reveal
 * (viewport-once, honors useMotionPreference — reduced motion renders the
 * final value immediately). String values ("−80%", "$30K/yr", "10M+")
 * render statically. Numerals stay static after the single count-up.
 *
 * Props:
 *   value          number (count-up) or string (static)
 *   label          13px label under the numeral
 *   sourceTag      optional mono provenance tag, e.g. "npm registry — live"
 *                  or "as of 2026-07" (A1 degradation contract)
 *   format         number formatter for the count-up (default: en-US locale)
 *   valueClassName override numeral styling (default: wins-strip scale,
 *                  Geist 650, tabular, accent text tier)
 */
export const Metric = memo(function Metric({
  value,
  label,
  sourceTag,
  format = defaultFormat,
  className,
  valueClassName,
  labelClassName,
  ...rest
}) {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useMotionPreference();
  const done = useRef(false);
  const formatRef = useRef(format);
  formatRef.current = format;

  const [display, setDisplay] = useState(() =>
    isNumber ? formatRef.current(0) : null
  );

  useEffect(() => {
    if (!isNumber) return undefined;
    /* Reduced motion, or value updated after the one-shot ran: set directly */
    if (reduced || done.current) {
      done.current = true;
      setDisplay(formatRef.current(value));
      return undefined;
    }
    if (!inView) return undefined;

    const controls = animate(0, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(formatRef.current(v)),
      onComplete: () => {
        done.current = true;
      },
    });
    return () => controls.stop();
  }, [isNumber, inView, reduced, value]);

  return (
    <div ref={ref} className={cn("flex flex-col gap-1", className)} {...rest}>
      <span
        className={cn(
          "tnum font-sans text-[clamp(2rem,1rem+2.5vw,2.75rem)] font-[650] leading-none tracking-[-0.01em] text-accent-text",
          valueClassName
        )}
      >
        {isNumber ? display : value}
      </span>
      {label != null && (
        <span className={cn("text-[13px] font-medium text-secondary", labelClassName)}>
          {label}
        </span>
      )}
      {sourceTag != null && (
        <span className="font-mono text-[13px] text-tertiary">{sourceTag}</span>
      )}
    </div>
  );
});

export default Metric;
