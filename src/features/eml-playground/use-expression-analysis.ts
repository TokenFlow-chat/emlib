import { analyzeExpr, evaluate, parse, toPureEml, type Expr } from "emlib";
import { useDeferredValue, useMemo } from "react";

import { collectVariables, defaultValueForVariable, parseEnvValue } from "./utils";

type Metrics = ReturnType<typeof analyzeExpr>;
type ComplexValue = ReturnType<typeof evaluate>;
type SuccessfulStructureState = Extract<ExpressionStructureState, { ok: true }>;
type EvaluationSuccessState = {
  evaluationOk: true;
  standardValue: ComplexValue;
  pureValue: ComplexValue;
};
type EvaluationFailureState = {
  evaluationOk: false;
  evaluationError: string;
};

type ExpressionStructureState =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      standardExpr: Expr;
      pureExpr: Expr;
      standardMetrics: Metrics;
      pureMetrics: Metrics;
      variables: string[];
    };

export type ExpressionAnalysisState =
  | {
      ok: false;
      error: string;
    }
  | (SuccessfulStructureState & {
      env: Record<string, number>;
    } & (EvaluationSuccessState | EvaluationFailureState));

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function evaluateSafely(
  structureState: SuccessfulStructureState,
  env: Record<string, number>,
): EvaluationSuccessState | EvaluationFailureState {
  const errors: string[] = [];
  let standardValue: ComplexValue | null = null;
  let pureValue: ComplexValue | null = null;

  try {
    standardValue = evaluate(structureState.standardExpr, env);
  } catch (error) {
    errors.push(`Standard evaluation failed: ${toErrorMessage(error)}`);
  }

  try {
    pureValue = evaluate(structureState.pureExpr, env);
  } catch (error) {
    errors.push(`Pure EML evaluation failed: ${toErrorMessage(error)}`);
  }

  if (errors.length > 0 || standardValue === null || pureValue === null) {
    return {
      evaluationOk: false,
      evaluationError: errors.join(" "),
    };
  }

  return {
    evaluationOk: true,
    standardValue,
    pureValue,
  };
}

export function useExpressionAnalysis(
  expression: string,
  envValues: Record<string, string>,
): ExpressionAnalysisState {
  const deferredExpression = useDeferredValue(expression);

  const structureState = useMemo<ExpressionStructureState>(() => {
    try {
      const standardExpr = parse(deferredExpression);
      const pureExpr = toPureEml(standardExpr);

      return {
        ok: true,
        standardExpr,
        pureExpr,
        standardMetrics: analyzeExpr(standardExpr),
        pureMetrics: analyzeExpr(pureExpr),
        variables: collectVariables(standardExpr),
      };
    } catch (error) {
      return {
        ok: false,
        error: toErrorMessage(error),
      };
    }
  }, [deferredExpression]);

  return useMemo<ExpressionAnalysisState>(() => {
    if (!structureState.ok) return structureState;

    const env = Object.fromEntries(
      structureState.variables.map((name) => [
        name,
        parseEnvValue(envValues[name], defaultValueForVariable(name)),
      ]),
    );

    return {
      ...structureState,
      env,
      ...evaluateSafely(structureState, env),
    };
  }, [envValues, structureState]);
}
