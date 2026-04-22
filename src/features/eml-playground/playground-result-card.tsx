import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { type DiagramSource } from "@/features/eml-playground/constants";
import { getTransformCopy } from "@/features/eml-playground/playground-i18n";
import { StatPill } from "@/features/eml-playground/playground-shared";
import type { ExpressionTransform } from "@/features/eml-playground/use-expression-analysis";
import { formatSignedDelta, formatTypeSet } from "@/features/eml-playground/utils";
import { useI18n, useMessages } from "@/i18n";

export function ResultCard({
  active,
  viewKey,
  transform,
  standardMetrics,
  onPreview,
}: {
  active: boolean;
  viewKey: DiagramSource;
  transform: ExpressionTransform;
  standardMetrics: {
    tokenCount: number;
    typeCount: number;
  };
  onPreview: () => void;
}) {
  const { formatNumber } = useI18n();
  const playground = useMessages((messages) => messages.playground);
  const copy = getTransformCopy(playground, viewKey);
  const tokenDelta = transform.metrics.tokenCount - standardMetrics.tokenCount;
  const typeDelta = transform.metrics.typeCount - standardMetrics.typeCount;

  return (
    <div
      className={[
        "min-w-0 rounded-[0.95rem] border p-3 transition-colors",
        active
          ? "border-[color:var(--accent-strong)] bg-[color:var(--accent-soft)]/32"
          : "border-[color:var(--line)] bg-white/80",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
            {copy.api}
          </div>
          <div className="mt-1 flex items-start gap-2">
            <div className="min-w-0 text-[15px] font-semibold text-[color:var(--ink)]">
              {copy.title}
            </div>
            <InfoTip label={`${copy.summary} ${copy.description}`} className="shrink-0" />
          </div>
        </div>
        <Button
          type="button"
          variant={active ? "default" : "outline"}
          size="sm"
          className="rounded-full"
          onClick={onPreview}
        >
          {playground.transforms.previewButton}
        </Button>
      </div>

      <pre className="mt-3 max-h-32 max-w-full overflow-auto rounded-[0.8rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-2.5 font-mono text-xs leading-5 text-[color:var(--ink)]">
        {transform.text}
      </pre>

      <div className="mt-3 grid gap-2 grid-cols-2 xl:grid-cols-4">
        <StatPill
          label={playground.metrics.tokenNodeLabel}
          value={formatNumber(transform.metrics.tokenCount)}
        />
        <StatPill
          label={playground.metrics.operatorTypeLabel}
          value={formatNumber(transform.metrics.typeCount)}
        />
        <StatPill
          label={playground.transforms.deltaLabel}
          value={`${formatSignedDelta(tokenDelta)} / ${formatSignedDelta(typeDelta)}`}
        />
        <StatPill
          label={playground.transforms.typesLabel}
          value={formatTypeSet(transform.metrics.types)}
        />
      </div>
    </div>
  );
}
