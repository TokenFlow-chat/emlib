import type { Expr } from "emlib";

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

export function defaultValueForVariable(name: string): string {
  if (name === "x") return "0.5";
  if (name === "y") return "2";
  if (name === "z") return "1";
  return "1";
}

export function parseEnvValue(raw: string | undefined, fallback: string): number {
  const parsed = Number(raw ?? fallback);
  return Number.isFinite(parsed) ? parsed : Number(fallback);
}

export function formatScalar(value: number): string {
  if (Math.abs(value) < 1e-10) return "0";
  const rounded = Number(value.toFixed(6));
  return String(rounded);
}

export function formatComplex(value: { re: number; im: number }): string {
  const re = Math.abs(value.re) < 1e-10 ? 0 : value.re;
  const im = Math.abs(value.im) < 1e-10 ? 0 : value.im;

  if (im === 0) return formatScalar(re);
  if (re === 0) {
    if (im === 1) return "i";
    if (im === -1) return "-i";
    return `${formatScalar(im)}i`;
  }

  const sign = im >= 0 ? "+" : "-";
  const absIm = Math.abs(im);
  const imag = absIm === 1 ? "i" : `${formatScalar(absIm)}i`;
  return `${formatScalar(re)} ${sign} ${imag}`;
}

export function metricDelta(a: { re: number; im: number }, b: { re: number; im: number }): number {
  return Math.hypot(a.re - b.re, a.im - b.im);
}

export function formatScientific(value: number): string {
  if (Number.isNaN(value)) return "NaN";
  if (!Number.isFinite(value)) return value > 0 ? "Infinity" : "-Infinity";
  if (Math.abs(value) < 1e-12) return "0";
  if (Math.abs(value) >= 1e4 || Math.abs(value) < 1e-3) return value.toExponential(3);
  return formatScalar(value);
}

export function formatSignedDelta(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}

export function formatTypeSet(types: string[], limit = 5): string {
  if (types.length <= limit) return types.join(", ");
  return `${types.slice(0, limit).join(", ")}, ...`;
}
