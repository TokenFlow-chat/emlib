import type { Expr } from './ast';
import { eml, isNumericValue, num, variable } from './ast';
import { desugarElementary } from './elementary';
import { parseRationalLiteral } from './numeric';

export interface LowerOptions {
  strict?: boolean;
}

const ONE = num(1);
let zeroCache: Expr | null = null;
let iCache: Expr | null = null;
let piCache: Expr | null = null;

export function emlExp(x: Expr): Expr {
  return eml(x, ONE);
}

export function emlLn(x: Expr): Expr {
  return eml(ONE, eml(eml(ONE, x), ONE));
}

export function emlZero(): Expr {
  zeroCache ??= emlLn(ONE);
  return zeroCache;
}

function emlSub(a: Expr, b: Expr): Expr {
  return eml(emlLn(a), emlExp(b));
}

function emlNeg(z: Expr): Expr {
  return emlSub(emlZero(), z);
}

function emlAdd(a: Expr, b: Expr): Expr {
  return emlSub(a, emlNeg(b));
}

function emlInv(z: Expr): Expr {
  return emlExp(emlNeg(emlLn(z)));
}

function emlMul(a: Expr, b: Expr): Expr {
  return emlExp(emlAdd(emlLn(a), emlLn(b)));
}

function emlDiv(a: Expr, b: Expr): Expr {
  return emlMul(a, emlInv(b));
}

function emlPow(a: Expr, b: Expr): Expr {
  return emlExp(emlMul(b, emlLn(a)));
}

function emlInt(n: bigint): Expr {
  if (n === 1n) return ONE;
  if (n === 0n) return emlZero();
  if (n < 0n) return emlNeg(emlInt(-n));

  let acc: Expr | null = null;
  let term: Expr = ONE;
  let k = n;

  while (k > 0n) {
    if ((k & 1n) === 1n) {
      acc = acc ? emlAdd(acc, term) : term;
    }
    term = emlAdd(term, term);
    k >>= 1n;
  }

  return acc ?? emlZero();
}

function emlRational(p: bigint, q: bigint): Expr {
  if (q === 1n) return emlInt(p);
  const numerator = emlInt(p < 0n ? -p : p);
  const denominator = emlInt(q);
  const value = emlMul(numerator, emlInv(denominator));
  return p < 0n ? emlNeg(value) : value;
}

function lowerNumber(raw: string): Expr {
  const { num: p, den: q } = parseRationalLiteral(raw);
  return emlRational(p, q);
}

function lowerConst(name: 'e' | 'pi' | 'i'): Expr {
  if (name === 'e') {
    return emlExp(ONE);
  }
  if (name === 'i') {
    iCache ??= emlExp(emlDiv(emlLn(emlNeg(ONE)), emlInt(2n)));
    return iCache;
  }
  piCache ??= emlNeg(emlMul(lowerConst('i'), emlLn(emlNeg(ONE))));
  return piCache;
}

function isZeroExpr(expr: Expr): boolean {
  return isNumericValue(expr, 0);
}

function isOneExpr(expr: Expr): boolean {
  return isNumericValue(expr, 1);
}

export function reduceTypes(expr: Expr, options: LowerOptions = {}): Expr {
  const expanded = desugarElementary(expr);

  switch (expanded.kind) {
    case 'var':
      return variable(expanded.name);
    case 'num':
      return lowerNumber(expanded.raw);
    case 'const':
      return lowerConst(expanded.name);
    case 'eml':
      return eml(reduceTypes(expanded.left, options), reduceTypes(expanded.right, options));
    case 'exp':
      if (expanded.value.kind === 'ln') {
        return reduceTypes(expanded.value.value, options);
      }
      return emlExp(reduceTypes(expanded.value, options));
    case 'ln':
      if (expanded.value.kind === 'exp') {
        return reduceTypes(expanded.value.value, options);
      }
      return emlLn(reduceTypes(expanded.value, options));
    case 'neg':
      if (isZeroExpr(expanded.value)) {
        return emlZero();
      }
      return emlNeg(reduceTypes(expanded.value, options));
    case 'add':
      if (isZeroExpr(expanded.left)) return reduceTypes(expanded.right, options);
      if (isZeroExpr(expanded.right)) return reduceTypes(expanded.left, options);
      return emlAdd(reduceTypes(expanded.left, options), reduceTypes(expanded.right, options));
    case 'sub':
      if (expanded.left.kind === 'exp' && expanded.right.kind === 'ln') {
        return eml(reduceTypes(expanded.left.value, options), reduceTypes(expanded.right.value, options));
      }
      if (isZeroExpr(expanded.right)) return reduceTypes(expanded.left, options);
      if (isZeroExpr(expanded.left)) return emlNeg(reduceTypes(expanded.right, options));
      return emlSub(reduceTypes(expanded.left, options), reduceTypes(expanded.right, options));
    case 'mul':
      if (isZeroExpr(expanded.left) || isZeroExpr(expanded.right)) return emlZero();
      if (isOneExpr(expanded.left)) return reduceTypes(expanded.right, options);
      if (isOneExpr(expanded.right)) return reduceTypes(expanded.left, options);
      return emlMul(reduceTypes(expanded.left, options), reduceTypes(expanded.right, options));
    case 'div':
      if (isZeroExpr(expanded.left)) return emlZero();
      if (isOneExpr(expanded.right)) return reduceTypes(expanded.left, options);
      return emlDiv(reduceTypes(expanded.left, options), reduceTypes(expanded.right, options));
    case 'pow':
      if (isOneExpr(expanded.right)) return reduceTypes(expanded.left, options);
      if (isOneExpr(expanded.left)) return ONE;
      if (isZeroExpr(expanded.right)) return ONE;
      return emlPow(reduceTypes(expanded.left, options), reduceTypes(expanded.right, options));
    case 'sqrt':
      return emlPow(reduceTypes(expanded.value, options), lowerNumber('0.5'));
    default:
      if (options.strict) {
        throw new Error(`Unsupported exact lowering for ${expanded.kind}`);
      }
      throw new Error(`Internal lowering bug for ${expanded.kind}`);
  }
}

export function toPureEml(expr: Expr, options: LowerOptions = {}): Expr {
  return reduceTypes(expr, options);
}

export function standardCoreLibrary() {
  return {
    one: ONE,
    zero: emlZero(),
    exp: emlExp,
    ln: emlLn,
    add: emlAdd,
    sub: emlSub,
    neg: emlNeg,
    inv: emlInv,
    mul: emlMul,
    div: emlDiv,
    pow: emlPow,
    i: lowerConst('i'),
    pi: lowerConst('pi'),
  };
}
