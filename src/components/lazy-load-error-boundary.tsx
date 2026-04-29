import { Component, type ErrorInfo, type ReactNode } from "react";
import { LuRefreshCw } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n";
import { cn } from "@/lib/utils";

type LazyLoadErrorBoundaryProps = {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
  onRetry: () => void;
  resetKey: string | number;
};

type LazyLoadErrorBoundaryState = {
  error: unknown;
};

export class LazyLoadErrorBoundary extends Component<
  LazyLoadErrorBoundaryProps,
  LazyLoadErrorBoundaryState
> {
  override state: LazyLoadErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): LazyLoadErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("Lazy component failed to load.", error, errorInfo);
  }

  override componentDidUpdate(previousProps: LazyLoadErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  override render() {
    if (this.state.error) {
      return this.props.fallback(this.props.onRetry);
    }

    return this.props.children;
  }
}

export function LazyLoadFailure({
  className,
  onRetry,
}: {
  className?: string;
  onRetry: () => void;
}) {
  const copy = useMessages((messages) => messages.app.lazyLoadError);

  return (
    <div className={cn("flex max-w-sm flex-col items-center gap-3 text-center", className)}>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-[color:var(--ink)]">{copy.title}</div>
        <div className="text-sm leading-6 text-[color:var(--ink-soft)]">{copy.description}</div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <LuRefreshCw className="size-4" />
        {copy.retry}
      </Button>
    </div>
  );
}
