import type { Expr } from "./ast";
import { eml, exprEquals, isNumericValue, num, variable } from "./ast";
import { countTokens } from "./analyze";
import { desugarElementary } from "./elementary";
import { parseRationalLiteral } from "./numeric";
import { toString } from "./print";
import { compressPureEml, type CompressionLevel, type SampleEnv } from "./synth";

export interface LowerOptions {
  strict?: boolean;
  compression?: CompressionLevel;
  compressionSamples?: SampleEnv[];
  validationSamples?: SampleEnv[];
  compressionBeamWidth?: number;
  compressionMaxLeaves?: number;
  maxDelta?: number;
  minTokenGain?: number;
}

const ONE = num(1);
let zeroCache: Expr | null = null;
let negInfinityCache: Expr | null = null;
let negativeOneCache: Expr | null = null;
let twoCache: Expr | null = null;
let iCache: Expr | null = null;
let piCache: Expr | null = null;
const intCache = new Map<string, Expr>();
const tokenCache = new WeakMap<Expr, number>();
const compressionCache = new Map<string, Expr>();
const exprKeyCache = new WeakMap<Expr, string>();
const expCache = new Map<string, Expr>();
const lnCache = new Map<string, Expr>();
const negCache = new Map<string, Expr>();
const invCache = new Map<string, Expr>();
const addCache = new Map<string, Expr>();
const subCache = new Map<string, Expr>();
const mulCache = new Map<string, Expr>();
const divCache = new Map<string, Expr>();
const powCache = new Map<string, Expr>();
const rationalCache = new Map<string, Expr>();
const CACHE_LIMIT = 4096;

function tokenCost(expr: Expr): number {
  const cached = tokenCache.get(expr);
  if (cached !== undefined) return cached;
  const value = countTokens(expr);
  tokenCache.set(expr, value);
  return value;
}

function exprKey(expr: Expr): string {
  const cached = exprKeyCache.get(expr);
  if (cached !== undefined) return cached;
  const key = toString(expr);
  exprKeyCache.set(expr, key);
  return key;
}

function setCapped<K, V>(map: Map<K, V>, key: K, value: V, limit = CACHE_LIMIT): void {
  if (!map.has(key) && map.size >= limit) {
    map.clear();
  }
  map.set(key, value);
}

function betterExpr(a: Expr, b: Expr): Expr {
  const aCost = tokenCost(a);
  const bCost = tokenCost(b);
  if (aCost !== bCost) return aCost < bCost ? a : b;
  return exprKey(a) <= exprKey(b) ? a : b;
}

function chooseShortest(...candidates: Expr[]): Expr {
  const seen = new Map<string, Expr>();
  for (const candidate of candidates) {
    const key = exprKey(candidate);
    const previous = seen.get(key);
    seen.set(key, previous ? betterExpr(previous, candidate) : candidate);
  }
  let best: Expr | null = null;
  for (const candidate of seen.values()) {
    best = best ? betterExpr(best, candidate) : candidate;
  }
  if (!best) throw new Error("Expected at least one lowering candidate");
  return best;
}

function compressionCacheKey(expr: Expr, options: LowerOptions): string {
  const sampleKey = (samples?: SampleEnv[]) =>
    samples
      ? samples
          .map((env) =>
            Object.keys(env)
              .sort()
              .map((key) => `${key}:${env[key]}`)
              .join(","),
          )
          .join(";")
      : "";
  return [
    exprKey(expr),
    String(options.compression ?? "off"),
    String(options.compressionBeamWidth ?? ""),
    String(options.compressionMaxLeaves ?? ""),
    String(options.maxDelta ?? ""),
    String(options.minTokenGain ?? ""),
    sampleKey(options.compressionSamples),
    sampleKey(options.validationSamples),
  ].join("|");
}

function maybeCompressPureEml(expr: Expr, options: LowerOptions): Expr {
  const compression = options.compression ?? "off";
  if (compression === "off" || compression === 0) return expr;
  if (tokenCost(expr) < 9) return expr;

  const key = compressionCacheKey(expr, options);
  const cached = compressionCache.get(key);
  if (cached) return cached;

  const compressed =
    compressPureEml(expr, {
      compression,
      samples: options.compressionSamples,
      validationSamples: options.validationSamples,
      beamWidth: options.compressionBeamWidth,
      maxLeaves: options.compressionMaxLeaves,
      maxDelta: options.maxDelta,
      minTokenGain: options.minTokenGain,
    })?.expr ?? expr;

  setCapped(compressionCache, key, compressed, 1024);
  return compressed;
}

