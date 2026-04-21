import { startTransition, useEffect, useMemo, useState } from "react";
import { LuArrowRight, LuCalculator, LuCheck, LuCopy } from "react-icons/lu";
import { exprToD2, toString } from "emlib";

import {
  DEFAULT_EXPRESSION,
  PURE_RENDER_LIMIT,
  type DiagramMode,
  type LayoutMode,
} from "@/features/eml-playground/constants";
import { useD2Preview, usePreviewActivation } from "@/features/eml-playground/use-d2-preview";
import { useExpressionAnalysis } from "@/features/eml-playground/use-expression-analysis";
import {
  defaultValueForVariable,
  formatComplex,
  metricDelta,
  withTransparentD2Background,
} from "@/features/eml-playground/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useI18n } from "@/i18n";

function MetricCard({
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
    <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
      <div className="stat-label">{title}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-3xl font-semibold text-[color:var(--ink)]">
            {formatNumber(tokenCount)}
          </div>
          <div className="text-sm text-[color:var(--ink-soft)]">{tokenNodeLabel}</div>
        </div>
        <div>
          <div className="text-3xl font-semibold text-[color:var(--ink)]">
            {formatNumber(typeCount)}
          </div>
          <div className="text-sm text-[color:var(--ink-soft)]">{operatorTypeLabel}</div>
        </div>
      </div>
    </div>
  );
}

