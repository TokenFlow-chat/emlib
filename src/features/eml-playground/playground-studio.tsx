import {
  C,
  analyzeExpr,
  compressPureEml,
  createMasterTree,
  evaluate,
  exprToD2,
  parse,
  synthesizePureEml,
  toString,
  trainMasterFormula,
  type CompressionLevel,
} from "emlib";
import { type ReactNode, startTransition, useEffect, useMemo, useState } from "react";
import {
  LuArrowRight,
  LuBrain,
  LuCalculator,
  LuCheck,
  LuCopy,
  LuFlaskConical,
  LuGauge,
  LuGitBranch,
  LuScanSearch,
  LuSparkles,
} from "react-icons/lu";

import {
  DEFAULT_COMPRESSION_MODE,
  DEFAULT_EXPRESSION,
  DEFAULT_MASTER_PRESET,
  DEFAULT_SYNTH_BEAM_WIDTH,
  DEFAULT_SYNTH_MAX_LEAVES,
  DEFAULT_SYNTH_TARGET,
  PURE_RENDER_LIMIT,
  SYNTH_BEAM_WIDTH_OPTIONS,
  SYNTH_MAX_LEAF_OPTIONS,
  type CompressionMode,
  type DiagramSource,
  type LayoutMode,
  type MasterPresetId,
} from "@/features/eml-playground/constants";
import { useD2Preview, usePreviewActivation } from "@/features/eml-playground/use-d2-preview";
import {
  type ExpressionTransform,
  useExpressionAnalysis,
} from "@/features/eml-playground/use-expression-analysis";
import {
  collectVariables,
  defaultValueForVariable,
  formatComplex,
  formatScientific,
  formatSignedDelta,
  formatTypeSet,
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

type ResultView = {
  key: DiagramSource;
  title: string;
  description: string;
  apiLabel: string;
  transform: ExpressionTransform;
};

type AsyncState<T> =
  | { status: "idle" }
  | { status: "running" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

type CompressionDemoResult = {
  level: CompressionMode;
  baselineTokens: number;
  candidateTokens: number | null;
  delta: number | null;
  exprText: string | null;
};

type SynthesisDemoResult = {
  exprText: string;
  targetTokens: number;
  resultTokens: number;
  leaves: number;
  distance: number;
  delta: number;
};

type MasterDemoResult = {
  presetId: MasterPresetId;
  success: boolean;
  loss: number;
  restarts: number;
  totalEpochs: number;
  exprText: string | null;
};

type MasterPreset = {
  id: MasterPresetId;
  expr: string;
  depth: number;
  sampleXs: number[];
  options: Parameters<typeof trainMasterFormula>[2];
};

const MASTER_PRESETS: Record<MasterPresetId, MasterPreset> = {
  exp: {
    id: "exp",
    expr: "exp(x)",
    depth: 1,
    sampleXs: [0.5, 1.0, 1.5, 2.0],
    options: {
      depth: 1,
      restarts: 8,
      lr: 0.1,
      epochs: 320,
      hardeningEpochs: 140,
      tolerance: 1e-10,
    },
  },
  eMinusX: {
    id: "eMinusX",
    expr: "e-x",
    depth: 2,
    sampleXs: [0.5, 1.0, 1.5, 2.0],
    options: {
      depth: 2,
      restarts: 10,
      lr: 0.05,
      epochs: 420,
      hardeningEpochs: 180,
      tolerance: 1e-9,
    },
  },
  ln: {
    id: "ln",
    expr: "ln(x)",
    depth: 3,
    sampleXs: [0.6, 0.9, 1.3, 1.8, 2.5],
    options: {
      depth: 3,
      restarts: 4,
      lr: 0.03,
      epochs: 280,
      hardeningEpochs: 120,
      tolerance: 1e-8,
    },
  },
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.85rem] border border-[color:var(--line)] bg-white/78 px-3 py-2">
      <div className="text-[11px] font-semibold tracking-[0.16em] text-[color:var(--ink-soft)] uppercase">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[color:var(--ink)]">{value}</div>
    </div>
  );
}

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
      <div className="mt-3 grid gap-3 grid-cols-2">
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