export function emlExp(x: Expr): Expr {
  const key = exprKey(x);
  const cached = expCache.get(key);
  if (cached) return cached;
  const value = eml(x, ONE);
  setCapped(expCache, key, value);
  return value;
}

export function emlLn(x: Expr): Expr {
  const key = exprKey(x);
  const cached = lnCache.get(key);
  if (cached) return cached;
  const value = eml(ONE, eml(eml(ONE, x), ONE));
  setCapped(lnCache, key, value);
  return value;
}

export function emlZero(): Expr {
  zeroCache ??= emlLn(ONE);
  return zeroCache;
}

function emlNegInfinity(): Expr {
  // This compact seed evaluates to -Infinity and unlocks the short witnesses
  // for negation and reciprocal shown in Figure 2 of the paper.
  negInfinityCache ??= eml(ONE, eml(ONE, eml(ONE, eml(eml(ONE, ONE), ONE))));
  return negInfinityCache;
}

function emlSub(a: Expr, b: Expr): Expr {
  const key = `${exprKey(a)}|${exprKey(b)}`;
  const cached = subCache.get(key);
  if (cached) return cached;
  const value = eml(emlLn(a), emlExp(b));
  setCapped(subCache, key, value);
  return value;
}

function emlNeg(z: Expr): Expr {
  const key = exprKey(z);
  const cached = negCache.get(key);
  if (cached) return cached;
  const shortWitness = eml(emlNegInfinity(), emlExp(z));
  const generic = emlSub(emlZero(), z);
  const value = chooseShortest(shortWitness, generic);
  setCapped(negCache, key, value);
  return value;
}

function emlAdd(a: Expr, b: Expr): Expr {
  const ak = exprKey(a);
  const bk = exprKey(b);
  const key = ak <= bk ? `${ak}|${bk}` : `${bk}|${ak}`;
  const cached = addCache.get(key);
  if (cached) return cached;
  const value = chooseShortest(emlSub(a, emlNeg(b)), emlSub(b, emlNeg(a)));
  setCapped(addCache, key, value);
  return value;
}

function emlInv(z: Expr): Expr {
  const key = exprKey(z);
  const cached = invCache.get(key);
  if (cached) return cached;
  const shortWitness = eml(eml(emlNegInfinity(), z), ONE);
  const generic = emlExp(emlNeg(emlLn(z)));
  const value = chooseShortest(shortWitness, generic);
  setCapped(invCache, key, value);
  return value;
}

function emlMul(a: Expr, b: Expr): Expr {
  const ak = exprKey(a);
  const bk = exprKey(b);
  const key = ak <= bk ? `${ak}|${bk}` : `${bk}|${ak}`;
  const cached = mulCache.get(key);
  if (cached) return cached;
  // Compact multiplication witness from the paper/reference Figure 2.
  const shortWitness = eml(
    eml(
      ONE,
      eml(
        eml(eml(ONE, eml(eml(ONE, eml(ONE, a)), ONE)), eml(ONE, eml(eml(ONE, eml(b, ONE)), ONE))),
        ONE,
      ),
    ),
    ONE,
  );
  const generic = emlExp(emlAdd(emlLn(a), emlLn(b)));
  const value = chooseShortest(shortWitness, generic);
  setCapped(mulCache, key, value);
  return value;
}

function emlDiv(a: Expr, b: Expr): Expr {
  const key = `${exprKey(a)}|${exprKey(b)}`;
  const cached = divCache.get(key);
  if (cached) return cached;
  const value = chooseShortest(emlMul(a, emlInv(b)), emlExp(emlAdd(emlLn(a), emlNeg(emlLn(b)))));
  setCapped(divCache, key, value);
  return value;
}

function emlPow(a: Expr, b: Expr): Expr {
  const key = `${exprKey(a)}|${exprKey(b)}`;
  const cached = powCache.get(key);
  if (cached) return cached;
  const value = emlExp(emlMul(b, emlLn(a)));
  setCapped(powCache, key, value);
  return value;
}

function emlNegativeOne(): Expr {
  negativeOneCache ??= emlNeg(ONE);
  return negativeOneCache;
}

