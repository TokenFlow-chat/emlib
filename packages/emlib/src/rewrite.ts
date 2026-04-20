import type { Expr } from './ast';
import { exprEquals, isNumericValue, num } from './ast';
import { countTokens, countTypes } from './analyze';
import { reduceTypes } from './lower';
import { toString } from './print';

export interface RewriteRule {
  name: string;
  apply(expr: Expr): Expr[];
}

function isOne(e: Expr): boolean { return isNumericValue(e, 1); }
function isZero(e: Expr): boolean { return isNumericValue(e, 0); }
function sameValue(a: Expr, b: Expr): boolean { return exprEquals(a, b); }

export const coreRewriteRules: RewriteRule[] = [
  {
    name: 'fold-basic',
    apply(expr) {
      switch (expr.kind) {
        case 'add':
          if (isZero(expr.left)) return [expr.right];
          if (isZero(expr.right)) return [expr.left];
          break;
        case 'sub':
          if (isZero(expr.right)) return [expr.left];
          break;
        case 'mul':
          if (isOne(expr.left)) return [expr.right];
          if (isOne(expr.right)) return [expr.left];
          break;
        case 'div':
          if (isOne(expr.right)) return [expr.left];
          break;
        case 'pow':
          if (isOne(expr.right)) return [expr.left];
          if (isOne(expr.left)) return [expr.left];
          break;
        case 'neg':
          if (expr.value.kind === 'neg') return [expr.value.value];
          break;
        case 'ln':
          if (isOne(expr.value)) return [num(0)];
          if (expr.value.kind === 'exp') return [expr.value.value];
          break;
        case 'exp':
          if (expr.value.kind === 'ln') return [expr.value.value];
          break;
        case 'sin':
          if (expr.value.kind === 'asin') return [expr.value.value];
          break;
        case 'cos':
          if (expr.value.kind === 'acos') return [expr.value.value];
          break;
        case 'tan':
          if (expr.value.kind === 'atan') return [expr.value.value];
          break;
        case 'sinh':
          if (expr.value.kind === 'asinh') return [expr.value.value];
          break;
        case 'cosh':
          if (expr.value.kind === 'acosh') return [expr.value.value];
          break;
        case 'tanh':
          if (expr.value.kind === 'atanh') return [expr.value.value];
          break;
        default:
          break;
      }
      return [];
    },
  },
  {
    name: 'sub-exp-ln->eml',
    apply(expr) {
      if (expr.kind === 'sub' && expr.left.kind === 'exp' && expr.right.kind === 'ln') {
        return [{ kind: 'eml', left: expr.left.value, right: expr.right.value }];
      }
      return [];
    },
  },
  {
    name: 'eml->exp',
    apply(expr) {
      return expr.kind === 'eml' && isOne(expr.right) ? [{ kind: 'exp', value: expr.left }] : [];
    },
  },
  {
    name: 'eml->ln',
    apply(expr) {
      if (expr.kind === 'eml' && isOne(expr.left)) {
        if (
          expr.right.kind === 'eml' &&
          expr.right.left.kind === 'eml' &&
          isOne(expr.right.left.left) &&
          isOne(expr.right.right)
        ) {
          return [{ kind: 'ln', value: expr.right.left.right }];
        }
        if (
          expr.right.kind === 'exp' &&
          expr.right.value.kind === 'eml' &&
          isOne(expr.right.value.left)
        ) {
          return [{ kind: 'ln', value: expr.right.value.right }];
        }
      }
      return [];
    },
  },
  {
    name: 'eml->sub',
    apply(expr) {
      if (expr.kind === 'eml' && expr.left.kind === 'ln' && expr.right.kind === 'exp') {
        return [{ kind: 'sub', left: expr.left.value, right: expr.right.value }];
      }
      return [];
    },
  },
  {
    name: 'algebraic-forms',
    apply(expr) {
      const out: Expr[] = [];
      if (expr.kind === 'exp' && expr.value.kind === 'add') {
        const { left, right } = expr.value;
        if (left.kind === 'ln' && right.kind === 'ln') out.push({ kind: 'mul', left: left.value, right: right.value });
      }
      if (expr.kind === 'exp' && expr.value.kind === 'sub') {
        const { left, right } = expr.value;
        if (left.kind === 'ln' && right.kind === 'ln') out.push({ kind: 'div', left: left.value, right: right.value });
      }
      if (expr.kind === 'exp' && expr.value.kind === 'mul') {
        const { left, right } = expr.value;
        if (left.kind === 'ln') out.push({ kind: 'pow', left: left.value, right });
        if (right.kind === 'ln') out.push({ kind: 'pow', left: right.value, right: left });
      }
      if (expr.kind === 'pow' && expr.right.kind === 'num' && expr.right.value === 0.5) {
        out.push({ kind: 'sqrt', value: expr.left });
      }
      if (expr.kind === 'sub' && isZero(expr.left)) {
        out.push({ kind: 'neg', value: expr.right });
      }
      if (expr.kind === 'sub' && expr.right.kind === 'neg') {
        out.push({ kind: 'add', left: expr.left, right: expr.right.value });
      }
      if (expr.kind === 'div' && expr.left.kind === 'sin' && expr.right.kind === 'cos' && sameValue(expr.left.value, expr.right.value)) {
        out.push({ kind: 'tan', value: expr.left.value });
      }
      if (expr.kind === 'div' && expr.left.kind === 'cos' && expr.right.kind === 'sin' && sameValue(expr.left.value, expr.right.value)) {
        out.push({ kind: 'cot', value: expr.left.value });
      }
      if (expr.kind === 'div' && isOne(expr.left) && expr.right.kind === 'cos') {
        out.push({ kind: 'sec', value: expr.right.value });
      }
      if (expr.kind === 'div' && isOne(expr.left) && expr.right.kind === 'sin') {
        out.push({ kind: 'csc', value: expr.right.value });
      }
      if (expr.kind === 'div' && expr.left.kind === 'sinh' && expr.right.kind === 'cosh' && sameValue(expr.left.value, expr.right.value)) {
        out.push({ kind: 'tanh', value: expr.left.value });
      }
      if (expr.kind === 'div' && expr.left.kind === 'cosh' && expr.right.kind === 'sinh' && sameValue(expr.left.value, expr.right.value)) {
        out.push({ kind: 'coth', value: expr.left.value });
      }
      if (expr.kind === 'div' && isOne(expr.left) && expr.right.kind === 'cosh') {
        out.push({ kind: 'sech', value: expr.right.value });
      }
      if (expr.kind === 'div' && isOne(expr.left) && expr.right.kind === 'sinh') {
        out.push({ kind: 'csch', value: expr.right.value });
      }
      return out;
    },
  },
];

