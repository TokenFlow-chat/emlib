import {
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

type LazySectionProps = {
  component: LazyExoticComponent<ComponentType>;
  eager?: boolean;
  fallback: ReactNode;
  rootMargin?: string;
};

export function LazySection({
  component: Component,
  eager = false,
  fallback,
  rootMargin = "320px 0px",
}: LazySectionProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(eager);

  useEffect(() => {
    if (shouldLoad || eager || !hostRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [eager, rootMargin, shouldLoad]);

  return (
    <div ref={hostRef}>
      {shouldLoad ? (
        <Suspense fallback={fallback}>
          <Component />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}
