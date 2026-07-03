import { useEffect } from "react";

/* Tab-title telemetry, OPERATOR voice (no emoji per A1): when the tab is
   hidden the title reads like an idle session; the original document title
   is restored on return. */
const AWAY_TITLE = "pranay — session idle";

export function useTabTitle() {
  useEffect(() => {
    const homeTitle = document.title;
    const handler = () => {
      document.title = document.hidden ? AWAY_TITLE : homeTitle;
    };
    document.addEventListener("visibilitychange", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      document.title = homeTitle;
    };
  }, []);
}
