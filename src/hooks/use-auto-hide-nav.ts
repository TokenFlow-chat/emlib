import { useEffect, useState } from "react";

type UseAutoHideNavOptions = {
  hideThreshold?: number;
  showThreshold?: number;
  topOffset?: number;
};

const SUPPRESS_AUTO_HIDE_MS = 800;

export function useAutoHideNav({
  hideThreshold = 6,
  showThreshold = 6,
  topOffset = 12,
}: UseAutoHideNavOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let frame = 0;
    let lastScrollY = window.scrollY;
    const suppressAutoHide = { current: false };
    let suppressTimer: ReturnType<typeof setTimeout> | null = null;

    const syncVisibility = () => {
      frame = 0;

      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollY;
      const isNearTop = nextScrollY <= topOffset;

      if (isNearTop || suppressAutoHide.current) {
        setIsVisible(true);
      } else if (delta > hideThreshold) {
        setIsVisible(false);
      } else if (delta < -showThreshold) {
        setIsVisible(true);
      }

      lastScrollY = nextScrollY;
    };

    const scheduleSync = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(syncVisibility);
    };

    const handleHashChange = () => {
      suppressAutoHide.current = true;
      setIsVisible(true);

      if (suppressTimer !== null) {
        window.clearTimeout(suppressTimer);
      }
      suppressTimer = setTimeout(() => {
        suppressAutoHide.current = false;
        suppressTimer = null;
        scheduleSync();
      }, SUPPRESS_AUTO_HIDE_MS);
    };

    scheduleSync();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("hashchange", handleHashChange);
      if (suppressTimer !== null) {
        window.clearTimeout(suppressTimer);
      }
    };
  }, [hideThreshold, showThreshold, topOffset]);

  return { isVisible };
}
