import type { Expr } from "./ast";
import { add, constant, div, exp, exprEquals, ln, mul, neg, num, pow, sqrt, sub } from "./ast";

export interface Rational {
  num: bigint;
  den: bigint;
}

export interface ComplexRational {
  kind: "complex-rational";
  re: Rational;
  im: Rational;
}

export interface SymbolicValue {
  kind: "symbolic";
  expr: Expr;
}

export type LosslessValue = ComplexRational | SymbolicValue;

export interface ApproxComplex {
  re: number;
  im: number;
}

export type LosslessInput =
  | LosslessValue
  | Rational
  | bigint
  | number
  | string
  | { re: LosslessInput; im?: LosslessInput };

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

export function rational(num: bigint, den = 1n): Rational {
  if (den === 0n) {
    throw new Error("Division by zero in rational value");
  }
  const sign = den < 0n ? -1n : 1n;
  const g = gcd(num, den);
  return { num: sign * (num / g), den: sign * (den / g) };
}

export function parseRationalLiteral(raw: string): Rational {
  const source = raw.trim();
  if (source === "") return rational(0n);

  let sign = 1n;
  let body = source;
  if (body.startsWith("-")) {
    sign = -1n;
    body = body.slice(1);
  } else if (body.startsWith("+")) {
    body = body.slice(1);
  }

  const [mantissaPart = "0", exponentPart = "0"] = body.toLowerCase().split("e");
  const exponent = Number.parseInt(exponentPart, 10);
  if (!Number.isFinite(exponent)) {
    throw new Error(`Unsupported numeric literal ${raw}`);
  }

  const [whole = "0", fraction = ""] = mantissaPart.split(".");
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "") || "0";
  let numerator = sign * BigInt(digits);
  let denominator = 1n;
  const scale = exponent - fraction.length;
  if (scale >= 0) {
    numerator *= 10n ** BigInt(scale);
  } else {
    denominator = 10n ** BigInt(-scale);
  }
  return rational(numerator, denominator);
}

export function rationalToString(value: Rational): string {
  if (value.den === 1n) return value.num.toString();
  return `${value.num}/${value.den}`;
}

export function rationalToNumber(value: Rational): number {
  return Number(value.num) / Number(value.den);
}

export function rationalEquals(a: Rational, b: Rational): boolean {
  return a.num === b.num && a.den === b.den;
}

export function rationalIsOne(a: Rational): boolean {
  return a.num === a.den;
}

export function rationalSign(a: Rational): -1 | 0 | 1 {
  if (a.num === 0n) return 0;
  return a.num > 0n ? 1 : -1;
}

function bigintSqrtFloor(n: bigint): bigint {
  if (n < 0n) throw new Error("Square root of negative bigint");
  if (n < 2n) return n;

  let x = n;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + n / x) >> 1n;
  }
  return x;
}

function rationalSqrtExact(value: Rational): Rational | null {
  if (rationalSign(value) < 0) return null;
  const numRoot = bigintSqrtFloor(value.num);
  const denRoot = bigintSqrtFloor(value.den);
  if (numRoot * numRoot !== value.num || denRoot * denRoot !== value.den) {
    return null;
  }
  return rational(numRoot, denRoot);
}

export function exactComplex(re: Rational, im: Rational = rational(0n)): ComplexRational {
  return { kind: "complex-rational", re, im };
}

export function isComplexRational(value: LosslessValue): value is ComplexRational {
  return value.kind === "complex-rational";
}

export function rationalAdd(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function rationalSub(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den - b.num * a.den, a.den * b.den);
}

export function rationalMul(a: Rational, b: Rational): Rational {
  return rational(a.num * b.num, a.den * b.den);
}

export function rationalDiv(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den, a.den * b.num);
}

export function rationalNeg(a: Rational): Rational {
  return rational(-a.num, a.den);
}

export function rationalIsZero(a: Rational): boolean {
  return a.num === 0n;
}

export function rationalIsInteger(a: Rational): boolean {
  return a.den === 1n;
}

export function complexAdd(a: ComplexRational, b: ComplexRational): ComplexRational {
  return exactComplex(rationalAdd(a.re, b.re), rationalAdd(a.im, b.im));
}

