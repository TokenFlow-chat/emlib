import {
  type ComponentType,
  type ReactNode,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LazyLoadErrorBoundary, LazyLoadFailure } from "@/components/lazy-load-error-boundary";

export type LazyComponentLoader = () => Promise<{ default: ComponentType }>;

function createLazyComponent(load: LazyComponentLoader, retryToken: number) {
  void retryToken;
  return lazy(load);
}

type LazySectionProps = {
  load: LazyComponentLoader;
  eager?: boolean;
  errorFallback?: (retry: () => void) => ReactNode;
  fallback: ReactNode;
  rootMargin?: string;
};

export function LazySection({
  load,
  eager = false,
  errorFallback,
  fallback,
  rootMargin = "600px 0px",
}: LazySectionProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const Component = useMemo(() => createLazyComponent(load, loadAttempt), [load, loadAttempt]);
  const retry = useCallback(() => {
    setShouldLoad(true);
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

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
        <LazyLoadErrorBoundary
          resetKey={loadAttempt}
          onRetry={retry}
          fallback={errorFallback ?? ((retryLoad) => <LazyLoadFailure onRetry={retryLoad} />)}
        >
          <Suspense fallback={fallback}>
            <Component />
          </Suspense>
        </LazyLoadErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
