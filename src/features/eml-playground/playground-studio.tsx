import { startTransition, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calculator,
  Check,
  Copy,
} from "lucide-react";
import {
  exprToD2,
  toString,
} from "emlib";

import {
  DEFAULT_EXPRESSION,
  PURE_RENDER_LIMIT,
  sampleExpressions,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function MetricCard({
  title,
  tokenCount,
  typeCount,
}: {
  title: string;
  tokenCount: number;
  typeCount: number;
}) {
  return (
    <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
      <div className="stat-label">{title}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-3xl font-semibold text-[color:var(--ink)]">
            {tokenCount}
          </div>
          <div className="text-sm text-[color:var(--ink-soft)]">
            tokens / nodes
          </div>
        </div>
        <div>
          <div className="text-3xl font-semibold text-[color:var(--ink)]">
            {typeCount}
          </div>
          <div className="text-sm text-[color:var(--ink-soft)]">
            operator types
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlaygroundStudio() {
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [diagramMode, setDiagramMode] = useState<DiagramMode>("pure");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("dagre");
  const [envValues, setEnvValues] = useState<Record<string, string>>({
    x: "0.5",
    y: "2",
  });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

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
        reason: "修正表达式后即可恢复图渲染。",
        d2Source: "",
      };
    }

    const activeExpr =
      diagramMode === "pure" ? analysisState.pureExpr : analysisState.standardExpr;
    const activeMetrics =
      diagramMode === "pure"
        ? analysisState.pureMetrics
        : analysisState.standardMetrics;
    const d2Source = withTransparentD2Background(exprToD2(activeExpr));

    if (diagramMode === "pure" && activeMetrics.tokenCount > PURE_RENDER_LIMIT) {
      return {
        canRender: false,
        reason: `当前纯 EML 树有 ${activeMetrics.tokenCount} 个节点，超过前端预览阈值 ${PURE_RENDER_LIMIT}。可切回 Standard Tree 查看结构。`,
        d2Source,
      };
    }

    return {
      canRender: true,
      reason: null,
      d2Source,
    };
  }, [analysisState, diagramMode]);

  const d2Preview = useD2Preview({
    active: previewActivation.isActivated,
    canRender: diagramPayload.canRender,
    d2Source: diagramPayload.d2Source,
    diagramMode,
    layoutMode,
  });

  const consistencyDelta = analysisState.ok
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
    <Card
      className="paper-card border-[color:var(--line-strong)] py-5 sm:py-6"
      id="playground"
    >
      <CardHeader className="gap-3 border-b border-[color:var(--line)]/70 px-5 pb-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
            Interactive Reduction Studio
          </div>
          <div className="text-[11px] text-[color:var(--ink-soft)]">
            parse · lower · verify · render
          </div>
        </div>
        <CardTitle className="font-display text-3xl text-[color:var(--ink)]">
          在线 Playground
        </CardTitle>
        <CardDescription className="max-w-full leading-7 text-[color:var(--ink-soft)]">
          输入一个标准表达式，页面会实时完成 parsing、pure EML lowering、复杂度分析、数值一致性校验，并把结构导出为 D2 SVG。
        </CardDescription>
      </CardHeader>

      <CardContent className="grid items-start gap-4 px-5 pt-0 sm:px-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] xl:gap-5">
        <div className="min-w-0 space-y-3.5">
          <div className="rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              {sampleExpressions.map((sample) => (
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
              <Label
                htmlFor="expression-input"
                className="text-[color:var(--ink)]"
              >
                输入表达式
              </Label>
              <Textarea
                id="expression-input"
                value={expression}
                onChange={(event) => setExpression(event.target.value)}
                className="min-h-28 resize-y rounded-[0.9rem] border-[color:var(--line)] bg-white/88 font-mono text-sm leading-6"
                placeholder="例如: exp(x) - ln(y)"
              />
              <p className="text-xs leading-5 text-[color:var(--ink-soft)]">
                支持 <code>+ - * / ^</code>、<code>exp</code>、<code>ln</code>、
                <code>sqrt</code>、三角/双曲函数以及 <code>e / pi / i</code>。
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4">
              <Label className="text-[color:var(--ink)]">图模式</Label>
              <Select
                value={diagramMode}
                onValueChange={(value) => setDiagramMode(value as DiagramMode)}
              >
                <SelectTrigger className="mt-3 w-full min-w-0 rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Tree</SelectItem>
                  <SelectItem value="pure">Pure EML Tree</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4">
              <Label className="text-[color:var(--ink)]">D2 Layout</Label>
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
                <Calculator className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-[color:var(--ink)]">
                  变量取值
                </div>
                <p className="text-sm text-[color:var(--ink-soft)]">
                  只用于数值校验，不影响结构图。
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {analysisState.ok && analysisState.variables.length > 0 ? (
                analysisState.variables.map((name) => (
                  <div key={name} className="min-w-0 space-y-2">
                    <Label
                      htmlFor={`var-${name}`}
                      className="text-[color:var(--ink)]"
                    >
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
                  当前表达式没有自由变量。
                </div>
              )}
            </div>
          </div>

          {analysisState.ok ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <MetricCard
                  title="Standard"
                  tokenCount={analysisState.standardMetrics.tokenCount}
                  typeCount={analysisState.standardMetrics.typeCount}
                />
                <MetricCard
                  title="Pure EML"
                  tokenCount={analysisState.pureMetrics.tokenCount}
                  typeCount={analysisState.pureMetrics.typeCount}
                />
              </div>

              <div className="grid gap-3">
                <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.15em] text-[color:var(--ink-soft)] uppercase">
                    <span>Lowering Result</span>
                    <ArrowRight className="size-4" />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-[0.14em] text-[color:var(--ink-soft)] uppercase">
                        Standard Expression
                      </div>
                      <pre className="mt-2 max-w-full overflow-x-auto rounded-[0.8rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 font-mono text-xs leading-6 text-[color:var(--ink)]">
                        {toString(analysisState.standardExpr)}
                      </pre>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-[0.14em] text-[color:var(--ink-soft)] uppercase">
                        Pure EML Expression
                      </div>
                      <pre className="mt-2 max-h-52 max-w-full overflow-auto rounded-[0.8rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 font-mono text-xs leading-6 text-[color:var(--ink)]">
                        {toString(analysisState.pureExpr)}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
                  <div className="text-xs font-semibold tracking-[0.14em] text-[color:var(--ink-soft)] uppercase">
                    Numeric Consistency Check
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-[color:var(--ink-soft)]">
                        Standard Value
                      </div>
                      <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                        {formatComplex(analysisState.standardValue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[color:var(--ink-soft)]">
                        Pure EML Value
                      </div>
                      <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                        {formatComplex(analysisState.pureValue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[color:var(--ink-soft)]">
                        |delta|
                      </div>
                      <div className="mt-2 font-mono text-sm leading-6 text-[color:var(--ink)]">
                        {consistencyDelta.toExponential(3)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[0.95rem] border border-[color:var(--warning-line)] bg-[color:var(--warning-bg)] p-5 text-sm leading-6 text-[color:var(--warning-ink)]">
              表达式暂时无法解析: {analysisState.error}
            </div>
          )}
        </div>

        <div
          ref={previewActivation.ref}
          className="min-w-0 space-y-3.5 xl:sticky xl:top-6"
        >
          <div className="diagram-shell">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4">
              <div>
                <div className="text-xs font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
                  SVG Preview
                </div>
                <div className="mt-1 font-display text-2xl text-[color:var(--ink)]">
                  {diagramMode === "pure"
                    ? "Pure EML Tree"
                    : "Standard Expression Tree"}
                </div>
              </div>
              <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1 text-xs font-semibold text-[color:var(--ink-soft)]">
                D2 / {layoutMode}
              </div>
            </div>

            <div className="diagram-canvas">
              {!previewActivation.isActivated && diagramPayload.canRender ? (
                <div className="rounded-[0.9rem] border border-dashed border-[color:var(--line)] bg-white/72 p-5 text-sm leading-6 text-[color:var(--ink-soft)]">
                  预览区接近视口后才会异步加载 D2 运行时，避免把首屏 JS 包得过大。
                </div>
              ) : diagramPayload.reason ? (
                <div className="rounded-[0.9rem] border border-dashed border-[color:var(--line)] bg-white/72 p-5 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {diagramPayload.reason}
                </div>
              ) : d2Preview.renderError ? (
                <div className="rounded-[0.9rem] border border-dashed border-[color:var(--line)] bg-white/72 p-5 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {d2Preview.renderError}
                </div>
              ) : d2Preview.isRendering ? (
                <div className="rounded-[0.9rem] border border-[color:var(--line)] bg-white/72 px-5 py-6 text-sm text-[color:var(--ink-soft)]">
                  正在异步加载 D2 并生成 SVG...
                </div>
              ) : d2Preview.svgMarkup ? (
                <div className="d2-viewport rounded-[0.9rem] border border-[color:var(--line)]">
                  <div
                    aria-label={`${diagramMode === "pure" ? "Pure EML" : "Standard"} diagram preview`}
                    className="d2-inline-svg"
                    dangerouslySetInnerHTML={{ __html: d2Preview.svgMarkup }}
                  />
                </div>
              ) : (
                <div className="rounded-[0.9rem] border border-dashed border-[color:var(--line)] bg-white/72 px-5 py-6 text-sm text-[color:var(--ink-soft)]">
                  输入表达式后会在这里显示 SVG 结构图。
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-[1rem] border border-[color:var(--line)] bg-white/78 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
                D2 Source
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
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy"}
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
              这个 D2 文本由 <code>exprToD2</code> 生成，节点按 function /
              variable / constant 三类可视化。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PlaygroundStudio;
