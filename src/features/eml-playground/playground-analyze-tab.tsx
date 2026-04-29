import { LuCalculator, LuGauge } from "react-icons/lu";

import { InfoTip } from "@/components/ui/info-tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AsyncMessage, MetricCard, StatPill } from "@/features/eml-playground/playground-shared";
import {
  type DiagramSource,
  type DedupMode,
  type LayoutMode,
} from "@/features/eml-playground/constants";
import type { PlaygroundStudioState } from "@/features/eml-playground/use-playground-studio";
import {
  defaultValueForVariable,
  formatComplex,
  formatScientific,
  metricDelta,
} from "@/features/eml-playground/utils";
import { useI18n, useMessages } from "@/i18n";

export default function PlaygroundAnalyzeTab({ studio }: { studio: PlaygroundStudioState }) {
  const { formatNumber } = useI18n();
  const playground = useMessages((messages) => messages.playground);
  const {
    expression,
    setExpression,
    applySampleExpression,
    analysisState,
    envValues,
    setEnvValues,
    diagramSource,
    setDiagramSource,
    dedupMode,
    setDedupMode,
    layoutMode,
    setLayoutMode,
  } = studio;

  const consistencyDelta =
    analysisState.ok && analysisState.evaluationOk
      ? metricDelta(analysisState.standardValue, analysisState.pureValue)
      : Number.NaN;

  return (
    <div className="space-y-3.5">
      <div className="rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {playground.samples.map((sample) => (
            <Button
              key={sample.expr}
              variant="outline"
              size="sm"
              className="rounded-full border-[color:var(--line)] bg-white/84 px-2.5 text-[0.75rem]"
              onClick={() => applySampleExpression(sample.expr)}
            >
              {sample.label}
            </Button>
          ))}
        </div>

        <div className="mt-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="expression-input" className="text-[color:var(--ink)]">
              {playground.expression.label}
            </Label>
            <InfoTip label={playground.expression.hint} />
          </div>
          <Textarea
            id="expression-input"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            className="min-h-22 resize-y rounded-[0.85rem] border-[color:var(--line)] bg-white/88 font-mono text-sm leading-5"
            placeholder={playground.expression.placeholder}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-3.5">
          <div className="grid gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-[color:var(--ink)]">
                  {playground.controls.diagramSourceLabel}
                </Label>
                <InfoTip label={playground.controls.previewHint} />
              </div>
              <Select
                value={diagramSource}
                onValueChange={(value) => setDiagramSource(value as DiagramSource)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full rounded-[0.75rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    {playground.controls.diagramSourceOptions.standard}
                  </SelectItem>
                  <SelectItem value="pure">
                    {playground.controls.diagramSourceOptions.pure}
                  </SelectItem>
                  <SelectItem value="shortest">
                    {playground.controls.diagramSourceOptions.shortest}
                  </SelectItem>
                  <SelectItem value="lifted">
                    {playground.controls.diagramSourceOptions.lifted}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[color:var(--ink)]">{playground.controls.dedupLabel}</Label>
              <Select value={dedupMode} onValueChange={(value) => setDedupMode(value as DedupMode)}>
                <SelectTrigger
                  size="sm"
                  className="w-full rounded-[0.75rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{playground.controls.dedupOptions.none}</SelectItem>
                  <SelectItem value="compound">
                    {playground.controls.dedupOptions.compound}
                  </SelectItem>
                  <SelectItem value="all">{playground.controls.dedupOptions.all}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[color:var(--ink)]">{playground.controls.layoutLabel}</Label>
              <Select
                value={layoutMode}
                onValueChange={(value) => setLayoutMode(value as LayoutMode)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full rounded-[0.75rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dagre">dagre</SelectItem>
                  <SelectItem value="elk">elk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {analysisState.ok ? (
          <div className="grid gap-3">
            <MetricCard
              title={playground.metrics.standardTitle}
              tokenCount={analysisState.standard.metrics.tokenCount}
              typeCount={analysisState.standard.metrics.typeCount}
              tokenNodeLabel={playground.metrics.tokenNodeLabel}
              operatorTypeLabel={playground.metrics.operatorTypeLabel}
              formatNumber={formatNumber}
            />
            <MetricCard
              title={playground.metrics.pureTitle}
              tokenCount={analysisState.pure.metrics.tokenCount}
              typeCount={analysisState.pure.metrics.typeCount}
              tokenNodeLabel={playground.metrics.tokenNodeLabel}
              operatorTypeLabel={playground.metrics.operatorTypeLabel}
              formatNumber={formatNumber}
            />
          </div>
        ) : (
          <AsyncMessage tone="warning">
            {playground.parseError({ detail: analysisState.error })}
          </AsyncMessage>
        )}
      </div>

      {analysisState.ok ? (
        <>
          <div className="rounded-[1rem] border border-[color:var(--line)] bg-white/78 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-[0.8rem] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                <LuCalculator className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-[color:var(--ink)]">
                    {playground.variables.title}
                  </div>
                  <InfoTip label={playground.variables.description} />
                </div>
              </div>
            </div>
            <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
              {analysisState.variables.length > 0 ? (
                analysisState.variables.map((name) => (
                  <div key={name} className="min-w-0 space-y-1.5">
                    <Label htmlFor={`var-${name}`} className="text-[color:var(--ink)]">
                      {name}
                    </Label>
                    <Input
                      id={`var-${name}`}
                      value={envValues[name] ?? defaultValueForVariable(name)}
                      onChange={(event) =>
                        setEnvValues((previous) => ({
                          ...previous,
                          [name]: event.target.value,
                        }))
                      }
                      className="h-8 rounded-[0.75rem] border-[color:var(--line)] bg-[color:var(--paper-strong)] font-mono"
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-[0.8rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper-strong)] px-4 py-3 text-sm text-[color:var(--ink-soft)] sm:col-span-3">
                  {playground.variables.empty}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1rem] border border-[color:var(--line)] bg-white/78 p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.15em] text-[color:var(--ink-soft)] uppercase">
              <span>{playground.numericCheck.title}</span>
              <LuGauge className="size-4" />
            </div>

            {analysisState.evaluationOk ? (
              <div className="mt-3.5 grid gap-2.5 lg:grid-cols-3">
                <StatPill
                  label={playground.numericCheck.standardValueLabel}
                  value={formatComplex(analysisState.standardValue)}
                />
                <StatPill
                  label={playground.numericCheck.pureValueLabel}
                  value={formatComplex(analysisState.pureValue)}
                />
                <StatPill
                  label={playground.numericCheck.deltaLabel}
                  value={formatScientific(consistencyDelta)}
                />
              </div>
            ) : (
              <AsyncMessage tone="warning">
                {playground.numericCheck.evaluationError({
                  detail: analysisState.evaluationError,
                })}
              </AsyncMessage>
            )}

            <div className="mt-3.5 rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-[color:var(--ink)]">
                  {playground.numericCheck.exactValueLabel}
                </div>
                <InfoTip label={playground.numericCheck.exactHint} />
              </div>
              {analysisState.exactOk ? (
                <div className="mt-2.5 font-mono text-sm leading-6 text-[color:var(--ink)]">
                  {analysisState.exactValueText}
                </div>
              ) : (
                <div className="mt-2.5 text-sm leading-6 text-[color:var(--warning-ink)]">
                  {playground.numericCheck.exactError({
                    detail: analysisState.exactError,
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
