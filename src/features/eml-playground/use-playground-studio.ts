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
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import {
  PURE_RENDER_LIMIT,
  type CompressionMode,
  type DiagramSource,
  type LayoutMode,
  type MasterPresetId,
} from "@/features/eml-playground/constants";
import { getTransformCopy } from "@/features/eml-playground/playground-i18n";
import { useD2Preview, usePreviewActivation } from "@/features/eml-playground/use-d2-preview";
import {
  type ExpressionTransform,
  useExpressionAnalysis,
} from "@/features/eml-playground/use-expression-analysis";
import {
  readPlaygroundUrlState,
  usePlaygroundUrlSync,
} from "@/features/eml-playground/use-playground-url-sync";
import {
  collectVariables,
  defaultValueForVariable,
  withTransparentD2Background,
} from "@/features/eml-playground/utils";
import { useI18n } from "@/i18n";

export type WorkspaceTab = "analyze" | "compare" | "experiments";
export type ExperimentTab = "compression" | "synthesis" | "master";

export type ResultView = {
  key: DiagramSource;
  transform: ExpressionTransform;
};

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "running" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

export type CompressionDemoResult = {
  level: CompressionMode;
  baselineTokens: number;
  candidateTokens: number | null;
  delta: number | null;
  exprText: string | null;
};

export type SynthesisDemoResult = {
  exprText: string;
  targetTokens: number;
  resultTokens: number;
  leaves: number;
  distance: number;
  delta: number;
};

export type MasterDemoResult = {
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

function waitForPaint() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 24);
  });
}