function ResultCard({
  active,
  description,
  formatNumber,
  onPreview,
  previewLabel,
  title,
  transform,
  apiLabel,
  standardMetrics,
  deltaLabel,
  typesLabel,
}: {
  active: boolean;
  description: string;
  formatNumber: (value: number) => string;
  onPreview: () => void;
  previewLabel: string;
  title: string;
  transform: ExpressionTransform;
  apiLabel: string;
  standardMetrics: ExpressionTransform["metrics"];
  deltaLabel: string;
  typesLabel: string;
}) {
  const tokenDelta = transform.metrics.tokenCount - standardMetrics.tokenCount;
  const typeDelta = transform.metrics.typeCount - standardMetrics.typeCount;

  return (
    <div
      className={[
        "min-w-0 rounded-[1rem] border p-4 transition-colors sm:p-5",
        active
          ? "border-[color:var(--accent-strong)] bg-[color:var(--accent-soft)]/32"
          : "border-[color:var(--line)] bg-white/80",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
            {apiLabel}
          </div>
          <div className="mt-1 text-lg font-semibold text-[color:var(--ink)]">{title}</div>
          <p className="mt-1 text-sm leading-6 text-[color:var(--ink-soft)]">{description}</p>
        </div>
        <Button
          type="button"
          variant={active ? "default" : "outline"}
          size="sm"
          className={
            active
              ? "rounded-full bg-[color:var(--accent-strong)] text-white hover:bg-[color:var(--accent-strong)]/90"
              : "rounded-full border-[color:var(--line)] bg-[color:var(--paper-strong)]"
          }
          onClick={onPreview}
        >
          {previewLabel}
        </Button>
      </div>

      <pre className="mt-4 max-h-44 max-w-full overflow-auto rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 font-mono text-xs leading-6 text-[color:var(--ink)]">
        {transform.text}
      </pre>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Nodes" value={formatNumber(transform.metrics.tokenCount)} />
        <StatPill label="Operators" value={formatNumber(transform.metrics.typeCount)} />
        <StatPill
          label={deltaLabel}
          value={`${formatSignedDelta(tokenDelta)} / ${formatSignedDelta(typeDelta)}`}
        />
        <StatPill label={typesLabel} value={formatTypeSet(transform.metrics.types)} />
      </div>
    </div>
  );
}

function ExperimentShell({
  title,
  description,
  eyebrow,
  icon,
  children,
}: {
  title: string;
  description: string;
  eyebrow: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1rem] border border-[color:var(--line)] bg-white/80 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
            {eyebrow}
          </div>
          <div className="mt-1 text-lg font-semibold text-[color:var(--ink)]">{title}</div>
          <p className="mt-1 text-sm leading-6 text-[color:var(--ink-soft)]">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function AsyncMessage({
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
    <div className={`rounded-[0.85rem] border px-4 py-3 text-sm leading-6 ${className}`}>
      {children}
    </div>
  );
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 24);
  });
}

