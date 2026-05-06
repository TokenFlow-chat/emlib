import { useEffect, useMemo, useState } from "react";

const HASH_SETTLE_DELAY_MS = 180;
const HASH_RETRY_INTERVAL_MS = 120;
const HASH_TIMEOUT_MS = 2400;
const HASH_TOLERANCE_PX = 2;

export function getTrackedHashId<T extends string>(sectionIds: readonly T[]): T | "" {
  if (typeof window === "undefined") return "";

  const hashId = decodeURIComponent(window.location.hash.slice(1));
  return sectionIds.find((id) => id === hashId) ?? "";
}

export function useInitialHashScroll(sectionIds: readonly string[]) {
  const normalizedIds = useMemo(() => sectionIds.filter((id) => id.length > 0), [sectionIds]);
  const idsKey = normalizedIds.join("|");
  const [isRestoring, setIsRestoring] = useState(() => {
    const hashId = getTrackedHashId(normalizedIds);
    return hashId.length > 0 && hashId !== "overview";
  });

  useEffect(() => {
    if (typeof window === "undefined" || normalizedIds.length === 0) {
      setIsRestoring(false);
      return;
    }

    const hashId = getTrackedHashId(normalizedIds);
    if (!hashId || hashId === "overview") {
      setIsRestoring(false);
      return;
    }

    setIsRestoring(true);

    let frame = 0;
    let stopped = false;
    let lastChangeAt = performance.now();

    const finish = () => {
      if (stopped) return;
      stopped = true;
      window.cancelAnimationFrame(frame);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("load", markDirty);
      window.removeEventListener("resize", markDirty);
      setIsRestoring(false);
    };

    const schedule = () => {
      if (stopped || frame !== 0) return;
      frame = window.requestAnimationFrame(run);
    };

    const markDirty = () => {
      lastChangeAt = performance.now();
      schedule();
    };

    const run = () => {
      frame = 0;

      if (getTrackedHashId(normalizedIds) !== hashId) {
        finish();
        return;
      }

      const target = document.getElementById(hashId);
      if (!target) return;

      target.scrollIntoView({ block: "start", inline: "nearest", behavior: "smooth" });

      const scrollMarginTop =
        Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      const targetTop = target.getBoundingClientRect().top;
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = window.scrollY >= maxScrollY - HASH_TOLERANCE_PX;
      const aligned =
        Math.abs(targetTop - scrollMarginTop) <= HASH_TOLERANCE_PX ||
        (atBottom && targetTop <= scrollMarginTop + HASH_TOLERANCE_PX);

      if (aligned && performance.now() - lastChangeAt >= HASH_SETTLE_DELAY_MS) {
        finish();
      }
    };

    const mutationObserver = new MutationObserver(markDirty);
    mutationObserver.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            markDirty();
          });

    resizeObserver?.observe(document.documentElement);

    window.addEventListener("load", markDirty);
    window.addEventListener("resize", markDirty);

    const intervalId = window.setInterval(schedule, HASH_RETRY_INTERVAL_MS);
    const timeoutId = window.setTimeout(finish, HASH_TIMEOUT_MS);

    markDirty();

    return finish;
  }, [idsKey, normalizedIds]);

  return { isRestoring };
}
