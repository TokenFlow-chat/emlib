export type NumExpr = { kind: "num"; value: number; raw: string };
export type VarExpr = { kind: "var"; name: string };
export type ConstExpr = { kind: "const"; name: "e" | "pi" | "i" };
export type UnaryExpr =
  | { kind: "neg"; value: Expr }
  | { kind: "exp"; value: Expr }
  | { kind: "ln"; value: Expr }
  | { kind: "sqrt"; value: Expr }
  | { kind: "sin"; value: Expr }
  | { kind: "cos"; value: Expr }
  | { kind: "tan"; value: Expr }
  | { kind: "cot"; value: Expr }
  | { kind: "sec"; value: Expr }
  | { kind: "csc"; value: Expr }
  | { kind: "sinh"; value: Expr }
  | { kind: "cosh"; value: Expr }
  | { kind: "tanh"; value: Expr }
  | { kind: "coth"; value: Expr }
  | { kind: "sech"; value: Expr }
  | { kind: "csch"; value: Expr }
  | { kind: "asin"; value: Expr }
  | { kind: "acos"; value: Expr }
  | { kind: "atan"; value: Expr }
  | { kind: "asec"; value: Expr }
  | { kind: "acsc"; value: Expr }
  | { kind: "acot"; value: Expr }
  | { kind: "asinh"; value: Expr }
  | { kind: "acosh"; value: Expr }
  | { kind: "atanh"; value: Expr };

export type BinaryExpr =
  | { kind: "eml"; left: Expr; right: Expr }
  | { kind: "add"; left: Expr; right: Expr }
  | { kind: "sub"; left: Expr; right: Expr }
  | { kind: "mul"; left: Expr; right: Expr }
  | { kind: "div"; left: Expr; right: Expr }
  | { kind: "pow"; left: Expr; right: Expr };

export type Expr = NumExpr | VarExpr | ConstExpr | UnaryExpr | BinaryExpr;

function canonicalizeRaw(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "0";
  if (trimmed.startsWith("+")) return canonicalizeRaw(trimmed.slice(1));
  return trimmed;
}

export function num(value: number | string | bigint): NumExpr {
  const raw = typeof value === "number" ? String(value) : String(value);
  return { kind: "num", value: Number(raw), raw: canonicalizeRaw(raw) };
}

export const variable = (name: string): VarExpr => ({ kind: "var", name });
export const constant = (name: "e" | "pi" | "i"): ConstExpr => ({ kind: "const", name });
export const eml = (left: Expr, right: Expr): BinaryExpr => ({ kind: "eml", left, right });
export const add = (left: Expr, right: Expr): BinaryExpr => ({ kind: "add", left, right });
export const sub = (left: Expr, right: Expr): BinaryExpr => ({ kind: "sub", left, right });
export const mul = (left: Expr, right: Expr): BinaryExpr => ({ kind: "mul", left, right });
export const div = (left: Expr, right: Expr): BinaryExpr => ({ kind: "div", left, right });
export const pow = (left: Expr, right: Expr): BinaryExpr => ({ kind: "pow", left, right });
export const neg = (value: Expr): UnaryExpr => ({ kind: "neg", value });
export const exp = (value: Expr): UnaryExpr => ({ kind: "exp", value });
export const ln = (value: Expr): UnaryExpr => ({ kind: "ln", value });
export const sqrt = (value: Expr): UnaryExpr => ({ kind: "sqrt", value });
export const sin = (value: Expr): UnaryExpr => ({ kind: "sin", value });
export const cos = (value: Expr): UnaryExpr => ({ kind: "cos", value });
export const tan = (value: Expr): UnaryExpr => ({ kind: "tan", value });
export const cot = (value: Expr): UnaryExpr => ({ kind: "cot", value });
export const sec = (value: Expr): UnaryExpr => ({ kind: "sec", value });
export const csc = (value: Expr): UnaryExpr => ({ kind: "csc", value });
export const sinh = (value: Expr): UnaryExpr => ({ kind: "sinh", value });
export const cosh = (value: Expr): UnaryExpr => ({ kind: "cosh", value });
export const tanh = (value: Expr): UnaryExpr => ({ kind: "tanh", value });
export const coth = (value: Expr): UnaryExpr => ({ kind: "coth", value });
export const sech = (value: Expr): UnaryExpr => ({ kind: "sech", value });
export const csch = (value: Expr): UnaryExpr => ({ kind: "csch", value });
export const asin = (value: Expr): UnaryExpr => ({ kind: "asin", value });
export const acos = (value: Expr): UnaryExpr => ({ kind: "acos", value });
export const atan = (value: Expr): UnaryExpr => ({ kind: "atan", value });
export const asec = (value: Expr): UnaryExpr => ({ kind: "asec", value });
export const acsc = (value: Expr): UnaryExpr => ({ kind: "acsc", value });
export const acot = (value: Expr): UnaryExpr => ({ kind: "acot", value });
export const asinh = (value: Expr): UnaryExpr => ({ kind: "asinh", value });
export const acosh = (value: Expr): UnaryExpr => ({ kind: "acosh", value });
export const atanh = (value: Expr): UnaryExpr => ({ kind: "atanh", value });

export function rawNumber(expr: NumExpr): string {
  return expr.raw;
}

export function isNumericValue(expr: Expr, target: number): boolean {
  return expr.kind === "num" && expr.value === target;
}

export function isZero(expr: Expr): boolean {
  return isNumericValue(expr, 0);
}

export function isOne(expr: Expr): boolean {
  return isNumericValue(expr, 1);
}

export function isNegativeOne(expr: Expr): boolean {
  return isNumericValue(expr, -1);
}

export function isBinaryExpr(expr: Expr): expr is BinaryExpr {
  return typeof expr === "object" && expr !== null && "left" in expr && "right" in expr;
}

export function isUnaryExpr(expr: Expr): expr is UnaryExpr {
  return typeof expr === "object" && expr !== null && "value" in expr && !("raw" in expr);
}

export function rewriteChildren(expr: Expr, fn: (expr: Expr) => Expr): Expr {
  if (isBinaryExpr(expr)) {
    const left = fn(expr.left);
    const right = fn(expr.right);
    return left === expr.left && right === expr.right ? expr : ({ ...expr, left, right } as Expr);
  }
  if (isUnaryExpr(expr)) {
    const value = fn(expr.value);
    return value === expr.value ? expr : ({ ...expr, value } as Expr);
  }
  return expr;
}

/** @deprecated Use {@link rewriteChildren} for reference-equality optimization. */
export const mapChildren = rewriteChildren;

export function exprEquals(a: Expr, b: Expr): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function clone(expr: Expr): Expr {
  return JSON.parse(JSON.stringify(expr)) as Expr;
}
