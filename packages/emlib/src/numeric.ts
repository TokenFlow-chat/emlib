import type { Expr } from "./ast";
import {
  add,
  constant,
  div,
  exp,
  exprEquals,
  isNegativeOne,
  isOne,
  isZero,
  ln,
  mul,
  neg,
  num,
  pow,
  sqrt,
  sub,
} from "./ast";
import { toString } from "./print";

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

type UnaryExprNode = Extract<Expr, { value: Expr }>;
type BinaryExprNode = Extract<Expr, { left: Expr; right: Expr }>;

export const approxComplex = (re: number, im = 0): ApproxComplex => ({ re, im });
const APPROX_ZERO = approxComplex(0);
const APPROX_ONE = approxComplex(1);
const APPROX_HALF = approxComplex(0.5);
const APPROX_I = approxComplex(0, 1);
const APPROX_NEG_I = approxComplex(0, -1);

function approxIsReal(value: ApproxComplex): boolean {
  return value.im === 0;
}

export function approxAdd(a: ApproxComplex, b: ApproxComplex): ApproxComplex {
  return approxComplex(a.re + b.re, a.im + b.im);
}

export function approxSub(a: ApproxComplex, b: ApproxComplex): ApproxComplex {
  return approxComplex(a.re - b.re, a.im - b.im);
}

export function approxMul(a: ApproxComplex, b: ApproxComplex): ApproxComplex {
  return approxComplex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

export function approxDiv(a: ApproxComplex, b: ApproxComplex): ApproxComplex {
  const denom = b.re * b.re + b.im * b.im;
  return approxComplex((a.re * b.re + a.im * b.im) / denom, (a.im * b.re - a.re * b.im) / denom);
}

export function approxNeg(a: ApproxComplex): ApproxComplex {
  return approxComplex(-a.re, -a.im);
}

export function approxAbs(a: ApproxComplex): number {
  return Math.hypot(a.re, a.im);
}

export function approxArg(a: ApproxComplex): number {
  return Math.atan2(a.im, a.re);
}

export function approxExp(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(Math.exp(a.re));
  }
  const er = Math.exp(a.re);
  return approxComplex(er * Math.cos(a.im), er * Math.sin(a.im));
}

export function approxLog(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a) && a.re > 0) {
    return approxComplex(Math.log(a.re));
  }
  return approxComplex(Math.log(approxAbs(a)), approxArg(a));
}

export function approxPow(a: ApproxComplex, b: ApproxComplex): ApproxComplex {
  if (b.re === 0 && b.im === 0) return APPROX_ONE;
  if (a.re === 0 && a.im === 0 && b.im === 0 && b.re > 0) return APPROX_ZERO;
  if (approxIsReal(a) && approxIsReal(b) && (a.re >= 0 || Number.isInteger(b.re))) {
    return approxComplex(Math.pow(a.re, b.re));
  }
  return approxExp(approxMul(approxLog(a), b));
}

export function approxSqrt(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return a.re >= 0 ? approxComplex(Math.sqrt(a.re)) : approxComplex(0, Math.sqrt(-a.re));
  }
  const r = approxAbs(a);
  const re = Math.sqrt(Math.max(0, (r + a.re) / 2));
  const im = Math.sqrt(Math.max(0, (r - a.re) / 2));
  return approxComplex(re, a.im < 0 ? -im : im);
}

export function approxSin(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(Math.sin(a.re));
  }
  return approxComplex(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
}

export function approxCos(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(Math.cos(a.re));
  }
  return approxComplex(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
}

export function approxTan(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(Math.tan(a.re));
  }
  return approxDiv(approxSin(a), approxCos(a));
}

export function approxCot(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(1 / Math.tan(a.re));
  }
  return approxDiv(approxCos(a), approxSin(a));
}

export function approxSec(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(1 / Math.cos(a.re));
  }
  return approxDiv(approxComplex(1), approxCos(a));
}