function emlTwo(): Expr {
  twoCache ??= emlInt(2n);
  return twoCache;
}

function exactRational(expr: Expr): { num: bigint; den: bigint } | null {
  if (expr.kind !== "num") return null;
  const value = parseRationalLiteral(expr.raw);
  return { num: value.num, den: value.den };
}

function emlPowInteger(base: Expr, exponent: bigint): Expr {
  if (exponent === 0n) return ONE;
  if (exponent === 1n) return base;
  if (exponent < 0n) return emlInv(emlPowInteger(base, -exponent));

  let acc: Expr | null = null;
  let factor = base;
  let n = exponent;
  while (n > 0n) {
    if ((n & 1n) === 1n) {
      acc = acc ? emlMul(acc, factor) : factor;
    }
    n >>= 1n;
    if (n > 0n) factor = emlMul(factor, factor);
  }

  return acc ?? ONE;
}

function emlInt(n: bigint): Expr {
  const key = n.toString();
  const cached = intCache.get(key);
  if (cached) return cached;

  let best: Expr;
  if (n === 1n) {
    best = ONE;
  } else if (n === 0n) {
    best = emlZero();
  } else if (n === -1n) {
    best = emlNegativeOne();
  } else if (n < 0n) {
    best = emlNeg(emlInt(-n));
  } else {
    let acc: Expr | null = null;
    let term: Expr = ONE;
    let k = n;

    while (k > 0n) {
      if ((k & 1n) === 1n) {
        acc = acc ? emlAdd(acc, term) : term;
      }
      k >>= 1n;
      if (k > 0n) term = emlAdd(term, term);
    }

    best = acc ?? emlZero();

    if (n <= 32n) {
      for (let left = 1n; left <= n / 2n; left += 1n) {
        best = chooseShortest(best, emlAdd(emlInt(left), emlInt(n - left)));
      }
      for (let factor = 2n; factor * factor <= n; factor += 1n) {
        if (n % factor === 0n) {
          best = chooseShortest(best, emlMul(emlInt(factor), emlInt(n / factor)));
        }
      }
    }
  }

  intCache.set(key, best);
  return best;
}

function emlRational(p: bigint, q: bigint): Expr {
  const key = `${p}/${q}`;
  const cached = rationalCache.get(key);
  if (cached) return cached;
  if (q === 1n) return emlInt(p);
  const numerator = emlInt(p < 0n ? -p : p);
  const denominator = emlInt(q);
  const magnitudeCandidates = [
    emlDiv(numerator, denominator),
    emlMul(numerator, emlInv(denominator)),
  ];
  if (p === 1n || p === -1n) {
    magnitudeCandidates.push(emlInv(denominator));
  }
  const magnitude = chooseShortest(...magnitudeCandidates);
  const value = p < 0n ? emlNeg(magnitude) : magnitude;
  setCapped(rationalCache, key, value);
  return value;
}

function lowerNumber(raw: string): Expr {
  const { num: p, den: q } = parseRationalLiteral(raw);
  return emlRational(p, q);
}

function lowerConst(name: "e" | "pi" | "i"): Expr {
  if (name === "e") {
    return emlExp(ONE);
  } else if (name === "i") {
    iCache ??= emlExp(emlDiv(emlLn(emlNegativeOne()), emlTwo()));
    return iCache;
  } else if (name === "pi") {
    piCache ??= chooseShortest(
      emlNeg(emlMul(lowerConst("i"), emlLn(emlNegativeOne()))),
      emlDiv(emlLn(emlNegativeOne()), lowerConst("i")),
    );
    return piCache;
  } else {
    throw new Error(`Unknown constant: ${name}`);
  }
}

function isZeroExpr(expr: Expr): boolean {
  return isNumericValue(expr, 0);
}

function isOneExpr(expr: Expr): boolean {
  return isNumericValue(expr, 1);
}

function isNegativeOneExpr(expr: Expr): boolean {
  return isNumericValue(expr, -1);
}