export function complexSub(a: ComplexRational, b: ComplexRational): ComplexRational {
  return exactComplex(rationalSub(a.re, b.re), rationalSub(a.im, b.im));
}

export function complexMul(a: ComplexRational, b: ComplexRational): ComplexRational {
  return exactComplex(
    rationalSub(rationalMul(a.re, b.re), rationalMul(a.im, b.im)),
    rationalAdd(rationalMul(a.re, b.im), rationalMul(a.im, b.re)),
  );
}

export function complexDiv(a: ComplexRational, b: ComplexRational): ComplexRational {
  const denom = rationalAdd(rationalMul(b.re, b.re), rationalMul(b.im, b.im));
  return exactComplex(
    rationalDiv(rationalAdd(rationalMul(a.re, b.re), rationalMul(a.im, b.im)), denom),
    rationalDiv(rationalSub(rationalMul(a.im, b.re), rationalMul(a.re, b.im)), denom),
  );
}

export function complexNeg(a: ComplexRational): ComplexRational {
  return exactComplex(rationalNeg(a.re), rationalNeg(a.im));
}

export function complexIsZero(a: ComplexRational): boolean {
  return rationalIsZero(a.re) && rationalIsZero(a.im);
}

export function complexIsOne(a: ComplexRational): boolean {
  return rationalIsOne(a.re) && rationalIsZero(a.im);
}

export function complexSqrtExact(value: ComplexRational): ComplexRational | null {
  if (!rationalIsZero(value.im)) return null;
  const realRoot = rationalSqrtExact(value.re);
  if (realRoot) return exactComplex(realRoot);
  if (rationalSign(value.re) < 0) {
    const imagRoot = rationalSqrtExact(rationalNeg(value.re));
    if (imagRoot) return exactComplex(rational(0n), imagRoot);
  }
  return null;
}

export function complexPowInteger(base: ComplexRational, exponent: bigint): ComplexRational {
  if (exponent === 0n) return exactComplex(rational(1n));
  if (exponent < 0n) {
    return complexDiv(exactComplex(rational(1n)), complexPowInteger(base, -exponent));
  }

  let acc = exactComplex(rational(1n));
  let power = base;
  let n = exponent;
  while (n > 0n) {
    if ((n & 1n) === 1n) acc = complexMul(acc, power);
    power = complexMul(power, power);
    n >>= 1n;
  }
  return acc;
}

export function valueToExpr(value: LosslessValue): Expr {
  if (value.kind === "symbolic") return value.expr;
  if (rationalIsZero(value.im)) return rationalToExpr(value.re);

  const re = rationalToExpr(value.re);
  const im = rationalToExpr(value.im);
  const imag = mul(im, constant("i"));
  return rationalIsZero(value.re) ? imag : add(re, imag);
}

export function rationalToExpr(value: Rational): Expr {
  if (value.den === 1n) return num(value.num);
  return div(num(value.num), num(value.den));
}

export function losslessToApprox(value: LosslessValue): ApproxComplex {
  if (value.kind === "symbolic") {
    throw new Error("Cannot convert a symbolic lossless value without approximate evaluation");
  }
  return { re: rationalToNumber(value.re), im: rationalToNumber(value.im) };
}

function toComplexRationalInput(value: LosslessInput): ComplexRational | SymbolicValue {
  if (typeof value === "bigint") return exactComplex(rational(value));
  if (typeof value === "number") return exactComplex(parseRationalLiteral(String(value)));
  if (typeof value === "string") return exactComplex(parseRationalLiteral(value));
  if ("kind" in value && (value.kind === "complex-rational" || value.kind === "symbolic"))
    return value;
  if ("num" in value && "den" in value) return exactComplex(value as Rational);
  const re = toComplexRationalInput(value.re);
  const im = value.im === undefined ? exactComplex(rational(0n)) : toComplexRationalInput(value.im);
  if (re.kind === "symbolic" || im.kind === "symbolic") {
    return { kind: "symbolic", expr: add(valueToExpr(re), mul(valueToExpr(im), constant("i"))) };
  }
  return exactComplex(re.re, im.re);
}

