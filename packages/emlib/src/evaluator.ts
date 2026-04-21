import type { Expr } from "./ast";
import {
  approxAbs,
  approxAdd,
  approxArg,
  approxComplex,
  approxCos,
  approxDiv,
  approxExp,
  approxLog,
  approxMul,
  approxNeg,
  approxPow,
  approxSin,
  approxSub,
  approxSqrt,
  createApproxEvaluator,
  type ApproxComplex,
  type LosslessInput,
} from "./numeric";

export interface Complex extends ApproxComplex {}

export const C = approxComplex;
export const cAdd = approxAdd;
export const cSub = approxSub;
export const cMul = approxMul;
export const cDiv = approxDiv;
export const cNeg = approxNeg;
export const cAbs = approxAbs;
export const cArg = approxArg;
export const cExp = approxExp;
export const cLog = approxLog;
export const cPow = approxPow;
export const cSqrt = approxSqrt;
export const cSin = approxSin;
export const cCos = approxCos;

export function evaluate(expr: Expr, env: Record<string, Complex | number> = {}): Complex {
  const evaluateNode = createApproxEvaluator(env as Record<string, LosslessInput>);
  return evaluateNode(expr);
}

/** @deprecated Use `evaluate` directly. */
export const evaluateApprox = evaluate;
