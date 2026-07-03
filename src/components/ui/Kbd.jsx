import { cn } from "../../utils/cn";

/**
 * Kbd — keyboard chip, 12px mono at AA contrast (DESIGN-V2 A2).
 * Styling lives in the .kbd component class (globals.css).
 */
export function Kbd({ className, children, ...rest }) {
  return (
    <kbd className={cn("kbd", className)} {...rest}>
      {children}
    </kbd>
  );
}

export default Kbd;
