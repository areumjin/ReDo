import { useState, useEffect } from "react";

/**
 * CSS 미디어쿼리 엔진과 완전히 동일한 breakpoint 훅.
 * window.matchMedia 사용 → zoom, DPI, viewport-fit 모두 정확히 처리.
 */
export function useBreakpoint() {
  const getState = () => {
    if (typeof window === "undefined") {
      return { isMobile: true, isTablet: false, isDesktop: false, width: 375 };
    }
    const w = window.innerWidth;
    return {
      isMobile: !window.matchMedia("(min-width: 768px)").matches,
      isTablet:
        window.matchMedia("(min-width: 768px)").matches &&
        !window.matchMedia("(min-width: 1200px)").matches,
      isDesktop: window.matchMedia("(min-width: 1200px)").matches,
      width: w,
    };
  };

  const [state, setState] = useState(getState);

  useEffect(() => {
    const mqTablet = window.matchMedia("(min-width: 768px)");
    const mqDesktop = window.matchMedia("(min-width: 1200px)");

    const handler = () => setState(getState());

    mqTablet.addEventListener("change", handler);
    mqDesktop.addEventListener("change", handler);

    // 마운트 직후 한 번 더 갱신 (SSR hydration 대비)
    handler();

    return () => {
      mqTablet.removeEventListener("change", handler);
      mqDesktop.removeEventListener("change", handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
