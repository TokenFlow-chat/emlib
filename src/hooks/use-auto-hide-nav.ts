import { useEffect, useState } from "react";

type UseAutoHideNavOptions = {
  hideThreshold?: number;
  showThreshold?: number;
  topOffset?: number;
};

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

    const syncVisibility = () => {
      frame = 0;

      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollY;
      const isNearTop = nextScrollY <= topOffset;

      if (isNearTop) {
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

    scheduleSync();
    window.addEventListener("scroll", scheduleSync, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleSync);
    };
  }, [hideThreshold, showThreshold, topOffset]);

  return { isVisible };
}
