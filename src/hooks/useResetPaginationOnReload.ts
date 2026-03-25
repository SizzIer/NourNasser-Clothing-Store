import { useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";

function isDocumentReload(): boolean {
  const entry = performance.getEntriesByType(
    "navigation"
  )[0] as PerformanceNavigationTiming | undefined;
  return entry?.type === "reload";
}

/** Full page refresh (F5): drop `page` so listing starts at page 1; keeps other query params. */
export function useResetPaginationOnReload() {
  const navigate = useNavigate();
  useLayoutEffect(() => {
    if (!isDocumentReload()) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("page")) return;
    params.delete("page");
    const qs = params.toString();
    const path = window.location.pathname;
    navigate(qs ? `${path}?${qs}` : path, { replace: true });
  }, [navigate]);
}