export function PlaygroundStudio() {
  const { formatNumber, messages } = useI18n();
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [diagramSource, setDiagramSource] = useState<DiagramSource>("pure");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("dagre");
  const [envValues, setEnvValues] = useState<Record<string, string>>({
    x: "0.5",
    y: "2",
  });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [compressionMode, setCompressionMode] = useState<CompressionMode>(DEFAULT_COMPRESSION_MODE);
  const [compressionState, setCompressionState] = useState<AsyncState<CompressionDemoResult>>({
    status: "idle",
  });
  const [synthTarget, setSynthTarget] = useState(DEFAULT_SYNTH_TARGET);
  const [synthMaxLeaves, setSynthMaxLeaves] = useState(DEFAULT_SYNTH_MAX_LEAVES);
  const [synthBeamWidth, setSynthBeamWidth] = useState(DEFAULT_SYNTH_BEAM_WIDTH);
  const [synthesisState, setSynthesisState] = useState<AsyncState<SynthesisDemoResult>>({
    status: "idle",
  });
  const [masterPresetId, setMasterPresetId] = useState<MasterPresetId>(DEFAULT_MASTER_PRESET);
  const [masterState, setMasterState] = useState<AsyncState<MasterDemoResult>>({
    status: "idle",
  });

  const analysisState = useExpressionAnalysis(expression, envValues);
  const previewActivation = usePreviewActivation<HTMLDivElement>();
  const masterPreset = MASTER_PRESETS[masterPresetId];
  const masterTree = useMemo(() => createMasterTree(masterPreset.depth), [masterPreset.depth]);

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

  useEffect(() => {
    setCompressionState({ status: "idle" });
  }, [analysisState, compressionMode]);

  useEffect(() => {
    setSynthesisState({ status: "idle" });
  }, [synthTarget, synthMaxLeaves, synthBeamWidth]);

  useEffect(() => {
    setMasterState({ status: "idle" });
  }, [masterPresetId]);

  const expressionViews = useMemo<ResultView[]>(() => {
    if (!analysisState.ok) return [];

    return [
      {
        key: "standard",
        title: messages.playground.transforms.standard.title,
        description: messages.playground.transforms.standard.description,
        apiLabel: messages.playground.transforms.standard.api,
        transform: analysisState.standard,
      },
      {
        key: "pure",
        title: messages.playground.transforms.pure.title,
        description: messages.playground.transforms.pure.description,
        apiLabel: messages.playground.transforms.pure.api,
        transform: analysisState.pure,
      },
      {
        key: "shortest",
        title: messages.playground.transforms.shortest.title,
        description: messages.playground.transforms.shortest.description,
        apiLabel: messages.playground.transforms.shortest.api,
        transform: analysisState.shortest,
      },
      {
        key: "lifted",
        title: messages.playground.transforms.lifted.title,
        description: messages.playground.transforms.lifted.description,
        apiLabel: messages.playground.transforms.lifted.api,
        transform: analysisState.lifted,
      },
    ];
  }, [analysisState, messages]);

  const selectedView =
    expressionViews.find((view) => view.key === diagramSource) ?? expressionViews[0];
  const previewMode = selectedView?.key === "pure" ? "pure" : "standard";

  const diagramPayload = useMemo(() => {
    if (!analysisState.ok || !selectedView) {
      return {
        canRender: false,
        reason: messages.playground.diagram.invalidExpressionReason,
        d2Source: "",
      };
    }

    const d2Source = withTransparentD2Background(exprToD2(selectedView.transform.expr));

    if (selectedView.transform.metrics.tokenCount > PURE_RENDER_LIMIT) {
      return {
        canRender: false,
        reason: messages.playground.diagram.renderLimitReason({
          label: selectedView.title,
          nodeCount: formatNumber(selectedView.transform.metrics.tokenCount),
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
  }, [analysisState, formatNumber, messages, selectedView]);

  const d2Preview = useD2Preview({
    active: previewActivation.isActivated,
    canRender: diagramPayload.canRender,
    d2Source: diagramPayload.d2Source,
    diagramMode: previewMode ?? "standard",
    layoutMode,
  });

  const consistencyDelta =
    analysisState.ok && analysisState.evaluationOk
      ? metricDelta(analysisState.standardValue, analysisState.pureValue)
      : Number.NaN;

  const synthTargetState = useMemo(() => {
    try {
      const expr = parse(synthTarget);
      return {
        ok: true as const,
        expr,
        metrics: analyzeExpr(expr),
        variables: collectVariables(expr),
      };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [synthTarget]);

  const handleCopyD2 = async () => {
    if (!diagramPayload.d2Source) return;

    try {
      await navigator.clipboard.writeText(diagramPayload.d2Source);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const runCompressionDemo = async () => {
    if (!analysisState.ok) return;

    setCompressionState({ status: "running" });
    await waitForPaint();

    try {
      const result = compressPureEml(analysisState.pure.expr, {
        compression: compressionMode as CompressionLevel,
        variables: analysisState.variables,
      });

      setCompressionState({
        status: "success",
        data: {
          level: compressionMode,
          baselineTokens: analysisState.pure.metrics.tokenCount,
          candidateTokens: result ? analyzeExpr(result.expr).tokenCount : null,
          delta: result?.delta ?? null,
          exprText: result ? toString(result.expr) : null,
        },
      });
    } catch (error) {
      setCompressionState({
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const runSynthesisDemo = async () => {
    if (!synthTargetState.ok) return;

    setSynthesisState({ status: "running" });
    await waitForPaint();

    try {
      const variables = synthTargetState.variables;
      const result = synthesizePureEml(synthTargetState.expr, {
        maxLeaves: synthMaxLeaves,
        beamWidth: synthBeamWidth,
        variables,
      });

      if (!result) {
        setSynthesisState({
          status: "error",
          error: messages.playground.experiments.synthesis.noResult,
        });
        return;
      }

      setSynthesisState({
        status: "success",
        data: {
          exprText: toString(result.expr),
          targetTokens: synthTargetState.metrics.tokenCount,
          resultTokens: analyzeExpr(result.expr).tokenCount,
          leaves: result.leaves,
          distance: result.distance,
          delta: result.delta,
        },
      });
    } catch (error) {
      setSynthesisState({
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const runMasterDemo = async () => {
    setMasterState({ status: "running" });
    await waitForPaint();

    try {
      const targetExpr = parse(masterPreset.expr);
      const samples = masterPreset.sampleXs.map((value) => C(value, 0));
      const targets = masterPreset.sampleXs.map((value) => evaluate(targetExpr, { x: value }));
      const result = trainMasterFormula(samples, targets, masterPreset.options);

      setMasterState({
        status: "success",
        data: {
          presetId: masterPresetId,
          success: result.success,
          loss: result.loss,
          restarts: result.restarts,
          totalEpochs: result.totalEpochs,
          exprText: result.expr ? toString(result.expr) : null,
        },
      });
    } catch (error) {
      setMasterState({
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
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

      <CardContent className="space-y-5 px-5 pt-0 sm:px-6">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,0.96fr)]">
          <div className="min-w-0 space-y-4">
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
              <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4 flex flex-col gap-4">
                <Label className="text-[color:var(--ink)]">
                  {messages.playground.controls.diagramSourceLabel}
                </Label>
                <Select
                  value={diagramSource}
                  onValueChange={(value) => setDiagramSource(value as DiagramSource)}
                >
                  <SelectTrigger className="w-full min-w-0 rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">
                      {messages.playground.controls.diagramSourceOptions.standard}
                    </SelectItem>
                    <SelectItem value="pure">
                      {messages.playground.controls.diagramSourceOptions.pure}
                    </SelectItem>
                    <SelectItem value="shortest">
                      {messages.playground.controls.diagramSourceOptions.shortest}
                    </SelectItem>
                    <SelectItem value="lifted">
                      {messages.playground.controls.diagramSourceOptions.lifted}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Label className="text-[color:var(--ink)]">
                  {messages.playground.controls.layoutLabel}
                </Label>
                <Select
                  value={layoutMode}
                  onValueChange={(value) => setLayoutMode(value as LayoutMode)}
                >
                  <SelectTrigger className="w-full min-w-0 rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dagre">dagre</SelectItem>
                    <SelectItem value="elk">elk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4 sm:col-span-2 xl:col-span-1">
                <div className="text-[11px] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
                  {messages.playground.controls.previewHintLabel}
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {messages.playground.controls.previewHint}
                </p>
              </div>
            </div>

            {analysisState.ok ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <MetricCard
                    title={messages.playground.metrics.standardTitle}
                    tokenCount={analysisState.standard.metrics.tokenCount}
                    typeCount={analysisState.standard.metrics.typeCount}
                    tokenNodeLabel={messages.playground.metrics.tokenNodeLabel}
                    operatorTypeLabel={messages.playground.metrics.operatorTypeLabel}
                    formatNumber={formatNumber}
                  />
                  <MetricCard
                    title={messages.playground.metrics.pureTitle}
                    tokenCount={analysisState.pure.metrics.tokenCount}
                    typeCount={analysisState.pure.metrics.typeCount}
                    tokenNodeLabel={messages.playground.metrics.tokenNodeLabel}
                    operatorTypeLabel={messages.playground.metrics.operatorTypeLabel}
                    formatNumber={formatNumber}
                  />
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

                <div className="rounded-[1rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.15em] text-[color:var(--ink-soft)] uppercase">
                    <span>{messages.playground.numericCheck.title}</span>
                    <LuGauge className="size-4" />
                  </div>

                  {analysisState.evaluationOk ? (
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4">
                        <div className="text-sm text-[color:var(--ink-soft)]">
                          {messages.playground.numericCheck.standardValueLabel}
                        </div>
                        <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                          {formatComplex(analysisState.standardValue)}
                        </div>
                      </div>
                      <div className="rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4">
                        <div className="text-sm text-[color:var(--ink-soft)]">
                          {messages.playground.numericCheck.pureValueLabel}
                        </div>
                        <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                          {formatComplex(analysisState.pureValue)}
                        </div>
                      </div>
                      <div className="rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4">
                        <div className="text-sm text-[color:var(--ink-soft)]">
                          {messages.playground.numericCheck.deltaLabel}
                        </div>
                        <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                          {formatScientific(consistencyDelta)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <AsyncMessage tone="warning">
                      {messages.playground.numericCheck.evaluationError({
                        detail: analysisState.evaluationError,
                      })}
                    </AsyncMessage>
                  )}

                  <div className="mt-4 rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[color:var(--ink)]">
                        {messages.playground.numericCheck.exactValueLabel}
                      </div>
                      {analysisState.exactOk ? (
                        <span className="rounded-full border border-[color:var(--line)] bg-white/84 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--ink-soft)]">
                          {analysisState.exactKind === "symbolic"
                            ? messages.playground.numericCheck.exactModes.symbolic
                            : messages.playground.numericCheck.exactModes.exact}
                        </span>
                      ) : null}
                    </div>
                    {analysisState.exactOk ? (
                      <>
                        <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                          {analysisState.exactValueText}
                        </div>
                        <p className="mt-3 text-xs leading-5 text-[color:var(--ink-soft)]">
                          {messages.playground.numericCheck.exactHint}
                        </p>
                      </>
                    ) : (
                      <div className="mt-3 text-sm leading-6 text-[color:var(--warning-ink)]">
                        {messages.playground.numericCheck.exactError({
                          detail: analysisState.exactError,
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <AsyncMessage tone="warning">
                {messages.playground.parseError({
                  detail: analysisState.error,
                })}
              </AsyncMessage>
            )}
          </div>

          <div ref={previewActivation.ref} className="min-w-0 space-y-3.5 xl:sticky xl:top-6">
            <div className="diagram-shell">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4">
                <div className="mt-1 font-display text-2xl text-[color:var(--ink)]">
                  {selectedView?.title ?? messages.playground.diagram.titles.standard}
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
                        mode: selectedView?.title ?? messages.playground.diagram.titles.standard,
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
        </div>

        {analysisState.ok && (
          <div className="rounded-[1rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.15em] text-[color:var(--ink-soft)] uppercase">
              <span>{messages.playground.transforms.title}</span>
              <LuArrowRight className="size-4" />
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {expressionViews.map((view) => (
                <ResultCard
                  key={view.key}
                  active={view.key === diagramSource}
                  title={view.title}
                  description={view.description}
                  apiLabel={view.apiLabel}
                  transform={view.transform}
                  standardMetrics={analysisState.standard.metrics}
                  formatNumber={formatNumber}
                  deltaLabel={messages.playground.transforms.deltaLabel}
                  typesLabel={messages.playground.transforms.typesLabel}
                  previewLabel={messages.playground.transforms.previewButton}
                  onPreview={() => setDiagramSource(view.key)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
              {messages.playground.experiments.eyebrow}
            </div>
            <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1 text-xs font-semibold text-[color:var(--ink-soft)]">
              {messages.playground.experiments.badge}
            </div>
          </div>
          <div className="mt-2 font-display text-2xl text-[color:var(--ink)]">
            {messages.playground.experiments.title}
          </div>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-[color:var(--ink-soft)]">
            {messages.playground.experiments.description}
          </p>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <ExperimentShell
              eyebrow={messages.playground.experiments.compression.eyebrow}
              title={messages.playground.experiments.compression.title}
              description={messages.playground.experiments.compression.description}
              icon={<LuSparkles className="size-5" />}
            >
              <div className="space-y-2">
                <Label className="text-[color:var(--ink)]">
                  {messages.playground.experiments.compression.levelLabel}
                </Label>
                <Select
                  value={compressionMode}
                  onValueChange={(value) => setCompressionMode(value as CompressionMode)}
                >
                  <SelectTrigger className="w-full min-w-0 rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      {messages.playground.experiments.compression.levels.light}
                    </SelectItem>
                    <SelectItem value="medium">
                      {messages.playground.experiments.compression.levels.medium}
                    </SelectItem>
                    <SelectItem value="aggressive">
                      {messages.playground.experiments.compression.levels.aggressive}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {analysisState.ok ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <StatPill
                    label={messages.playground.experiments.compression.baselineLabel}
                    value={formatNumber(analysisState.pure.metrics.tokenCount)}
                  />
                  <StatPill
                    label={messages.playground.experiments.compression.typesLabel}
                    value={formatTypeSet(analysisState.pure.metrics.types)}
                  />
                </div>
              ) : (
                <AsyncMessage>
                  {messages.playground.experiments.compression.requiresValidExpression}
                </AsyncMessage>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-[0.85rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                disabled={!analysisState.ok || compressionState.status === "running"}
                onClick={() => {
                  void runCompressionDemo();
                }}
              >
                <LuScanSearch className="size-4" />
                {compressionState.status === "running"
                  ? messages.playground.experiments.shared.running
                  : messages.playground.experiments.compression.runButton}
              </Button>

              {compressionState.status === "idle" ? (
                <AsyncMessage>{messages.playground.experiments.compression.idleHint}</AsyncMessage>
              ) : compressionState.status === "error" ? (
                <AsyncMessage tone="warning">{compressionState.error}</AsyncMessage>
              ) : compressionState.status === "success" ? (
                compressionState.data.exprText ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <StatPill
                        label={messages.playground.experiments.compression.afterLabel}
                        value={formatNumber(compressionState.data.candidateTokens ?? 0)}
                      />
                      <StatPill
                        label={messages.playground.experiments.compression.gainLabel}
                        value={formatSignedDelta(
                          (compressionState.data.candidateTokens ?? 0) -
                            compressionState.data.baselineTokens,
                        )}
                      />
                      <StatPill
                        label={messages.playground.experiments.compression.deltaLabel}
                        value={formatScientific(compressionState.data.delta ?? Number.NaN)}
                      />
                    </div>
                    <pre className="max-h-40 max-w-full overflow-auto rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 font-mono text-xs leading-6 text-[color:var(--ink)]">
                      {compressionState.data.exprText}
                    </pre>
                    <AsyncMessage tone="success">
                      {messages.playground.experiments.compression.success}
                    </AsyncMessage>
                  </>
                ) : (
                  <AsyncMessage>
                    {messages.playground.experiments.compression.noImprovement}
                  </AsyncMessage>
                )
              ) : null}
            </ExperimentShell>

            <ExperimentShell
              eyebrow={messages.playground.experiments.synthesis.eyebrow}
              title={messages.playground.experiments.synthesis.title}
              description={messages.playground.experiments.synthesis.description}
              icon={<LuGitBranch className="size-5" />}
            >
              <div className="flex flex-wrap gap-2">
                {messages.playground.experiments.synthesis.samples.map((sample) => (
                  <Button
                    key={sample.expr}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                    onClick={() => {
                      startTransition(() => {
                        setSynthTarget(sample.expr);
                      });
                    }}
                  >
                    {sample.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                  onClick={() => {
                    startTransition(() => {
                      setSynthTarget(expression);
                    });
                  }}
                >
                  {messages.playground.experiments.synthesis.useCurrent}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="synth-target" className="text-[color:var(--ink)]">
                  {messages.playground.experiments.synthesis.targetLabel}
                </Label>
                <Textarea
                  id="synth-target"
                  value={synthTarget}
                  onChange={(event) => setSynthTarget(event.target.value)}
                  className="min-h-24 resize-y rounded-[0.85rem] border-[color:var(--line)] bg-[color:var(--paper-strong)] font-mono text-sm leading-6"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[color:var(--ink)]">
                    {messages.playground.experiments.synthesis.maxLeavesLabel}
                  </Label>
                  <Select
                    value={String(synthMaxLeaves)}
                    onValueChange={(value) => setSynthMaxLeaves(Number(value))}
                  >
                    <SelectTrigger className="w-full min-w-0 rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYNTH_MAX_LEAF_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {String(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[color:var(--ink)]">
                    {messages.playground.experiments.synthesis.beamWidthLabel}
                  </Label>
                  <Select
                    value={String(synthBeamWidth)}
                    onValueChange={(value) => setSynthBeamWidth(Number(value))}
                  >
                    <SelectTrigger className="w-full min-w-0 rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYNTH_BEAM_WIDTH_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {String(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {synthTargetState.ok ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <StatPill
                    label={messages.playground.experiments.synthesis.targetTokensLabel}
                    value={formatNumber(synthTargetState.metrics.tokenCount)}
                  />
                  <StatPill
                    label={messages.playground.experiments.synthesis.variablesLabel}
                    value={synthTargetState.variables.join(", ") || "none"}
                  />
                </div>
              ) : (
                <AsyncMessage tone="warning">
                  {messages.playground.experiments.synthesis.invalidTarget({
                    detail: synthTargetState.error,
                  })}
                </AsyncMessage>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-[0.85rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                disabled={!synthTargetState.ok || synthesisState.status === "running"}
                onClick={() => {
                  void runSynthesisDemo();
                }}
              >
                <LuFlaskConical className="size-4" />
                {synthesisState.status === "running"
                  ? messages.playground.experiments.shared.running
                  : messages.playground.experiments.synthesis.runButton}
              </Button>

              {synthesisState.status === "idle" ? (
                <AsyncMessage>{messages.playground.experiments.synthesis.idleHint}</AsyncMessage>
              ) : synthesisState.status === "error" ? (
                <AsyncMessage tone="warning">{synthesisState.error}</AsyncMessage>
              ) : synthesisState.status === "success" ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <StatPill
                      label={messages.playground.experiments.synthesis.resultTokensLabel}
                      value={formatNumber(synthesisState.data.resultTokens)}
                    />
                    <StatPill
                      label={messages.playground.experiments.synthesis.leavesLabel}
                      value={formatNumber(synthesisState.data.leaves)}
                    />
                    <StatPill
                      label={messages.playground.experiments.synthesis.distanceLabel}
                      value={formatScientific(synthesisState.data.distance)}
                    />
                    <StatPill
                      label={messages.playground.experiments.synthesis.deltaLabel}
                      value={formatScientific(synthesisState.data.delta)}
                    />
                  </div>
                  <pre className="max-h-40 max-w-full overflow-auto rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 font-mono text-xs leading-6 text-[color:var(--ink)]">
                    {synthesisState.data.exprText}
                  </pre>
                  <AsyncMessage tone="success">
                    {messages.playground.experiments.synthesis.success}
                  </AsyncMessage>
                </>
              ) : null}
            </ExperimentShell>

            <ExperimentShell
              eyebrow={messages.playground.experiments.master.eyebrow}
              title={messages.playground.experiments.master.title}
              description={messages.playground.experiments.master.description}
              icon={<LuBrain className="size-5" />}
            >
              <div className="space-y-2">
                <Label className="text-[color:var(--ink)]">
                  {messages.playground.experiments.master.presetLabel}
                </Label>
                <Select
                  value={masterPresetId}
                  onValueChange={(value) => setMasterPresetId(value as MasterPresetId)}
                >
                  <SelectTrigger className="w-full min-w-0 rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exp">
                      {messages.playground.experiments.master.presets.exp}
                    </SelectItem>
                    <SelectItem value="eMinusX">
                      {messages.playground.experiments.master.presets.eMinusX}
                    </SelectItem>
                    <SelectItem value="ln">
                      {messages.playground.experiments.master.presets.ln}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4">
                <div className="text-sm font-semibold text-[color:var(--ink)]">
                  {masterPreset.expr}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {messages.playground.experiments.master.presetDescriptions[masterPresetId]}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <StatPill
                  label={messages.playground.experiments.master.depthLabel}
                  value={formatNumber(masterTree.depth)}
                />
                <StatPill
                  label={messages.playground.experiments.master.nodesLabel}
                  value={formatNumber(masterTree.nodeCount)}
                />
                <StatPill
                  label={messages.playground.experiments.master.paramsLabel}
                  value={formatNumber(masterTree.paramCount)}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-[0.85rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                disabled={masterState.status === "running"}
                onClick={() => {
                  void runMasterDemo();
                }}
              >
                <LuBrain className="size-4" />
                {masterState.status === "running"
                  ? messages.playground.experiments.shared.running
                  : messages.playground.experiments.master.runButton}
              </Button>

              {masterState.status === "idle" ? (
                <AsyncMessage>{messages.playground.experiments.master.idleHint}</AsyncMessage>
              ) : masterState.status === "error" ? (
                <AsyncMessage tone="warning">{masterState.error}</AsyncMessage>
              ) : masterState.status === "success" ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <StatPill
                      label={messages.playground.experiments.master.lossLabel}
                      value={formatScientific(masterState.data.loss)}
                    />
                    <StatPill
                      label={messages.playground.experiments.master.restartsLabel}
                      value={formatNumber(masterState.data.restarts)}
                    />
                    <StatPill
                      label={messages.playground.experiments.master.epochsLabel}
                      value={formatNumber(masterState.data.totalEpochs)}
                    />
                    <StatPill
                      label={messages.playground.experiments.master.statusLabel}
                      value={
                        masterState.data.success
                          ? messages.playground.experiments.master.statuses.success
                          : messages.playground.experiments.master.statuses.partial
                      }
                    />
                  </div>
                  {masterState.data.exprText ? (
                    <pre className="max-h-40 max-w-full overflow-auto rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 font-mono text-xs leading-6 text-[color:var(--ink)]">
                      {masterState.data.exprText}
                    </pre>
                  ) : null}
                  <AsyncMessage tone={masterState.data.success ? "success" : "muted"}>
                    {masterState.data.success
                      ? messages.playground.experiments.master.success
                      : messages.playground.experiments.master.partial}
                  </AsyncMessage>
                </>
              ) : null}
            </ExperimentShell>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PlaygroundStudio;