function replaceAtPath(expr: Expr, path: number[], replacement: Expr): Expr {
  if (path.length === 0) return replacement;
  const [head, ...rest] = path;
  switch (expr.kind) {
    case 'eml':
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow':
      return head === 0
        ? { ...expr, left: replaceAtPath(expr.left, rest, replacement) }
        : { ...expr, right: replaceAtPath(expr.right, rest, replacement) };
    case 'neg':
    case 'exp':
    case 'ln':
    case 'sqrt':
    case 'sin':
    case 'cos':
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
      return { ...expr, value: replaceAtPath(expr.value, rest, replacement) };
    default:
      throw new Error('Bad path');
  }
}

function collect(expr: Expr, path: number[] = [], out: Array<{ path: number[]; expr: Expr }> = []): Array<{ path: number[]; expr: Expr }> {
  out.push({ path, expr });
  switch (expr.kind) {
    case 'eml':
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow':
      collect(expr.left, [...path, 0], out);
      collect(expr.right, [...path, 1], out);
      break;
    case 'neg':
    case 'exp':
    case 'ln':
    case 'sqrt':
    case 'sin':
    case 'cos':
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
      collect(expr.value, [...path, 0], out);
      break;
    default:
      break;
  }
  return out;
}

export interface SearchOptions {
  maxStates?: number;
  beamWidth?: number;
  rules?: RewriteRule[];
}

function tokenScore(expr: Expr): number {
  return countTokens(expr) + 0.05 * countTypes(expr);
}

function rewriteGreedy(expr: Expr, rules: RewriteRule[]): Expr {
  let current = expr;
  for (let iter = 0; iter < 24; iter += 1) {
    const next = rewriteGreedyStep(current, rules);
    if (toString(next) === toString(current)) return current;
    current = next;
  }
  return current;
}

function rewriteGreedyStep(expr: Expr, rules: RewriteRule[]): Expr {
  let base = expr;
  switch (expr.kind) {
    case 'eml':
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow':
      base = { ...expr, left: rewriteGreedyStep(expr.left, rules), right: rewriteGreedyStep(expr.right, rules) };
      break;
    case 'neg':
    case 'exp':
    case 'ln':
    case 'sqrt':
    case 'sin':
    case 'cos':
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
      base = { ...expr, value: rewriteGreedyStep(expr.value, rules) };
      break;
    default:
      break;
  }

  let best = base;
  let bestScore = tokenScore(base);
  for (const rule of rules) {
    for (const candidate of rule.apply(base)) {
      const score = tokenScore(candidate);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }
  return best;
}

function optimize(root: Expr, options: SearchOptions = {}): Expr {
  const maxStates = options.maxStates ?? 1500;
  const beamWidth = options.beamWidth ?? 64;
  const rules = options.rules ?? coreRewriteRules;
  const seed = rewriteGreedy(root, rules);
  const queue: Expr[] = [seed];
  const seen = new Set<string>();
  let best = seed;
  let bestScore = tokenScore(seed);

  for (let iter = 0; iter < maxStates && queue.length > 0; iter += 1) {
    queue.sort((a, b) => tokenScore(a) - tokenScore(b));
    const current = queue.shift() as Expr;
    const key = toString(current);
    if (seen.has(key)) continue;
    seen.add(key);

    const currentScore = tokenScore(current);
    if (currentScore < bestScore) {
      best = current;
      bestScore = currentScore;
    }

    const next: Expr[] = [];
    for (const { path, expr } of collect(current)) {
      for (const rule of rules) {
        for (const candidate of rule.apply(expr)) {
          next.push(replaceAtPath(current, path, candidate));
        }
      }
    }

    next.sort((a, b) => tokenScore(a) - tokenScore(b));
    for (const candidate of next.slice(0, beamWidth)) {
      const candidateKey = toString(candidate);
      if (!seen.has(candidateKey)) queue.push(candidate);
    }
  }

  return best;
}

export function reduceTokens(root: Expr, options: SearchOptions = {}): Expr {
  const seed = optimize(root, options);
  const emlSeed = optimize(reduceTypes(root), options);
  return tokenScore(emlSeed) < tokenScore(seed) ? emlSeed : seed;
}

export function simplifyToElementary(root: Expr, options: SearchOptions = {}): Expr {
  return reduceTokens(root, options);
}
