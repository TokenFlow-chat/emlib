import {
  analyzeExpr,
  evaluate,
  evaluateLossless,
  losslessToString,
  parse,
  reduceTokens,
  simplifyToElementary,
  toPureEml,
  toString,
  type Expr,
} from "emlib";
import { useDeferredValue, useMemo } from "react";

import { collectVariables, defaultValueForVariable, parseEnvValue } from "./utils";

type Metrics = ReturnType<typeof analyzeExpr>;
type ComplexValue = ReturnType<typeof evaluate>;
type ExactValue = ReturnType<typeof evaluateLossless>;

export type ExpressionTransform = {
  expr: Expr;
  text: string;
  metrics: Metrics;
};

type SuccessfulStructureState = {
  ok: true;
  standard: ExpressionTransform;
  pure: ExpressionTransform;
  shortest: ExpressionTransform;
  lifted: ExpressionTransform;
  variables: string[];
};

type EvaluationSuccessState = {
  evaluationOk: true;
  standardValue: ComplexValue;
  pureValue: ComplexValue;
};

type EvaluationFailureState = {
  evaluationOk: false;
  evaluationError: string;
};

type ExactSuccessState = {
  exactOk: true;
  exactValue: ExactValue;
  exactValueText: string;
  exactKind: ExactValue["kind"];
};

type ExactFailureState = {
  exactOk: false;
  exactError: string;
};

type ExpressionStructureState =
  | {
      ok: false;
      error: string;
    }
  | SuccessfulStructureState;

export type ExpressionAnalysisState =
  | {
      ok: false;
      error: string;
    }
  | (SuccessfulStructureState & {
      env: Record<string, number>;
    } & (EvaluationSuccessState | EvaluationFailureState) &
      (ExactSuccessState | ExactFailureState));

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toTransform(expr: Expr): ExpressionTransform {
  return {
    expr,
    text: toString(expr),
    metrics: analyzeExpr(expr),
  };
}

function evaluateSafely(
  structureState: SuccessfulStructureState,
  env: Record<string, number>,
): EvaluationSuccessState | EvaluationFailureState {
  const errors: string[] = [];
  let standardValue: ComplexValue | null = null;
  let pureValue: ComplexValue | null = null;

  try {
    standardValue = evaluate(structureState.standard.expr, env);
  } catch (error) {
    errors.push(`Standard evaluation failed: ${toErrorMessage(error)}`);
  }

  try {
    pureValue = evaluate(structureState.pure.expr, env);
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

function evaluateExactly(
  structureState: SuccessfulStructureState,
  env: Record<string, number>,
): ExactSuccessState | ExactFailureState {
  try {
    const exactValue = evaluateLossless(structureState.standard.expr, env);
    return {
      exactOk: true,
      exactValue,
      exactValueText: losslessToString(exactValue),
      exactKind: exactValue.kind,
    };
  } catch (error) {
    return {
      exactOk: false,
      exactError: toErrorMessage(error),
    };
  }
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
      const shortestExpr = reduceTokens(standardExpr);
      const liftedExpr = simplifyToElementary(pureExpr);

      return {
        ok: true,
        standard: toTransform(standardExpr),
        pure: toTransform(pureExpr),
        shortest: toTransform(shortestExpr),
        lifted: toTransform(liftedExpr),
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
      ...evaluateExactly(structureState, env),
    };
  }, [envValues, structureState]);
}
