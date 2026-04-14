import { useState, useEffect } from "react";

export function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 375
  );

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1200,
    isDesktop: width >= 1200,
    width,
  };
}
