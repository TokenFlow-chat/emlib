import type { Expr } from "./ast";
import { isNumericValue } from "./ast";
import { desugarElementary } from "./elementary";
import {
  createLosslessEvaluator,
  losslessToApprox,
  type ApproxComplex,
  type LosslessInput,
  type LosslessValue,
} from "./numeric";

export interface Complex extends ApproxComplex {}

export const C = (re: number, im = 0): Complex => ({ re, im });

export function cAdd(a: Complex, b: Complex): Complex {
  return C(a.re + b.re, a.im + b.im);
}
export function cSub(a: Complex, b: Complex): Complex {
  return C(a.re - b.re, a.im - b.im);
}
export function cMul(a: Complex, b: Complex): Complex {
  return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}
export function cDiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
export function cNeg(a: Complex): Complex {
  return C(-a.re, -a.im);
}
export function cAbs(a: Complex): number {
  return Math.hypot(a.re, a.im);
}
export function cArg(a: Complex): number {
  return Math.atan2(a.im, a.re);
}
export function cExp(a: Complex): Complex {
  const er = Math.exp(a.re);
  return C(er * Math.cos(a.im), er * Math.sin(a.im));
}
export function cLog(a: Complex): Complex {
  return C(Math.log(cAbs(a)), cArg(a));
}
export function cPow(a: Complex, b: Complex): Complex {
  return cExp(cMul(cLog(a), b));
}
export function cSqrt(a: Complex): Complex {
  return cPow(a, C(0.5));
}
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
  return expr.kind === "eml" && isOneExpr(expr.right) ? expr.left : null;
}

function matchEmlLn(expr: Expr): Expr | null {
  if (
    expr.kind === "eml" &&
    isOneExpr(expr.left) &&
    expr.right.kind === "eml" &&
    expr.right.left.kind === "eml" &&
    isOneExpr(expr.right.left.left) &&
    isOneExpr(expr.right.right)
  ) {
    return expr.right.left.right;
  }
  return null;
}

function matchEmlSub(expr: Expr): { left: Expr; right: Expr } | null {
  if (expr.kind !== "eml") return null;
  const left = matchEmlLn(expr.left);
  const right = matchEmlExp(expr.right);
  return left && right ? { left, right } : null;
}

function toApprox(value: LosslessValue): Complex | null {
  if (value.kind === "symbolic") return null;
  const approx = losslessToApprox(value);
  return C(approx.re, approx.im);
}

export function evaluateApprox(expr: Expr, env: Record<string, Complex | number> = {}): Complex {
  const losslessEnv = env as Record<string, LosslessInput>;
  const evaluateLosslessNode = createLosslessEvaluator(losslessEnv);
  const approxMemo = new WeakMap<Expr, Complex>();

  const evaluateNode = (node: Expr): Complex => {
    const cached = approxMemo.get(node);
    if (cached) return cached;

    const exact = toApprox(evaluateLosslessNode(node));
    if (exact) {
      approxMemo.set(node, exact);
      return exact;
    }

    let result: Complex;
    switch (node.kind) {
      case "num":
        result = C(node.value);
        break;
      case "var": {
        const v = env[node.name];
        if (v === undefined) throw new Error(`Missing variable ${node.name}`);
        result = typeof v === "number" ? C(v) : v;
        break;
      }
      case "const":
        if (node.name === "e") result = C(Math.E);
        else if (node.name === "pi") result = C(Math.PI);
        else result = C(0, 1);
        break;
      case "neg":
        result = cNeg(evaluateNode(node.value));
        break;
      case "add":
        result = cAdd(evaluateNode(node.left), evaluateNode(node.right));
        break;
      case "sub":
        result = cSub(evaluateNode(node.left), evaluateNode(node.right));
        break;
      case "mul":
        result = cMul(evaluateNode(node.left), evaluateNode(node.right));
        break;
      case "div":
        result = cDiv(evaluateNode(node.left), evaluateNode(node.right));
        break;
      case "pow":
        result = cPow(evaluateNode(node.left), evaluateNode(node.right));
        break;
      case "exp":
        result = cExp(evaluateNode(node.value));
        break;
      case "ln":
        result = cLog(evaluateNode(node.value));
        break;
      case "sqrt":
        result = cSqrt(evaluateNode(node.value));
        break;
      case "sin":
        result = cSin(evaluateNode(node.value));
        break;
      case "cos":
        result = cCos(evaluateNode(node.value));
        break;
      case "tan":
      case "cot":
      case "sec":
      case "csc":
      case "sinh":
      case "cosh":
      case "tanh":
      case "coth":
      case "sech":
      case "csch":
      case "asin":
      case "acos":
      case "atan":
      case "asec":
      case "acsc":
      case "acot":
      case "asinh":
      case "acosh":
      case "atanh":
        result = evaluateNode(desugarElementary(node));
        break;
      case "eml": {
        const expArg = matchEmlExp(node);
        if (expArg) {
          result = cExp(evaluateNode(expArg));
          break;
        }

        const logArg = matchEmlLn(node);
        if (logArg) {
          result = cLog(evaluateNode(logArg));
          break;
        }

        const subArgs = matchEmlSub(node);
        if (subArgs) {
          result = cSub(evaluateNode(subArgs.left), evaluateNode(subArgs.right));
          break;
        }

        result = cSub(cExp(evaluateNode(node.left)), cLog(evaluateNode(node.right)));
        break;
      }
    }

    approxMemo.set(node, result);
    return result;
  };

  return evaluateNode(expr);
}

export function evaluate(expr: Expr, env: Record<string, Complex | number> = {}): Complex {
  return evaluateApprox(expr, env);
}