export function PlaygroundStudio() {
  const { formatNumber, messages } = useI18n();
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [diagramMode, setDiagramMode] = useState<DiagramMode>("pure");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("dagre");
  const [envValues, setEnvValues] = useState<Record<string, string>>({
    x: "0.5",
    y: "2",
  });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const analysisState = useExpressionAnalysis(expression, envValues);
  const previewActivation = usePreviewActivation<HTMLDivElement>();

  useEffect(() => {
    if (!analysisState.ok) return;

    setEnvValues((previous) => {
      let changed = false;
      const next = { ...previous };

      for (const name of analysisState.variables) {
        if (next[name] !== undefined) continue;
        next[name] = defaultValueForVariable(name);
        changed = true;
      }

      return changed ? next : previous;
    });
  }, [analysisState]);

  useEffect(() => {
    if (copyState === "idle") return;

    const timer = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const diagramPayload = useMemo(() => {
    if (!analysisState.ok) {
      return {
        canRender: false,
        reason: messages.playground.diagram.invalidExpressionReason,
        d2Source: "",
      };
    }

    const activeExpr = diagramMode === "pure" ? analysisState.pureExpr : analysisState.standardExpr;
    const activeMetrics =
      diagramMode === "pure" ? analysisState.pureMetrics : analysisState.standardMetrics;
    const d2Source = withTransparentD2Background(exprToD2(activeExpr));

    if (diagramMode === "pure" && activeMetrics.tokenCount > PURE_RENDER_LIMIT) {
      return {
        canRender: false,
        reason: messages.playground.diagram.pureRenderLimitReason({
          nodeCount: formatNumber(activeMetrics.tokenCount),
          limit: formatNumber(PURE_RENDER_LIMIT),
        }),
        d2Source,
      };
    }

    return {
      canRender: true,
      reason: null,
      d2Source,
    };
  }, [analysisState, diagramMode, formatNumber, messages]);

  const d2Preview = useD2Preview({
    active: previewActivation.isActivated,
    canRender: diagramPayload.canRender,
    d2Source: diagramPayload.d2Source,
    diagramMode,
    layoutMode,
  });

  const consistencyDelta =
    analysisState.ok && analysisState.evaluationOk
      ? metricDelta(analysisState.standardValue, analysisState.pureValue)
      : Number.NaN;

  const handleCopyD2 = async () => {
    if (!diagramPayload.d2Source) return;

    try {
      await navigator.clipboard.writeText(diagramPayload.d2Source);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <Card className="paper-card border-[color:var(--line-strong)] py-5 sm:py-6">
      <CardHeader className="gap-3 border-b border-[color:var(--line)]/70 px-5 pb-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
            {messages.playground.eyebrow}
          </div>
          <div className="text-[11px] text-[color:var(--ink-soft)]">
            {messages.playground.badge}
          </div>
        </div>
        <CardTitle className="font-display text-3xl text-[color:var(--ink)]">
          {messages.playground.title}
        </CardTitle>
        <CardDescription className="max-w-full leading-7 text-[color:var(--ink-soft)]">
          {messages.playground.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid items-start gap-4 px-5 pt-0 sm:px-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] xl:gap-5">
        <div className="min-w-0 space-y-3.5">
          <div className="rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              {messages.playground.samples.map((sample) => (
                <Button
                  key={sample.expr}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[color:var(--line)] bg-white/84 px-3 text-[13px]"
                  onClick={() => {
                    startTransition(() => {
                      setExpression(sample.expr);
                    });
                  }}
                >
                  {sample.label}
                </Button>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="expression-input" className="text-[color:var(--ink)]">
                {messages.playground.expression.label}
              </Label>
              <Textarea
                id="expression-input"
                value={expression}
                onChange={(event) => setExpression(event.target.value)}
                className="min-h-28 resize-y rounded-[0.9rem] border-[color:var(--line)] bg-white/88 font-mono text-sm leading-6"
                placeholder={messages.playground.expression.placeholder}
              />
              <p className="text-xs leading-5 text-[color:var(--ink-soft)]">
                {messages.playground.expression.hint}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4">
              <Label className="text-[color:var(--ink)]">
                {messages.playground.controls.diagramModeLabel}
              </Label>
              <Select
                value={diagramMode}
                onValueChange={(value) => setDiagramMode(value as DiagramMode)}
              >
                <SelectTrigger className="mt-3 w-full min-w-0 rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    {messages.playground.controls.diagramModeOptions.standard}
                  </SelectItem>
                  <SelectItem value="pure">
                    {messages.playground.controls.diagramModeOptions.pure}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4">
              <Label className="text-[color:var(--ink)]">
                {messages.playground.controls.layoutLabel}
              </Label>
              <Select
                value={layoutMode}
                onValueChange={(value) => setLayoutMode(value as LayoutMode)}
              >
                <SelectTrigger className="mt-3 w-full min-w-0 rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dagre">dagre</SelectItem>
                  <SelectItem value="elk">elk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-[1rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[0.8rem] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                <LuCalculator className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-[color:var(--ink)]">
                  {messages.playground.variables.title}
                </div>
                <p className="text-sm text-[color:var(--ink-soft)]">
                  {messages.playground.variables.description}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {analysisState.ok && analysisState.variables.length > 0 ? (
                analysisState.variables.map((name) => (
                  <div key={name} className="min-w-0 space-y-2">
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
                      className="rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)] font-mono"
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-[0.8rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper-strong)] px-4 py-3 text-sm text-[color:var(--ink-soft)] sm:col-span-3">
                  {messages.playground.variables.empty}
                </div>
              )}
            </div>
          </div>

          {analysisState.ok ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <MetricCard
                  title={messages.playground.metrics.standardTitle}
                  tokenCount={analysisState.standardMetrics.tokenCount}
                  typeCount={analysisState.standardMetrics.typeCount}
                  tokenNodeLabel={messages.playground.metrics.tokenNodeLabel}
                  operatorTypeLabel={messages.playground.metrics.operatorTypeLabel}
                  formatNumber={formatNumber}
                />
                <MetricCard
                  title={messages.playground.metrics.pureTitle}
                  tokenCount={analysisState.pureMetrics.tokenCount}
                  typeCount={analysisState.pureMetrics.typeCount}
                  tokenNodeLabel={messages.playground.metrics.tokenNodeLabel}
                  operatorTypeLabel={messages.playground.metrics.operatorTypeLabel}
                  formatNumber={formatNumber}
                />
              </div>

              <div className="grid gap-3">
                <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.15em] text-[color:var(--ink-soft)] uppercase">
                    <span>{messages.playground.lowering.title}</span>
                    <LuArrowRight className="size-4" />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-[0.14em] text-[color:var(--ink-soft)] uppercase">
                        {messages.playground.lowering.standardExpressionLabel}
                      </div>
                      <pre className="mt-2 max-w-full overflow-x-auto rounded-[0.8rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 font-mono text-xs leading-6 text-[color:var(--ink)]">
                        {toString(analysisState.standardExpr)}
                      </pre>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-[0.14em] text-[color:var(--ink-soft)] uppercase">
                        {messages.playground.lowering.pureExpressionLabel}
                      </div>
                      <pre className="mt-2 max-h-52 max-w-full overflow-auto rounded-[0.8rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 font-mono text-xs leading-6 text-[color:var(--ink)]">
                        {toString(analysisState.pureExpr)}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
                  <div className="text-xs font-semibold tracking-[0.14em] text-[color:var(--ink-soft)] uppercase">
                    {messages.playground.numericCheck.title}
                  </div>
                  {analysisState.evaluationOk ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <div className="text-sm text-[color:var(--ink-soft)]">
                          {messages.playground.numericCheck.standardValueLabel}
                        </div>
                        <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                          {formatComplex(analysisState.standardValue)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-[color:var(--ink-soft)]">
                          {messages.playground.numericCheck.pureValueLabel}
                        </div>
                        <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                          {formatComplex(analysisState.pureValue)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-[color:var(--ink-soft)]">
                          {messages.playground.numericCheck.deltaLabel}
                        </div>
                        <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                          {consistencyDelta.toExponential(3)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-[0.8rem] border border-[color:var(--warning-line)] bg-[color:var(--warning-bg)] p-4 text-sm leading-6 text-[color:var(--warning-ink)]">
                      {messages.playground.numericCheck.evaluationError({
                        detail: analysisState.evaluationError,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[0.95rem] border border-[color:var(--warning-line)] bg-[color:var(--warning-bg)] p-5 text-sm leading-6 text-[color:var(--warning-ink)]">
              {messages.playground.parseError({
                detail: analysisState.error,
              })}
            </div>
          )}
        </div>

        <div ref={previewActivation.ref} className="min-w-0 space-y-3.5 xl:sticky xl:top-6">
          <div className="diagram-shell">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4">
              <div className="mt-1 font-display text-2xl text-[color:var(--ink)]">
                {diagramMode === "pure"
                  ? messages.playground.diagram.titles.pure
                  : messages.playground.diagram.titles.standard}
              </div>
              <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1 text-xs font-semibold text-[color:var(--ink-soft)]">
                {messages.playground.diagram.layoutBadge({
                  layout: layoutMode,
                })}{" "}
                / {messages.playground.diagram.eyebrow}
              </div>
            </div>

            <div className="diagram-canvas">
              {!previewActivation.isActivated && diagramPayload.canRender ? (
                <div className="rounded-[0.9rem] border border-dashed border-[color:var(--line)] bg-white/72 p-5 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {messages.playground.diagram.deferredHint}
                </div>
              ) : diagramPayload.reason ? (
                <div className="rounded-[0.9rem] border border-dashed border-[color:var(--line)] bg-white/72 p-5 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {diagramPayload.reason}
                </div>
              ) : d2Preview.renderError ? (
                <div className="rounded-[0.9rem] border border-dashed border-[color:var(--line)] bg-white/72 p-5 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {messages.playground.diagram.renderError({
                    detail: d2Preview.renderError,
                  })}
                </div>
              ) : d2Preview.isRendering ? (
                <div className="rounded-[0.9rem] border border-[color:var(--line)] bg-white/72 px-5 py-6 text-sm text-[color:var(--ink-soft)]">
                  {messages.playground.diagram.loading}
                </div>
              ) : d2Preview.svgUrl ? (
                <div className="d2-viewport rounded-[0.9rem] border border-[color:var(--line)]">
                  <img
                    src={d2Preview.svgUrl}
                    alt={messages.playground.diagram.previewAriaLabel({
                      mode:
                        diagramMode === "pure"
                          ? messages.playground.diagram.titles.pure
                          : messages.playground.diagram.titles.standard,
                    })}
                    className="d2-preview-image"
                    onError={d2Preview.handleImageError}
                  />
                </div>
              ) : (
                <div className="rounded-[0.9rem] border border-dashed border-[color:var(--line)] bg-white/72 px-5 py-6 text-sm text-[color:var(--ink-soft)]">
                  {messages.playground.diagram.empty}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-[1rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
                {messages.playground.d2Source.title}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                onClick={() => {
                  void handleCopyD2();
                }}
              >
                {copyState === "copied" ? (
                  <LuCheck className="size-4" />
                ) : (
                  <LuCopy className="size-4" />
                )}
                {copyState === "copied"
                  ? messages.playground.d2Source.copySuccess
                  : copyState === "failed"
                    ? messages.playground.d2Source.copyFailed
                    : messages.playground.d2Source.copyIdle}
              </Button>
            </div>
            <div className="mt-3">
              <Textarea
                readOnly
                value={diagramPayload.d2Source}
                className="h-48 min-h-0 rounded-[0.85rem] border-[color:var(--line)] bg-[color:var(--paper-strong)] font-mono text-xs leading-6"
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[color:var(--ink-soft)]">
              {messages.playground.d2Source.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PlaygroundStudio;