function exactOrSymbolicBinary(
  left: LosslessValue,
  right: LosslessValue,
  exactFn: (a: ComplexRational, b: ComplexRational) => ComplexRational,
  exprFn: (a: Expr, b: Expr) => Expr,
): LosslessValue {
  if (left.kind === "complex-rational" && right.kind === "complex-rational") {
    return exactFn(left, right);
  }
  return { kind: "symbolic", expr: exprFn(valueToExpr(left), valueToExpr(right)) };
}

function exactOrSymbolicUnary(
  value: LosslessValue,
  exactFn: (a: ComplexRational) => ComplexRational,
  exprFn: (a: Expr) => Expr,
): LosslessValue {
  if (value.kind === "complex-rational") {
    return exactFn(value);
  }
  return { kind: "symbolic", expr: exprFn(valueToExpr(value)) };
}

function isExactZeroValue(value: LosslessValue): boolean {
  return value.kind === "complex-rational" && complexIsZero(value);
}

function isExactOneValue(value: LosslessValue): boolean {
  return value.kind === "complex-rational" && complexIsOne(value);
}

function isExactNonZeroValue(value: LosslessValue): boolean {
  return value.kind === "complex-rational" && !complexIsZero(value);
}

function exactRealPart(value: LosslessValue): Rational | null {
  if (value.kind !== "complex-rational" || !rationalIsZero(value.im)) return null;
  return value.re;
}

