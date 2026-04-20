import type { Expr } from './ast';
import { add, constant, div, mul, neg, num, pow, sub } from './ast';

export interface Rational {
  num: bigint;
  den: bigint;
}

export interface ComplexRational {
  kind: 'complex-rational';
  re: Rational;
  im: Rational;
}

export interface SymbolicValue {
  kind: 'symbolic';
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
    throw new Error('Division by zero in rational value');
  }
  const sign = den < 0n ? -1n : 1n;
  const g = gcd(num, den);
  return { num: sign * (num / g), den: sign * (den / g) };
}

export function parseRationalLiteral(raw: string): Rational {
  const source = raw.trim();
  if (source === '') return rational(0n);

  let sign = 1n;
  let body = source;
  if (body.startsWith('-')) {
    sign = -1n;
    body = body.slice(1);
  } else if (body.startsWith('+')) {
    body = body.slice(1);
  }

  const [mantissaPart = '0', exponentPart = '0'] = body.toLowerCase().split('e');
  const exponent = Number.parseInt(exponentPart, 10);
  if (!Number.isFinite(exponent)) {
    throw new Error(`Unsupported numeric literal ${raw}`);
  }

  const [whole = '0', fraction = ''] = mantissaPart.split('.');
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, '') || '0';
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

export function exactComplex(re: Rational, im: Rational = rational(0n)): ComplexRational {
  return { kind: 'complex-rational', re, im };
}

export function isComplexRational(value: LosslessValue): value is ComplexRational {
  return value.kind === 'complex-rational';
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
  if (value.kind === 'symbolic') return value.expr;
  if (rationalIsZero(value.im)) return rationalToExpr(value.re);

  const re = rationalToExpr(value.re);
  const im = rationalToExpr(value.im);
  const imag = mul(im, constant('i'));
  return rationalIsZero(value.re) ? imag : add(re, imag);
}

export function rationalToExpr(value: Rational): Expr {
  if (value.den === 1n) return num(value.num);
  return div(num(value.num), num(value.den));
}

export function losslessToApprox(value: LosslessValue): ApproxComplex {
  if (value.kind === 'symbolic') {
    throw new Error('Cannot convert a symbolic lossless value without approximate evaluation');
  }
  return { re: rationalToNumber(value.re), im: rationalToNumber(value.im) };
}

function toComplexRationalInput(value: LosslessInput): ComplexRational | SymbolicValue {
  if (typeof value === 'bigint') return exactComplex(rational(value));
  if (typeof value === 'number') return exactComplex(parseRationalLiteral(String(value)));
  if (typeof value === 'string') return exactComplex(parseRationalLiteral(value));
  if ('kind' in value && (value.kind === 'complex-rational' || value.kind === 'symbolic')) return value;
  if ('num' in value && 'den' in value) return exactComplex(value as Rational);
  const re = toComplexRationalInput(value.re);
  const im = value.im === undefined ? exactComplex(rational(0n)) : toComplexRationalInput(value.im);
  if (re.kind === 'symbolic' || im.kind === 'symbolic') {
    return { kind: 'symbolic', expr: add(valueToExpr(re), mul(valueToExpr(im), constant('i'))) };
  }
  return exactComplex(re.re, im.re);
}

function exactOrSymbolicBinary(
  left: LosslessValue,
  right: LosslessValue,
  exactFn: (a: ComplexRational, b: ComplexRational) => ComplexRational,
  exprFn: (a: Expr, b: Expr) => Expr,
): LosslessValue {
  if (left.kind === 'complex-rational' && right.kind === 'complex-rational') {
    return exactFn(left, right);
  }
  return { kind: 'symbolic', expr: exprFn(valueToExpr(left), valueToExpr(right)) };
}

function exactOrSymbolicUnary(
  value: LosslessValue,
  exactFn: (a: ComplexRational) => ComplexRational,
  exprFn: (a: Expr) => Expr,
): LosslessValue {
  if (value.kind === 'complex-rational') {
    return exactFn(value);
  }
  return { kind: 'symbolic', expr: exprFn(valueToExpr(value)) };
}

export function evaluateLossless(expr: Expr, env: Record<string, LosslessInput> = {}): LosslessValue {
  switch (expr.kind) {
    case 'num':
      return exactComplex(parseRationalLiteral(expr.raw));
    case 'var': {
      const value = env[expr.name];
      if (value === undefined) throw new Error(`Missing variable ${expr.name}`);
      return toComplexRationalInput(value);
    }
    case 'const':
      if (expr.name === 'i') return exactComplex(rational(0n), rational(1n));
      return { kind: 'symbolic', expr };
    case 'neg':
      return exactOrSymbolicUnary(evaluateLossless(expr.value, env), complexNeg, neg);
    case 'add':
      return exactOrSymbolicBinary(evaluateLossless(expr.left, env), evaluateLossless(expr.right, env), complexAdd, add);
    case 'sub':
      return exactOrSymbolicBinary(evaluateLossless(expr.left, env), evaluateLossless(expr.right, env), complexSub, sub);
    case 'mul':
      return exactOrSymbolicBinary(evaluateLossless(expr.left, env), evaluateLossless(expr.right, env), complexMul, mul);
    case 'div':
      return exactOrSymbolicBinary(evaluateLossless(expr.left, env), evaluateLossless(expr.right, env), complexDiv, div);
    case 'pow': {
      const base = evaluateLossless(expr.left, env);
      const exponent = evaluateLossless(expr.right, env);
      if (base.kind === 'complex-rational' && exponent.kind === 'complex-rational' && rationalIsZero(exponent.im) && rationalIsInteger(exponent.re)) {
        return complexPowInteger(base, exponent.re.num);
      }
      return { kind: 'symbolic', expr: pow(valueToExpr(base), valueToExpr(exponent)) };
    }
    case 'eml':
      return { kind: 'symbolic', expr: emlExpr(valueToExpr(evaluateLossless(expr.left, env)), valueToExpr(evaluateLossless(expr.right, env))) };
    default: {
      const value = 'value' in expr ? evaluateLossless(expr.value, env) : null;
      return {
        kind: 'symbolic',
        expr: value ? { ...expr, value: valueToExpr(value) } : expr,
      };
    }
  }
}

function emlExpr(left: Expr, right: Expr): Expr {
  return { kind: 'eml', left, right };
}
