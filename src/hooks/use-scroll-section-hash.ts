import { useEffect, useMemo, useState } from "react";

type ScrollSectionHashOptions = {
  anchorOffsetRatio?: number;
  replaceHistory?: boolean;
};

export function useScrollSectionHash(
  sectionIds: readonly string[],
  { anchorOffsetRatio = 0.28, replaceHistory = true }: ScrollSectionHashOptions = {},
) {
  const normalizedIds = useMemo(() => sectionIds.filter((id) => id.length > 0), [sectionIds]);
  const idsKey = normalizedIds.join("|");
  const [activeId, setActiveId] = useState(normalizedIds[0] ?? "");

  useEffect(() => {
    if (typeof window === "undefined" || normalizedIds.length === 0) return;

    let frame = 0;

    const syncActiveSection = () => {
      const anchorLine = window.innerHeight * anchorOffsetRatio;
      const sections = normalizedIds
        .map((id) => {
          const element = document.getElementById(id);
          return element ? { id, rect: element.getBoundingClientRect() } : null;
        })
        .filter((section): section is { id: string; rect: DOMRect } => section !== null);

      if (sections.length === 0) return;

      let nextId = sections[0]!.id;

      for (const section of sections) {
        if (section.rect.top <= anchorLine) {
          nextId = section.id;
        }

        if (section.rect.top <= anchorLine && section.rect.bottom > anchorLine) {
          nextId = section.id;
          break;
        }
      }

      setActiveId((previous) => (previous === nextId ? previous : nextId));

      const nextHash = `#${nextId}`;
      if (window.location.hash === nextHash) return;

      const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
      if (replaceHistory) {
        window.history.replaceState(window.history.state, "", nextUrl);
      } else {
        window.history.pushState(window.history.state, "", nextUrl);
      }
    };

    const scheduleSync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncActiveSection);
    };

    const handleHashChange = () => {
      const hashId = window.location.hash.slice(1);
      if (!normalizedIds.includes(hashId)) return;
      setActiveId(hashId);
      scheduleSync();
    };

    handleHashChange();
    scheduleSync();

    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [anchorOffsetRatio, idsKey, normalizedIds, replaceHistory]);

  return { activeId };
}
