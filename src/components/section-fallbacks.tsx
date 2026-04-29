import { Card, CardContent } from "@/components/ui/card";
import { LazyLoadFailure } from "@/components/lazy-load-error-boundary";
import { LoadingMark } from "@/components/ui/loading-mark";

type LoadErrorProps = {
  onRetry: () => void;
};

export function HeroPanelFallback() {
  return (
    <Card className="hero-panel overflow-hidden border-[color:var(--line-strong)]">
      <CardContent className="flex min-h-[34rem] items-center justify-center px-5 py-6 sm:px-6 sm:py-7 xl:px-8 xl:py-8">
        <LoadingMark />
      </CardContent>
    </Card>
  );
}

export function HeroPanelLoadError({ onRetry }: LoadErrorProps) {
  return (
    <Card className="hero-panel overflow-hidden border-[color:var(--line-strong)]">
      <CardContent className="flex min-h-[34rem] items-center justify-center px-5 py-6 sm:px-6 sm:py-7 xl:px-8 xl:py-8">
        <LazyLoadFailure onRetry={onRetry} />
      </CardContent>
    </Card>
  );
}

export function HighlightsGridFallback() {
  return (
    <section className="grid min-h-52 place-items-center rounded-[1rem] border border-[color:var(--line)] bg-white/50">
      <LoadingMark />
    </section>
  );
}

export function HighlightsGridLoadError({ onRetry }: LoadErrorProps) {
  return (
    <section className="grid min-h-52 place-items-center rounded-[1rem] border border-[color:var(--line)] bg-white/50 px-4">
      <LazyLoadFailure onRetry={onRetry} />
    </section>
  );
}

export function SummaryPanelsFallback() {
  return (
    <section className="grid min-h-[31rem] place-items-center rounded-[1rem] border border-[color:var(--line)] bg-white/50">
      <LoadingMark />
    </section>
  );
}

export function SummaryPanelsLoadError({ onRetry }: LoadErrorProps) {
  return (
    <section className="grid min-h-[31rem] place-items-center rounded-[1rem] border border-[color:var(--line)] bg-white/50 px-4">
      <LazyLoadFailure onRetry={onRetry} />
    </section>
  );
}

export function PlaygroundStudioFallback() {
  return (
    <Card className="paper-card border-[color:var(--line-strong)] py-5 sm:py-6">
      <CardContent className="flex min-h-[45rem] items-center justify-center px-5 sm:px-6">
        <LoadingMark />
      </CardContent>
    </Card>
  );
}

export function PlaygroundStudioLoadError({ onRetry }: LoadErrorProps) {
  return (
    <Card className="paper-card border-[color:var(--line-strong)] py-5 sm:py-6">
      <CardContent className="flex min-h-[45rem] items-center justify-center px-5 sm:px-6">
        <LazyLoadFailure onRetry={onRetry} />
      </CardContent>
    </Card>
  );
}