export function usePlaygroundStudio() {
  const { formatNumber, messages } = useI18n();
  const initialUrlStateRef = useRef<ReturnType<typeof readPlaygroundUrlState> | null>(null);

  if (initialUrlStateRef.current === null) {
    initialUrlStateRef.current = readPlaygroundUrlState();
  }

  const initialUrlState = initialUrlStateRef.current;
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(initialUrlState.workspaceTab);
  const [experimentTab, setExperimentTab] = useState<ExperimentTab>(initialUrlState.experimentTab);
  const [expression, setExpression] = useState(initialUrlState.expression);
  const [diagramSource, setDiagramSource] = useState<DiagramSource>(initialUrlState.diagramSource);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialUrlState.layoutMode);
  const [envValues, setEnvValues] = useState<Record<string, string>>(initialUrlState.envValues);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [compressionMode, setCompressionMode] = useState<CompressionMode>(
    initialUrlState.compressionMode,
  );
  const [compressionState, setCompressionState] = useState<AsyncState<CompressionDemoResult>>({
    status: "idle",
  });
  const [synthTarget, setSynthTarget] = useState(initialUrlState.synthTarget);
  const [synthMaxLeaves, setSynthMaxLeaves] = useState(initialUrlState.synthMaxLeaves);
  const [synthBeamWidth, setSynthBeamWidth] = useState(initialUrlState.synthBeamWidth);
  const [synthesisState, setSynthesisState] = useState<AsyncState<SynthesisDemoResult>>({
    status: "idle",
  });
  const [masterPresetId, setMasterPresetId] = useState<MasterPresetId>(
    initialUrlState.masterPresetId,
  );
  const [masterState, setMasterState] = useState<AsyncState<MasterDemoResult>>({
    status: "idle",
  });

  const analysisState = useExpressionAnalysis(expression, envValues);
  const previewActivation = usePreviewActivation<HTMLDivElement>();
  const masterPreset = MASTER_PRESETS[masterPresetId];
  const masterTree = useMemo(() => createMasterTree(masterPreset.depth), [masterPreset.depth]);
  const playgroundMessages = messages.playground;

  usePlaygroundUrlSync({
    state: {
      workspaceTab,
      experimentTab,
      expression,
      diagramSource,
      layoutMode,
      envValues,
      compressionMode,
      synthTarget,
      synthMaxLeaves,
      synthBeamWidth,
      masterPresetId,
    },
    applyState: (nextState) => {
      setWorkspaceTab((previous) =>
        previous === nextState.workspaceTab ? previous : nextState.workspaceTab,
      );
      setExperimentTab((previous) =>
        previous === nextState.experimentTab ? previous : nextState.experimentTab,
      );
      setExpression((previous) =>
        previous === nextState.expression ? previous : nextState.expression,
      );
      setDiagramSource((previous) =>
        previous === nextState.diagramSource ? previous : nextState.diagramSource,
      );
      setLayoutMode((previous) =>
        previous === nextState.layoutMode ? previous : nextState.layoutMode,
      );
      setEnvValues((previous) => {
        const previousJson = JSON.stringify(previous);
        const nextJson = JSON.stringify(nextState.envValues);
        return previousJson === nextJson ? previous : nextState.envValues;
      });
      setCompressionMode((previous) =>
        previous === nextState.compressionMode ? previous : nextState.compressionMode,
      );
      setSynthTarget((previous) =>
        previous === nextState.synthTarget ? previous : nextState.synthTarget,
      );
      setSynthMaxLeaves((previous) =>
        previous === nextState.synthMaxLeaves ? previous : nextState.synthMaxLeaves,
      );
      setSynthBeamWidth((previous) =>
        previous === nextState.synthBeamWidth ? previous : nextState.synthBeamWidth,
      );
      setMasterPresetId((previous) =>
        previous === nextState.masterPresetId ? previous : nextState.masterPresetId,
      );
    },
  });

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
        transform: analysisState.standard,
      },
      {
        key: "pure",
        transform: analysisState.pure,
      },
      {
        key: "shortest",
        transform: analysisState.shortest,
      },
      {
        key: "lifted",
        transform: analysisState.lifted,
      },
    ];
  }, [analysisState]);

  const selectedView =
    expressionViews.find((view) => view.key === diagramSource) ?? expressionViews[0];
  const previewMode = selectedView?.key === "pure" ? "pure" : "standard";

  const diagramPayload = useMemo(() => {
    if (!analysisState.ok || !selectedView) {
      return {
        canRender: false,
        reason: playgroundMessages.diagram.invalidExpressionReason,
        d2Source: "",
      };
    }

    const d2Source = withTransparentD2Background(exprToD2(selectedView.transform.expr));

    if (selectedView.transform.metrics.tokenCount > PURE_RENDER_LIMIT) {
      return {
        canRender: false,
        reason: playgroundMessages.diagram.renderLimitReason({
          label: getTransformCopy(playgroundMessages, selectedView.key).title,
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
  }, [analysisState, formatNumber, playgroundMessages, selectedView]);

  const d2Preview = useD2Preview({
    active: previewActivation.isActivated,
    canRender: diagramPayload.canRender,
    d2Source: diagramPayload.d2Source,
    diagramMode: previewMode ?? "standard",
    layoutMode,
  });

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
      const exprText = result ? toString(result.expr) : null;

      setCompressionState({
        status: "success",
        data: {
          level: compressionMode,
          baselineTokens: analysisState.pure.metrics.tokenCount,
          candidateTokens: result ? analyzeExpr(result.expr).tokenCount : null,
          delta: result?.delta ?? null,
          exprText,
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
      const result = synthesizePureEml(synthTargetState.expr, {
        maxLeaves: synthMaxLeaves,
        beamWidth: synthBeamWidth,
        variables: synthTargetState.variables,
      });

      if (!result) {
        setSynthesisState({
          status: "error",
          error: playgroundMessages.experiments.synthesis.noResult,
        });
        return;
      }

      const exprText = toString(result.expr);
      setSynthesisState({
        status: "success",
        data: {
          exprText,
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
      const exprText = result.expr ? toString(result.expr) : null;

      setMasterState({
        status: "success",
        data: {
          presetId: masterPresetId,
          success: result.success,
          loss: result.loss,
          restarts: result.restarts,
          totalEpochs: result.totalEpochs,
          exprText,
        },
      });
    } catch (error) {
      setMasterState({
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const applySampleExpression = (nextExpression: string) => {
    startTransition(() => {
      setExpression(nextExpression);
    });
  };

  const applySynthTarget = (nextTarget: string) => {
    startTransition(() => {
      setSynthTarget(nextTarget);
    });
  };

  return {
    workspaceTab,
    setWorkspaceTab,
    experimentTab,
    setExperimentTab,
    expression,
    setExpression,
    diagramSource,
    setDiagramSource,
    layoutMode,
    setLayoutMode,
    envValues,
    setEnvValues,
    copyState,
    compressionMode,
    setCompressionMode,
    compressionState,
    synthTarget,
    setSynthTarget,
    synthMaxLeaves,
    setSynthMaxLeaves,
    synthBeamWidth,
    setSynthBeamWidth,
    synthesisState,
    masterPresetId,
    setMasterPresetId,
    masterState,
    analysisState,
    previewActivation,
    masterPreset,
    masterTree,
    expressionViews,
    selectedView,
    diagramPayload,
    d2Preview,
    synthTargetState,
    handleCopyD2,
    runCompressionDemo,
    runSynthesisDemo,
    runMasterDemo,
    applySampleExpression,
    applySynthTarget,
  };
}

export type PlaygroundStudioState = ReturnType<typeof usePlaygroundStudio>;
