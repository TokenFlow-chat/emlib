import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { LazyLoadFailure } from "@/components/lazy-load-error-boundary";
import { LoadingMark } from "@/components/ui/loading-mark";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.8rem] border border-[color:var(--line)] bg-white/78 px-2.5 py-1.5">
      <div className="text-[10px] font-semibold tracking-[0.16em] text-[color:var(--ink-soft)] uppercase">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-semibold text-[color:var(--ink)]">{value}</div>
    </div>
  );
}

export function MetricCard({
  title,
  tokenCount,
  typeCount,
  tokenNodeLabel,
  operatorTypeLabel,
  formatNumber,
}: {
  title: string;
  tokenCount: number;
  typeCount: number;
  tokenNodeLabel: string;
  operatorTypeLabel: string;
  formatNumber: (value: number) => string;
}) {
  return (
    <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-3">
      <div className="stat-label">{title}</div>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <div>
          <div className="text-2xl font-semibold text-[color:var(--ink)] sm:text-[1.65rem]">
            {formatNumber(tokenCount)}
          </div>
          <div className="text-xs text-[color:var(--ink-soft)]">{tokenNodeLabel}</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-[color:var(--ink)] sm:text-[1.65rem]">
            {formatNumber(typeCount)}
          </div>
          <div className="text-xs text-[color:var(--ink-soft)]">{operatorTypeLabel}</div>
        </div>
      </div>
    </div>
  );
}

export function AsyncMessage({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "warning" | "success";
  children: ReactNode;
}) {
  const className =
    tone === "warning"
      ? "border-[color:var(--warning-line)] bg-[color:var(--warning-bg)] text-[color:var(--warning-ink)]"
      : tone === "success"
        ? "border-[color:var(--line)] bg-[color:var(--accent-soft)]/28 text-[color:var(--ink)]"
        : "border-[color:var(--line)] bg-[color:var(--paper-strong)] text-[color:var(--ink-soft)]";

  return (
    <div className={`rounded-[0.85rem] border px-3 py-2.5 text-sm leading-6 ${className}`}>
      {children}
    </div>
  );
}

export function ExperimentShell({
  title,
  eyebrow,
  icon,
  tools,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: ReactNode;
  tools?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1rem] border border-[color:var(--line)] bg-white/80 p-3.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[0.85rem] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
              {eyebrow}
            </div>
            <div className="mt-1 text-base font-semibold text-[color:var(--ink)]">{title}</div>
          </div>
        </div>
        {tools}
      </div>
      <div className="mt-3.5 space-y-3.5">{children}</div>
    </section>
  );
}

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: readonly {
    value: T;
    label: string;
    shortLabel?: string;
  }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const { messages } = useI18n();

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-10 w-full items-center rounded-[0.95rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper-strong)] px-3 py-2 text-sm text-[color:var(--ink-soft)]",
          className,
        )}
      >
        {messages.app.emptyStates.tabs}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex w-full max-w-full gap-1 rounded-[0.95rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-1",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Button
            key={item.value}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "min-w-0 flex-1 rounded-[0.75rem] px-2.5 text-[12px] text-[color:var(--ink-soft)]",
              active && "bg-white text-[color:var(--ink)] shadow-sm",
            )}
            onClick={() => onChange(item.value)}
          >
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

export function PlaygroundTabFallback() {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-[1rem] border border-[color:var(--line)] bg-white/50">
      <LoadingMark />
    </div>
  );
}

export function PlaygroundTabLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-[1rem] border border-[color:var(--line)] bg-white/50 px-4">
      <LazyLoadFailure onRetry={onRetry} />
    </div>
  );
}
