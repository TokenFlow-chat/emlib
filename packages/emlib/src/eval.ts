import type { Expr } from './ast';
import { isNumericValue } from './ast';
import { desugarElementary } from './elementary';
import { evaluateLossless, losslessToApprox, type ApproxComplex, type LosslessInput, type LosslessValue } from './numeric';

export interface Complex extends ApproxComplex {}

export const C = (re: number, im = 0): Complex => ({ re, im });

export function cAdd(a: Complex, b: Complex): Complex { return C(a.re + b.re, a.im + b.im); }
export function cSub(a: Complex, b: Complex): Complex { return C(a.re - b.re, a.im - b.im); }
export function cMul(a: Complex, b: Complex): Complex {
  return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}
export function cDiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
export function cNeg(a: Complex): Complex { return C(-a.re, -a.im); }
export function cAbs(a: Complex): number { return Math.hypot(a.re, a.im); }
export function cArg(a: Complex): number { return Math.atan2(a.im, a.re); }
export function cExp(a: Complex): Complex {
  const er = Math.exp(a.re);
  return C(er * Math.cos(a.im), er * Math.sin(a.im));
}
export function cLog(a: Complex): Complex {
  return C(Math.log(cAbs(a)), cArg(a));
}
export function cPow(a: Complex, b: Complex): Complex { return cExp(cMul(cLog(a), b)); }
export function cSqrt(a: Complex): Complex { return cPow(a, C(0.5)); }
export function cSin(a: Complex): Complex {
  return C(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
}
export function cCos(a: Complex): Complex {
  return C(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
}

function isOneExpr(expr: Expr): boolean {
  return isNumericValue(expr, 1);
}

function matchEmlExp(expr: Expr): Expr | null {
  return expr.kind === 'eml' && isOneExpr(expr.right) ? expr.left : null;
}

function matchEmlLn(expr: Expr): Expr | null {
  if (
    expr.kind === 'eml' &&
    isOneExpr(expr.left) &&
    expr.right.kind === 'eml' &&
    expr.right.left.kind === 'eml' &&
    isOneExpr(expr.right.left.left) &&
    isOneExpr(expr.right.right)
  ) {
    return expr.right.left.right;
  }
  return null;
}

function matchEmlSub(expr: Expr): { left: Expr; right: Expr } | null {
  if (expr.kind !== 'eml') return null;
  const left = matchEmlLn(expr.left);
  const right = matchEmlExp(expr.right);
  return left && right ? { left, right } : null;
}

function toApprox(value: LosslessValue): Complex | null {
  if (value.kind === 'symbolic') return null;
  return C(losslessToApprox(value).re, losslessToApprox(value).im);
}

export function evaluateApprox(expr: Expr, env: Record<string, Complex | number> = {}): Complex {
  const lossless = evaluateLossless(expr, env as Record<string, LosslessInput>);
  const exact = toApprox(lossless);
  if (exact) return exact;

  switch (expr.kind) {
    case 'num': return C(expr.value);
    case 'var': {
      const v = env[expr.name];
      if (v === undefined) throw new Error(`Missing variable ${expr.name}`);
      return typeof v === 'number' ? C(v) : v;
    }
    case 'const':
      if (expr.name === 'e') return C(Math.E);
      if (expr.name === 'pi') return C(Math.PI);
      return C(0, 1);
    case 'neg': return cNeg(evaluateApprox(expr.value, env));
    case 'add': return cAdd(evaluateApprox(expr.left, env), evaluateApprox(expr.right, env));
    case 'sub': return cSub(evaluateApprox(expr.left, env), evaluateApprox(expr.right, env));
    case 'mul': return cMul(evaluateApprox(expr.left, env), evaluateApprox(expr.right, env));
    case 'div': return cDiv(evaluateApprox(expr.left, env), evaluateApprox(expr.right, env));
    case 'pow': return cPow(evaluateApprox(expr.left, env), evaluateApprox(expr.right, env));
    case 'exp': return cExp(evaluateApprox(expr.value, env));
    case 'ln': return cLog(evaluateApprox(expr.value, env));
    case 'sqrt': return cSqrt(evaluateApprox(expr.value, env));
    case 'sin': return cSin(evaluateApprox(expr.value, env));
    case 'cos': return cCos(evaluateApprox(expr.value, env));
    case 'tan':
    case 'cot':
    case 'sec':
    case 'csc':
    case 'sinh':
    case 'cosh':
    case 'tanh':
    case 'coth':
    case 'sech':
    case 'csch':
    case 'asin':
    case 'acos':
    case 'atan':
    case 'asec':
    case 'acsc':
    case 'acot':
    case 'asinh':
    case 'acosh':
    case 'atanh':
      return evaluateApprox(desugarElementary(expr), env);
    case 'eml': {
      const expArg = matchEmlExp(expr);
      if (expArg) return cExp(evaluateApprox(expArg, env));

      const logArg = matchEmlLn(expr);
      if (logArg) return cLog(evaluateApprox(logArg, env));

      const subArgs = matchEmlSub(expr);
      if (subArgs) {
        return cSub(evaluateApprox(subArgs.left, env), evaluateApprox(subArgs.right, env));
      }

      return cSub(cExp(evaluateApprox(expr.left, env)), cLog(evaluateApprox(expr.right, env)));
    }
  }
}

export function evaluate(expr: Expr, env: Record<string, Complex | number> = {}): Complex {
  return evaluateApprox(expr, env);
}
