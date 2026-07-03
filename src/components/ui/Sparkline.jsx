import { cn } from "../../utils/cn";

/**
 * Sparkline — 1px accent SVG polyline, no dots, no axes, aria-hidden
 * (DESIGN-V2 A2, steal-idea: 7-day sparkline beside live npm numerals).
 * Motion-free liveness: it renders once from data, never animates.
 *
 * Props:
 *   data         array of numbers (needs ≥ 2 points; otherwise renders null)
 *   width/height CSS pixel box (default 96×28)
 *   strokeWidth  default 1 (per spec)
 */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  strokeWidth = 1,
  className,
  ...rest
}) {
  if (!Array.isArray(data) || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const pad = strokeWidth + 1;
  const stepX = (width - pad * 2) / (data.length - 1);
  const norm = (v) => (range === 0 ? 0.5 : (v - min) / range);

  const points = data
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = height - pad - norm(v) * (height - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      {...rest}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--ap-vivid)"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default Sparkline;
