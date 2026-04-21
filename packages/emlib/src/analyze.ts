import type { Expr } from "./ast";
import { isBinaryExpr, isUnaryExpr } from "./ast";
import { toString } from "./print";

const exprKeyCache = new WeakMap<Expr, string>();
const tokenCountCache = new WeakMap<Expr, number>();
const typeCountCache = new WeakMap<Expr, number>();
const containsVariableCache = new WeakMap<Expr, boolean>();
const containsEmlCache = new WeakMap<Expr, boolean>();

export interface ExprAnalysis {
  tokenCount: number;
  typeCount: number;
  types: string[];
}

function collectTypes(expr: Expr, out = new Set<string>()): Set<string> {
  if (expr.kind !== "var") {
    out.add(expr.kind === "const" ? `const:${expr.name}` : expr.kind);
  }
  switch (expr.kind) {
    case "eml":
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
      collectTypes(expr.left, out);
      collectTypes(expr.right, out);
      break;
    case "neg":
    case "exp":
    case "ln":
    case "sqrt":
    case "sin":
    case "cos":
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
      collectTypes(expr.value, out);
      break;
    default:
      break;
  }
  return out;
}

export function countTokens(expr: Expr): number {
  const cached = tokenCountCache.get(expr);
  if (cached !== undefined) return cached;
  let result: number;
  switch (expr.kind) {
    case "num":
    case "var":
    case "const":
      result = 1;
      break;
    case "eml":
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
      result = 1 + countTokens(expr.left) + countTokens(expr.right);
      break;
    default:
      result = 1 + countTokens(expr.value);
  }
  tokenCountCache.set(expr, result);
  return result;
}

export function countTypes(expr: Expr): number {
  const cached = typeCountCache.get(expr);
  if (cached !== undefined) return cached;
  const result = collectTypes(expr).size;
  typeCountCache.set(expr, result);
  return result;
}

export function analyzeExpr(expr: Expr): ExprAnalysis {
  const types = [...collectTypes(expr)].sort();
  return {
    tokenCount: countTokens(expr),
    typeCount: types.length,
    types,
  };
}

export function exprKey(expr: Expr): string {
  const cached = exprKeyCache.get(expr);
  if (cached !== undefined) return cached;
  const key = toString(expr);
  exprKeyCache.set(expr, key);
  return key;
}

export function collectVariables(expr: Expr, out = new Set<string>()): string[] {
  switch (expr.kind) {
    case "var":
      out.add(expr.name);
      break;
    case "eml":
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
      collectVariables(expr.left, out);
      collectVariables(expr.right, out);
      break;
    case "neg":
    case "exp":
    case "ln":
    case "sqrt":
    case "sin":
    case "cos":
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
      collectVariables(expr.value, out);
      break;
    default:
      break;
  }
  return [...out].sort();
}

export function containsVariable(expr: Expr): boolean {
  const cached = containsVariableCache.get(expr);
  if (cached !== undefined) return cached;

  const value =
    expr.kind === "var" ||
    (isBinaryExpr(expr)
      ? containsVariable(expr.left) || containsVariable(expr.right)
      : isUnaryExpr(expr)
        ? containsVariable(expr.value)
        : false);
  containsVariableCache.set(expr, value);
  return value;
}

export function containsEml(expr: Expr): boolean {
  const cached = containsEmlCache.get(expr);
  if (cached !== undefined) return cached;

  const value =
    expr.kind === "eml" ||
    (isBinaryExpr(expr)
      ? containsEml(expr.left) || containsEml(expr.right)
      : isUnaryExpr(expr)
        ? containsEml(expr.value)
        : false);
  containsEmlCache.set(expr, value);
  return value;
}