export function createLosslessEvaluator(
  env: Record<string, LosslessInput> = {},
): (expr: Expr) => LosslessValue {
  const memo = new WeakMap<Expr, LosslessValue>();

  const evaluateNode = (node: Expr): LosslessValue => {
    const cached = memo.get(node);
    if (cached) return cached;

    let result: LosslessValue;
    switch (node.kind) {
      case "num":
        result = exactComplex(parseRationalLiteral(node.raw));
        break;
      case "var": {
        const value = env[node.name];
        if (value === undefined) throw new Error(`Missing variable ${node.name}`);
        result = toComplexRationalInput(value);
        break;
      }
      case "const":
        result =
          node.name === "i"
            ? exactComplex(rational(0n), rational(1n))
            : { kind: "symbolic", expr: node };
        break;
      case "neg":
        result = exactOrSymbolicUnary(evaluateNode(node.value), complexNeg, neg);
        break;
      case "add":
        result = exactOrSymbolicBinary(
          evaluateNode(node.left),
          evaluateNode(node.right),
          complexAdd,
          add,
        );
        break;
      case "sub": {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        if (
          left.kind === "complex-rational" &&
          right.kind === "complex-rational" &&
          exprEqualsValue(left, right)
        ) {
          result = exactComplex(rational(0n));
        } else {
          result = exactOrSymbolicBinary(left, right, complexSub, sub);
        }
        break;
      }
      case "mul": {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        if (left.kind === "complex-rational" && right.kind === "complex-rational") {
          result =
            complexIsZero(left) || complexIsZero(right)
              ? exactComplex(rational(0n))
              : complexMul(left, right);
        } else if (isExactOneValue(left)) {
          result = right;
        } else if (isExactOneValue(right)) {
          result = left;
        } else {
          result = exactOrSymbolicBinary(left, right, complexMul, mul);
        }
        break;
      }
      case "div": {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        if (left.kind === "complex-rational" && right.kind === "complex-rational") {
          if (complexIsOne(right)) {
            result = left;
          } else if (complexIsZero(left) && !complexIsZero(right)) {
            result = exactComplex(rational(0n));
          } else if (!complexIsZero(right) && exprEqualsValue(left, right)) {
            result = exactComplex(rational(1n));
          } else {
            result = complexDiv(left, right);
          }
        } else if (isExactOneValue(right)) {
          result = left;
        } else {
          result = exactOrSymbolicBinary(left, right, complexDiv, div);
        }
        break;
      }
      case "pow": {
        const base = evaluateNode(node.left);
        const exponent = evaluateNode(node.right);
        if (isExactOneValue(exponent)) {
          result = base;
          break;
        }
        if (isExactNonZeroValue(base) && isExactZeroValue(exponent)) {
          result = exactComplex(rational(1n));
          break;
        }
        if (
          base.kind === "complex-rational" &&
          exponent.kind === "complex-rational" &&
          rationalIsZero(exponent.im)
        ) {
          if (rationalIsInteger(exponent.re)) {
            result = complexPowInteger(base, exponent.re.num);
            break;
          }
          if (rationalEquals(exponent.re, rational(1n, 2n))) {
            const root = complexSqrtExact(base);
            if (root) {
              result = root;
              break;
            }
          }
        }
        result = { kind: "symbolic", expr: pow(valueToExpr(base), valueToExpr(exponent)) };
        break;
      }
      case "exp": {
        const value = evaluateNode(node.value);
        if (isExactZeroValue(value)) {
          result = exactComplex(rational(1n));
          break;
        }
        if (node.value.kind === "ln") {
          const inner = evaluateNode(node.value.value);
          if (isExactNonZeroValue(inner)) {
            result = inner;
            break;
          }
        }
        result = { kind: "symbolic", expr: exp(valueToExpr(value)) };
        break;
      }
      case "ln": {
        const value = evaluateNode(node.value);
        if (isExactOneValue(value)) {
          result = exactComplex(rational(0n));
          break;
        }
        if (node.value.kind === "exp") {
          const inner = evaluateNode(node.value.value);
          const real = exactRealPart(inner);
          if (real) {
            result = exactComplex(real);
            break;
          }
        }
        result = { kind: "symbolic", expr: ln(valueToExpr(value)) };
        break;
      }
      case "sqrt": {
        const value = evaluateNode(node.value);
        if (value.kind === "complex-rational") {
          const root = complexSqrtExact(value);
          result = root ?? { kind: "symbolic", expr: sqrt(valueToExpr(value)) };
        } else {
          result = { kind: "symbolic", expr: sqrt(value.expr) };
        }
        break;
      }
      case "sin":
      case "tan":
      case "sinh":
      case "tanh":
      case "asin":
      case "atan":
      case "asinh":
      case "atanh": {
        const value = evaluateNode(node.value);
        result = isExactZeroValue(value)
          ? exactComplex(rational(0n))
          : { kind: "symbolic", expr: { ...node, value: valueToExpr(value) } };
        break;
      }
      case "cos":
      case "cosh": {
        const value = evaluateNode(node.value);
        result = isExactZeroValue(value)
          ? exactComplex(rational(1n))
          : { kind: "symbolic", expr: { ...node, value: valueToExpr(value) } };
        break;
      }
      case "acos":
      case "acosh": {
        const value = evaluateNode(node.value);
        result = isExactOneValue(value)
          ? exactComplex(rational(0n))
          : { kind: "symbolic", expr: { ...node, value: valueToExpr(value) } };
        break;
      }
      case "eml": {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        result = isExactOneValue(right)
          ? evaluateNode(exp(valueToExpr(left)))
          : { kind: "symbolic", expr: emlExpr(valueToExpr(left), valueToExpr(right)) };
        break;
      }
      default: {
        const value = "value" in node ? evaluateNode(node.value) : null;
        result = {
          kind: "symbolic",
          expr: value ? { ...node, value: valueToExpr(value) } : node,
        };
      }
    }

    memo.set(node, result);
    return result;
  };

  return evaluateNode;
}

export function evaluateLossless(
  expr: Expr,
  env: Record<string, LosslessInput> = {},
): LosslessValue {
  return createLosslessEvaluator(env)(expr);
}

function emlExpr(left: Expr, right: Expr): Expr {
  return { kind: "eml", left, right };
}

function exprEqualsValue(a: LosslessValue, b: LosslessValue): boolean {
  if (a.kind === "symbolic" && b.kind === "symbolic") return exprEquals(a.expr, b.expr);
  if (a.kind === "complex-rational" && b.kind === "complex-rational") {
    return rationalEquals(a.re, b.re) && rationalEquals(a.im, b.im);
  }
  return false;
}
