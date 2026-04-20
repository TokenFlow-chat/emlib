import {
  analyzeExpr,
  evaluate,
  parse,
  toPureEml,
  type Expr,
} from "emlib";
import { useDeferredValue, useMemo } from "react";

import {
  collectVariables,
  defaultValueForVariable,
  parseEnvValue,
} from "./utils";

type Metrics = ReturnType<typeof analyzeExpr>;
type ComplexValue = ReturnType<typeof evaluate>;

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
  | (Extract<ExpressionStructureState, { ok: true }> & {
      env: Record<string, number>;
      standardValue: ComplexValue;
      pureValue: ComplexValue;
    });

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
        error: error instanceof Error ? error.message : "Unknown parser error",
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
      standardValue: evaluate(structureState.standardExpr, env),
      pureValue: evaluate(structureState.pureExpr, env),
    };
  }, [envValues, structureState]);
}