export function reduceTypes(expr: Expr, options: LowerOptions = {}): Expr {
  const expanded = desugarElementary(expr);
  const memo = new Map<string, Expr>();

  const lower = (node: Expr): Expr => {
    const key = exprKey(node);
    const cached = memo.get(key);
    if (cached) return cached;

    let result: Expr;
    switch (node.kind) {
      case "var":
        result = variable(node.name);
        break;
      case "num":
        result = lowerNumber(node.raw);
        break;
      case "const":
        result = lowerConst(node.name);
        break;
      case "eml":
        result = eml(lower(node.left), lower(node.right));
        break;
      case "exp":
        result = node.value.kind === "ln" ? lower(node.value.value) : emlExp(lower(node.value));
        break;
      case "ln":
        result = node.value.kind === "exp" ? lower(node.value.value) : emlLn(lower(node.value));
        break;
      case "neg":
        if (isZeroExpr(node.value)) {
          result = emlZero();
          break;
        }
        if (node.value.kind === "neg") {
          result = lower(node.value.value);
          break;
        }
        result = emlNeg(lower(node.value));
        break;
      case "add":
        if (isZeroExpr(node.left)) {
          result = lower(node.right);
          break;
        }
        if (isZeroExpr(node.right)) {
          result = lower(node.left);
          break;
        }
        if (node.left.kind === "neg") {
          result = emlSub(lower(node.right), lower(node.left.value));
          break;
        }
        if (node.right.kind === "neg") {
          result = emlSub(lower(node.left), lower(node.right.value));
          break;
        }
        result = emlAdd(lower(node.left), lower(node.right));
        break;
      case "sub":
        if (exprEquals(node.left, node.right)) {
          result = emlZero();
          break;
        }
        if (node.left.kind === "exp" && node.right.kind === "ln") {
          result = eml(lower(node.left.value), lower(node.right.value));
          break;
        }
        if (isZeroExpr(node.right)) {
          result = lower(node.left);
          break;
        }
        if (isZeroExpr(node.left)) {
          result = emlNeg(lower(node.right));
          break;
        }
        if (node.right.kind === "neg") {
          result = emlAdd(lower(node.left), lower(node.right.value));
          break;
        }
        result = emlSub(lower(node.left), lower(node.right));
        break;
      case "mul":
        if (isZeroExpr(node.left) || isZeroExpr(node.right)) {
          result = emlZero();
          break;
        }
        if (isOneExpr(node.left)) {
          result = lower(node.right);
          break;
        }
        if (isOneExpr(node.right)) {
          result = lower(node.left);
          break;
        }
        if (isNegativeOneExpr(node.left)) {
          result = emlNeg(lower(node.right));
          break;
        }
        if (isNegativeOneExpr(node.right)) {
          result = emlNeg(lower(node.left));
          break;
        }
        result = emlMul(lower(node.left), lower(node.right));
        break;
      case "div":
        if (isZeroExpr(node.left)) {
          result = emlZero();
          break;
        }
        if (isOneExpr(node.right)) {
          result = lower(node.left);
          break;
        }
        if (isNegativeOneExpr(node.right)) {
          result = emlNeg(lower(node.left));
          break;
        }
        if (isOneExpr(node.left)) {
          result = emlInv(lower(node.right));
          break;
        }
        result = emlDiv(lower(node.left), lower(node.right));
        break;
      case "pow": {
        if (isOneExpr(node.right)) {
          result = lower(node.left);
          break;
        }
        if (isOneExpr(node.left)) {
          result = ONE;
          break;
        }
        if (isZeroExpr(node.right)) {
          result = ONE;
          break;
        }
        const rationalExponent = exactRational(node.right);
        const loweredBase = lower(node.left);
        if (
          rationalExponent &&
          rationalExponent.den === 1n &&
          rationalExponent.num >= -8n &&
          rationalExponent.num <= 8n
        ) {
          result = emlPowInteger(loweredBase, rationalExponent.num);
          break;
        }
        if (rationalExponent && rationalExponent.num === 1n && rationalExponent.den === 2n) {
          result = emlExp(emlDiv(emlLn(loweredBase), emlTwo()));
          break;
        }
        result = emlPow(loweredBase, lower(node.right));
        break;
      }
      case "sqrt":
        result = emlExp(emlDiv(emlLn(lower(node.value)), emlTwo()));
        break;
      default:
        if (options.strict) {
          throw new Error(`Unsupported exact lowering for ${node.kind}`);
        }
        throw new Error(`Internal lowering bug for ${node.kind}`);
    }

    memo.set(key, result);
    return result;
  };

  return maybeCompressPureEml(lower(expanded), options);
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
    i: lowerConst("i"),
    pi: lowerConst("pi"),
  };
}