export function approxCsc(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(1 / Math.sin(a.re));
  }
  return approxDiv(approxComplex(1), approxSin(a));
}

export function approxSinh(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(Math.sinh(a.re));
  }
  return approxComplex(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im));
}

export function approxCosh(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(Math.cosh(a.re));
  }
  return approxComplex(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im));
}

export function approxTanh(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(Math.tanh(a.re));
  }
  return approxDiv(approxSinh(a), approxCosh(a));
}

export function approxCoth(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(1 / Math.tanh(a.re));
  }
  return approxDiv(approxCosh(a), approxSinh(a));
}

export function approxSech(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(1 / Math.cosh(a.re));
  }
  return approxDiv(approxComplex(1), approxCosh(a));
}

export function approxCsch(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(1 / Math.sinh(a.re));
  }
  return approxDiv(approxComplex(1), approxSinh(a));
}

export function approxAsin(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a) && a.re >= -1 && a.re <= 1) {
    return approxComplex(Math.asin(a.re));
  }
  return approxMul(
    APPROX_I,
    approxLog(
      approxAdd(approxMul(APPROX_NEG_I, a), approxSqrt(approxSub(APPROX_ONE, approxMul(a, a)))),
    ),
  );
}

export function approxAcos(a: ApproxComplex): ApproxComplex {
  return approxMul(
    APPROX_I,
    approxLog(
      approxAdd(
        a,
        approxMul(approxSqrt(approxSub(a, APPROX_ONE)), approxSqrt(approxAdd(a, APPROX_ONE))),
      ),
    ),
  );
}

export function approxAtan(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(Math.atan(a.re));
  }
  return approxMul(
    approxComplex(0, -0.5),
    approxLog(approxDiv(approxAdd(a, APPROX_NEG_I), approxSub(APPROX_NEG_I, a))),
  );
}

export function approxAsec(a: ApproxComplex): ApproxComplex {
  return approxAcos(approxDiv(APPROX_ONE, a));
}

export function approxAcsc(a: ApproxComplex): ApproxComplex {
  return approxAsin(approxDiv(APPROX_ONE, a));
}

export function approxAcot(a: ApproxComplex): ApproxComplex {
  return approxAtan(approxDiv(APPROX_ONE, a));
}

export function approxAsinh(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a)) {
    return approxComplex(Math.asinh(a.re));
  }
  return approxLog(approxAdd(a, approxSqrt(approxAdd(approxMul(a, a), APPROX_ONE))));
}

export function approxAcosh(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a) && a.re >= 1) {
    return approxComplex(Math.acosh(a.re));
  }
  return approxLog(
    approxAdd(
      a,
      approxMul(approxSqrt(approxAdd(a, APPROX_ONE)), approxSqrt(approxSub(a, APPROX_ONE))),
    ),
  );
}

export function approxAtanh(a: ApproxComplex): ApproxComplex {
  if (approxIsReal(a) && a.re > -1 && a.re < 1) {
    return approxComplex(Math.atanh(a.re));
  }
  return approxMul(
    APPROX_HALF,
    approxLog(approxDiv(approxAdd(APPROX_ONE, a), approxSub(APPROX_ONE, a))),
  );
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

function exactNegExpr(value: Expr): Expr {
  if (isZero(value)) return num(0);
  if (value.kind === "neg") return value.value;
  if (value.kind === "num") {
    return num(value.raw.startsWith("-") ? value.raw.slice(1) : `-${value.raw}`);
  }
  return neg(value);
}

function exactAddExpr(left: Expr, right: Expr): Expr {
  if (isZero(left)) return right;
  if (isZero(right)) return left;
  if (left.kind === "neg") return exactSubExpr(right, left.value);
  if (right.kind === "neg") return exactSubExpr(left, right.value);
  if (left.kind === "sub" && exprEquals(left.right, right)) return left.left;
  if (right.kind === "sub" && exprEquals(right.right, left)) return right.left;
  return add(left, right);
}

function exactSubExpr(left: Expr, right: Expr): Expr {
  if (isZero(right)) return left;
  if (isZero(left)) return exactNegExpr(right);
  if (exprEquals(left, right)) return num(0);
  if (right.kind === "neg") return exactAddExpr(left, right.value);
  if (left.kind === "add") {
    if (exprEquals(left.left, right)) return left.right;
    if (exprEquals(left.right, right)) return left.left;
  }
  if (right.kind === "add") {
    if (exprEquals(left, right.left)) return exactNegExpr(right.right);
    if (exprEquals(left, right.right)) return exactNegExpr(right.left);
  }
  if (right.kind === "sub" && exprEquals(left, right.left)) return right.right;
  if (left.kind === "sub" && exprEquals(left.left, right)) return exactNegExpr(left.right);
  return sub(left, right);
}

function exactMulExpr(left: Expr, right: Expr): Expr {
  if (isOne(left)) return right;
  if (isOne(right)) return left;
  if (isNegativeOne(left)) return exactNegExpr(right);
  if (isNegativeOne(right)) return exactNegExpr(left);
  return mul(left, right);
}

function exactDivExpr(left: Expr, right: Expr): Expr {
  if (isOne(right)) return left;
  if (isNegativeOne(right)) return exactNegExpr(left);
  return div(left, right);
}

function exactPowExpr(base: Expr, exponent: Expr): Expr {
  if (isOne(exponent)) return base;
  return pow(base, exponent);
}

function exactImaginaryTerm(coefficient: Rational): Expr {
  if (rationalIsOne(coefficient)) return constant("i");
  if (coefficient.num === -coefficient.den) return exactNegExpr(constant("i"));
  return exactMulExpr(rationalToExpr(coefficient), constant("i"));
}

function exactTimesIExpr(value: LosslessValue): Expr {
  if (value.kind === "complex-rational") {
    return valueToExpr(exactComplex(rationalNeg(value.im), value.re));
  }
  return exactMulExpr(valueToExpr(value), constant("i"));
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

const simplifyLosslessExprCache = new WeakMap<Expr, Expr>();

function exactUnaryExpr(kind: UnaryExprNode["kind"], value: Expr): Expr {
  switch (kind) {
    case "neg":
      return exactNegExpr(value);
    case "exp":
      return isZero(value) ? num(1) : exp(value);
    case "ln":
      return isOne(value) ? num(0) : ln(value);
    case "sqrt":
      return isZero(value) || isOne(value) ? value : sqrt(value);
    case "sin":
    case "tan":
    case "sinh":
    case "tanh":
    case "asin":
    case "atan":
    case "asinh":
    case "atanh":
      return isZero(value) ? num(0) : ({ kind, value } as Expr);
    case "cos":
    case "cosh":
    case "sec":
    case "sech":
      return isZero(value) ? num(1) : ({ kind, value } as Expr);
    case "acos":
    case "acosh":
      return isOne(value) ? num(0) : ({ kind, value } as Expr);
    default:
      return { kind, value } as Expr;
  }
}

function exactBinaryExpr(kind: BinaryExprNode["kind"], left: Expr, right: Expr): Expr {
  switch (kind) {
    case "add":
      return exactAddExpr(left, right);
    case "sub":
      return exactSubExpr(left, right);
    case "mul":
      return exactMulExpr(left, right);
    case "div":
      return exactDivExpr(left, right);
    case "pow":
      return exactPowExpr(left, right);
    default:
      return { kind, left, right } as Expr;
  }
}

function simplifyLosslessExpr(expr: Expr): Expr {
  const cached = simplifyLosslessExprCache.get(expr);
  if (cached) return cached;

  let result: Expr;
  switch (expr.kind) {
    case "num":
    case "var":
    case "const":
      result = expr;
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
      result = exactUnaryExpr(expr.kind, simplifyLosslessExpr(expr.value));
      break;
    case "eml":
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
      result = exactBinaryExpr(
        expr.kind,
        simplifyLosslessExpr(expr.left),
        simplifyLosslessExpr(expr.right),
      );
      break;
  }

  simplifyLosslessExprCache.set(expr, result);
  return result;
}

export function valueToExpr(value: LosslessValue): Expr {
  if (value.kind === "symbolic") return value.expr;
  if (rationalIsZero(value.im)) return rationalToExpr(value.re);

  const re = rationalToExpr(value.re);
  if (rationalIsZero(value.re)) return exactImaginaryTerm(value.im);

  const imagSign = rationalSign(value.im);
  const imagMagnitude = exactImaginaryTerm(imagSign < 0 ? rationalNeg(value.im) : value.im);
  return imagSign < 0 ? exactSubExpr(re, imagMagnitude) : exactAddExpr(re, imagMagnitude);
}

export function rationalToExpr(value: Rational): Expr {
  if (value.den === 1n) return num(value.num);
  return div(num(value.num), num(value.den));
}

export function simplifyLosslessValue(value: LosslessValue): LosslessValue {
  if (value.kind === "complex-rational") return value;
  const expr = simplifyLosslessExpr(value.expr);
  return expr === value.expr ? value : { kind: "symbolic", expr };
}

export function losslessToString(value: LosslessValue): string {
  return toString(valueToExpr(simplifyLosslessValue(value)));
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
    return {
      kind: "symbolic",
      expr: exactAddExpr(valueToExpr(re), exactTimesIExpr(im)),
    };
  }
  return exactComplex(rationalSub(re.re, im.im), rationalAdd(re.im, im.re));
}

function approxFromInput(value: LosslessInput): ApproxComplex | null {
  if (typeof value === "bigint") return approxComplex(Number(value));
  if (typeof value === "number") return approxComplex(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? approxComplex(parsed) : null;
  }
  if ("kind" in value) {
    if (value.kind === "complex-rational") {
      return losslessToApprox(value);
    }
    return null;
  }
  if ("num" in value && "den" in value) {
    return approxComplex(rationalToNumber(value as Rational));
  }
  const re = approxFromInput(value.re);
  const im = value.im === undefined ? APPROX_ZERO : approxFromInput(value.im);
  if (!re || !im) return null;
  return approxComplex(re.re - im.im, re.im + im.re);
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

interface EvaluatedNode {
  lossless: LosslessValue;
  approx?: ApproxComplex;
}

function matchEmlExp(expr: Expr): Expr | null {
  return expr.kind === "eml" && isOne(expr.right) ? expr.left : null;
}

function matchEmlLn(expr: Expr): Expr | null {
  if (
    expr.kind === "eml" &&
    isOne(expr.left) &&
    expr.right.kind === "eml" &&
    expr.right.left.kind === "eml" &&
    isOne(expr.right.left.left) &&
    isOne(expr.right.right)
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

function losslessNegValue(value: LosslessValue): LosslessValue {
  return exactOrSymbolicUnary(value, complexNeg, exactNegExpr);
}

function losslessAddValue(left: LosslessValue, right: LosslessValue): LosslessValue {
  return exactOrSymbolicBinary(left, right, complexAdd, exactAddExpr);
}

function losslessSubValue(left: LosslessValue, right: LosslessValue): LosslessValue {
  if (exprEqualsValue(left, right)) {
    return exactComplex(rational(0n));
  }
  return exactOrSymbolicBinary(left, right, complexSub, exactSubExpr);
}

function losslessMulValue(left: LosslessValue, right: LosslessValue): LosslessValue {
  if (left.kind === "complex-rational" && right.kind === "complex-rational") {
    return complexIsZero(left) || complexIsZero(right)
      ? exactComplex(rational(0n))
      : complexMul(left, right);
  }
  if (isExactOneValue(left)) return right;
  if (isExactOneValue(right)) return left;
  return exactOrSymbolicBinary(left, right, complexMul, exactMulExpr);
}

function losslessDivValue(left: LosslessValue, right: LosslessValue): LosslessValue {
  if (left.kind === "complex-rational" && right.kind === "complex-rational") {
    if (complexIsOne(right)) return left;
    if (complexIsZero(left) && !complexIsZero(right)) return exactComplex(rational(0n));
    if (!complexIsZero(right) && exprEqualsValue(left, right)) return exactComplex(rational(1n));
    return complexDiv(left, right);
  }
  if (isExactOneValue(right)) return left;
  return exactOrSymbolicBinary(left, right, complexDiv, exactDivExpr);
}

function losslessPowValue(base: LosslessValue, exponent: LosslessValue): LosslessValue {
  if (isExactOneValue(exponent)) return base;
  if (isExactNonZeroValue(base) && isExactZeroValue(exponent)) {
    return exactComplex(rational(1n));
  }
  if (
    base.kind === "complex-rational" &&
    exponent.kind === "complex-rational" &&
    rationalIsZero(exponent.im)
  ) {
    if (rationalIsInteger(exponent.re)) {
      return complexPowInteger(base, exponent.re.num);
    }
    if (rationalEquals(exponent.re, rational(1n, 2n))) {
      const root = complexSqrtExact(base);
      if (root) return root;
    }
  }
  return { kind: "symbolic", expr: exactPowExpr(valueToExpr(base), valueToExpr(exponent)) };
}

function losslessExpValue(value: LosslessValue): LosslessValue {
  if (isExactZeroValue(value)) return exactComplex(rational(1n));
  return { kind: "symbolic", expr: exp(valueToExpr(value)) };
}

function losslessLnValue(value: LosslessValue): LosslessValue {
  if (isExactOneValue(value)) return exactComplex(rational(0n));
  return { kind: "symbolic", expr: ln(valueToExpr(value)) };
}

function losslessSqrtValue(value: LosslessValue): LosslessValue {
  if (value.kind === "complex-rational") {
    return complexSqrtExact(value) ?? { kind: "symbolic", expr: sqrt(valueToExpr(value)) };
  }
  return { kind: "symbolic", expr: sqrt(value.expr) };
}

function losslessZeroIdentity(node: Expr): LosslessValue {
  return { kind: "symbolic", expr: node };
}

function finalizeEvaluatedNode(
  lossless: LosslessValue,
  withApprox: boolean,
  approxFallback?: () => ApproxComplex,
): EvaluatedNode {
  if (!withApprox) return { lossless };
  if (lossless.kind === "complex-rational") {
    return { lossless, approx: losslessToApprox(lossless) };
  }
  if (!approxFallback) {
    throw new Error("Approximate evaluation requires numeric fallback values");
  }
  return { lossless, approx: approxFallback() };
}

function createEvaluatorCore(
  env: Record<string, LosslessInput>,
  withApprox: boolean,
): (expr: Expr) => EvaluatedNode {
  const memo = new WeakMap<Expr, EvaluatedNode>();

  const asApprox = (value: EvaluatedNode): ApproxComplex => {
    if (!withApprox || !value.approx) {
      throw new Error("Approximate value requested from lossless-only evaluation");
    }
    return value.approx;
  };

  const evaluateNode = (node: Expr): EvaluatedNode => {
    const cached = memo.get(node);
    if (cached) return cached;

    let result: EvaluatedNode;
    switch (node.kind) {
      case "num":
        result = finalizeEvaluatedNode(exactComplex(parseRationalLiteral(node.raw)), withApprox);
        break;
      case "var": {
        const value = env[node.name];
        if (value === undefined) throw new Error(`Missing variable ${node.name}`);
        const normalized = toComplexRationalInput(value);
        result = finalizeEvaluatedNode(normalized, withApprox, () => {
          const directApprox = approxFromInput(value);
          if (directApprox) return directApprox;
          if (
            normalized.kind === "symbolic" &&
            normalized.expr.kind === "var" &&
            normalized.expr.name === node.name
          ) {
            throw new Error(`Variable ${node.name} does not have a numeric approximate value`);
          }
          return asApprox(evaluateNode(valueToExpr(normalized)));
        });
        break;
      }
      case "const":
        result =
          node.name === "i"
            ? finalizeEvaluatedNode(exactComplex(rational(0n), rational(1n)), withApprox)
            : finalizeEvaluatedNode({ kind: "symbolic", expr: node }, withApprox, () =>
                approxComplex(node.name === "e" ? Math.E : Math.PI),
              );
        break;
      case "neg": {
        const value = evaluateNode(node.value);
        result = finalizeEvaluatedNode(losslessNegValue(value.lossless), withApprox, () =>
          approxNeg(asApprox(value)),
        );
        break;
      }
      case "add": {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        result = finalizeEvaluatedNode(
          losslessAddValue(left.lossless, right.lossless),
          withApprox,
          () => approxAdd(asApprox(left), asApprox(right)),
        );
        break;
      }
      case "sub": {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        result = finalizeEvaluatedNode(
          losslessSubValue(left.lossless, right.lossless),
          withApprox,
          () => approxSub(asApprox(left), asApprox(right)),
        );
        break;
      }
      case "mul": {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        result = finalizeEvaluatedNode(
          losslessMulValue(left.lossless, right.lossless),
          withApprox,
          () => approxMul(asApprox(left), asApprox(right)),
        );
        break;
      }
      case "div": {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        result = finalizeEvaluatedNode(
          losslessDivValue(left.lossless, right.lossless),
          withApprox,
          () => approxDiv(asApprox(left), asApprox(right)),
        );
        break;
      }
      case "pow": {
        const base = evaluateNode(node.left);
        const exponent = evaluateNode(node.right);
        result = finalizeEvaluatedNode(
          losslessPowValue(base.lossless, exponent.lossless),
          withApprox,
          () => approxPow(asApprox(base), asApprox(exponent)),
        );
        break;
      }
      case "exp": {
        const value = evaluateNode(node.value);
        let lossless = losslessExpValue(value.lossless);

        const innerExpr = node.value.kind === "ln" ? node.value.value : matchEmlLn(node.value);
        if (innerExpr) {
          const inner = evaluateNode(innerExpr);
          if (isExactNonZeroValue(inner.lossless)) {
            lossless = inner.lossless;
          }
        }

        result = finalizeEvaluatedNode(lossless, withApprox, () => approxExp(asApprox(value)));
        break;
      }
      case "ln": {
        const value = evaluateNode(node.value);
        let lossless = losslessLnValue(value.lossless);

        const innerExpr = node.value.kind === "exp" ? node.value.value : matchEmlExp(node.value);
        if (innerExpr) {
          const inner = evaluateNode(innerExpr);
          const real = exactRealPart(inner.lossless);
          if (real) {
            lossless = exactComplex(real);
          }
        }

        result = finalizeEvaluatedNode(lossless, withApprox, () => approxLog(asApprox(value)));
        break;
      }
      case "sqrt": {
        const value = evaluateNode(node.value);
        result = finalizeEvaluatedNode(losslessSqrtValue(value.lossless), withApprox, () =>
          approxSqrt(asApprox(value)),
        );
        break;
      }
      case "sin": {
        const value = evaluateNode(node.value);
        const lossless: LosslessValue = isExactZeroValue(value.lossless)
          ? exactComplex(rational(0n))
          : { kind: "symbolic", expr: { ...node, value: valueToExpr(value.lossless) } };
        result = finalizeEvaluatedNode(lossless, withApprox, () => approxSin(asApprox(value)));
        break;
      }
      case "cos": {
        const value = evaluateNode(node.value);
        const lossless: LosslessValue = isExactZeroValue(value.lossless)
          ? exactComplex(rational(1n))
          : { kind: "symbolic", expr: { ...node, value: valueToExpr(value.lossless) } };
        result = finalizeEvaluatedNode(lossless, withApprox, () => approxCos(asApprox(value)));
        break;
      }
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
      case "atanh": {
        const value = evaluateNode(node.value);
        let lossless: LosslessValue = losslessZeroIdentity({
          ...node,
          value: valueToExpr(value.lossless),
        });
        if (
          (node.kind === "tan" ||
            node.kind === "sinh" ||
            node.kind === "tanh" ||
            node.kind === "asin" ||
            node.kind === "atan" ||
            node.kind === "asinh" ||
            node.kind === "atanh") &&
          isExactZeroValue(value.lossless)
        ) {
          lossless = exactComplex(rational(0n));
        } else if (node.kind === "cosh" && isExactZeroValue(value.lossless)) {
          lossless = exactComplex(rational(1n));
        } else if (
          (node.kind === "acos" || node.kind === "acosh") &&
          isExactOneValue(value.lossless)
        ) {
          lossless = exactComplex(rational(0n));
        }

        result = finalizeEvaluatedNode(lossless, withApprox, () => {
          const approx = asApprox(value);
          switch (node.kind) {
            case "tan":
              return approxTan(approx);
            case "cot":
              return approxCot(approx);
            case "sec":
              return approxSec(approx);
            case "csc":
              return approxCsc(approx);
            case "sinh":
              return approxSinh(approx);
            case "cosh":
              return approxCosh(approx);
            case "tanh":
              return approxTanh(approx);
            case "coth":
              return approxCoth(approx);
            case "sech":
              return approxSech(approx);
            case "csch":
              return approxCsch(approx);
            case "asin":
              return approxAsin(approx);
            case "acos":
              return approxAcos(approx);
            case "atan":
              return approxAtan(approx);
            case "asec":
              return approxAsec(approx);
            case "acsc":
              return approxAcsc(approx);
            case "acot":
              return approxAcot(approx);
            case "asinh":
              return approxAsinh(approx);
            case "acosh":
              return approxAcosh(approx);
            case "atanh":
              return approxAtanh(approx);
          }
        });
        break;
      }
      case "eml": {
        const expArg = matchEmlExp(node);
        if (expArg) {
          const value = evaluateNode(expArg);
          result = finalizeEvaluatedNode(losslessExpValue(value.lossless), withApprox, () =>
            approxExp(asApprox(value)),
          );
          break;
        }

        const logArg = matchEmlLn(node);
        if (logArg) {
          const value = evaluateNode(logArg);
          result = finalizeEvaluatedNode(losslessLnValue(value.lossless), withApprox, () =>
            approxLog(asApprox(value)),
          );
          break;
        }

        const subArgs = matchEmlSub(node);
        if (subArgs) {
          const left = evaluateNode(subArgs.left);
          const right = evaluateNode(subArgs.right);
          result = finalizeEvaluatedNode(
            losslessSubValue(left.lossless, right.lossless),
            withApprox,
            () => approxSub(asApprox(left), asApprox(right)),
          );
          break;
        }

        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        result = finalizeEvaluatedNode(
          {
            kind: "symbolic",
            expr: emlExpr(valueToExpr(left.lossless), valueToExpr(right.lossless)),
          },
          withApprox,
          () => approxSub(approxExp(asApprox(left)), approxLog(asApprox(right))),
        );
        break;
      }
      default: {
        const exhaustive: never = node;
        throw new Error(`Unsupported expression kind: ${String(exhaustive)}`);
      }
    }

    memo.set(node, result);
    return result;
  };

  return evaluateNode;
}

export function createLosslessEvaluator(
  env: Record<string, LosslessInput> = {},
): (expr: Expr) => LosslessValue {
  const evaluateNode = createEvaluatorCore(env, false);
  return (expr: Expr) => evaluateNode(expr).lossless;
}

export function createApproxEvaluator(
  env: Record<string, LosslessInput> = {},
): (expr: Expr) => ApproxComplex {
  const evaluateNode = createEvaluatorCore(env, true);
  return (expr: Expr) => {
    const result = evaluateNode(expr);
    if (!result.approx) {
      throw new Error("Approximate evaluation failed to produce a numeric result");
    }
    return result.approx;
  };
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
