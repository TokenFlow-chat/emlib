import type { Expr } from "./ast";
import { exprEquals, isNumericValue, num } from "./ast";
import { countTokens, countTypes } from "./analyze";
import { reduceTypes } from "./lower";
import { parse } from "./parser";
import { toString } from "./print";

export interface RewriteRule {
  name: string;
  apply(expr: Expr): Expr[];
}

function isOne(e: Expr): boolean {
  return isNumericValue(e, 1);
}
function isZero(e: Expr): boolean {
  return isNumericValue(e, 0);
}
function sameValue(a: Expr, b: Expr): boolean {
  return exprEquals(a, b);
}

const PLACEHOLDER_PREFIX = "__hole_";
const SHORT_NEG_PATTERN = parse("E(E(1,E(1,E(1,E(E(1,1),1)))),E(__hole_x,1))");
const SHORT_INV_PATTERN = parse("E(E(E(1,E(1,E(1,E(E(1,1),1)))),__hole_x),1)");
const SHORT_MUL_PATTERN = parse(
  "E(E(1,E(E(E(1,E(E(1,E(1,__hole_x)),1)),E(1,E(E(1,E(__hole_y,1)),1))),1)),1)",
);
const SHORT_DIV_PATTERN = parse(
  "E(E(1,E(E(E(1,E(E(1,E(1,__hole_x)),1)),E(1,E(E(1,E(E(E(E(1,E(1,E(1,E(E(1,1),1)))),__hole_y),1),1)),1))),1)),1)",
);

function isPlaceholder(pattern: Expr): boolean {
  return pattern.kind === "var" && pattern.name.startsWith(PLACEHOLDER_PREFIX);
}

function matchPattern(
  pattern: Expr,
  expr: Expr,
  bindings: Record<string, Expr> = {},
): Record<string, Expr> | null {
  if (isPlaceholder(pattern)) {
    const placeholder = pattern as Extract<Expr, { kind: "var" }>;
    const name = placeholder.name;
    const bound = bindings[name];
    if (!bound) {
      bindings[name] = expr;
      return bindings;
    }
    return exprEquals(bound, expr) ? bindings : null;
  }

  if (pattern.kind !== expr.kind) return null;
  switch (pattern.kind) {
    case "num": {
      const other = expr as typeof pattern;
      return pattern.raw === other.raw ? bindings : null;
    }
    case "var": {
      const other = expr as typeof pattern;
      return pattern.name === other.name ? bindings : null;
    }
    case "const": {
      const other = expr as typeof pattern;
      return pattern.name === other.name ? bindings : null;
    }
    case "eml":
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow": {
      const other = expr as typeof pattern;
      const left = matchPattern(pattern.left, other.left, bindings);
      return left ? matchPattern(pattern.right, other.right, left) : null;
    }
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
      return matchPattern(pattern.value, (expr as typeof pattern).value, bindings);
  }
}

export const coreRewriteRules: RewriteRule[] = [
  {
    name: "fold-basic",
    apply(expr) {
      switch (expr.kind) {
        case "add":
          if (isZero(expr.left)) return [expr.right];
          if (isZero(expr.right)) return [expr.left];
          break;
        case "sub":
          if (isZero(expr.right)) return [expr.left];
          if (sameValue(expr.left, expr.right)) return [num(0)];
          break;
        case "mul":
          if (isOne(expr.left)) return [expr.right];
          if (isOne(expr.right)) return [expr.left];
          if (sameValue(expr.left, expr.right))
            return [{ kind: "pow", left: expr.left, right: num(2) }];
          if (expr.left.kind === "div" && isOne(expr.left.left))
            return [{ kind: "div", left: expr.right, right: expr.left.right }];
          if (expr.right.kind === "div" && isOne(expr.right.left))
            return [{ kind: "div", left: expr.left, right: expr.right.right }];
          break;
        case "div":
          if (isOne(expr.right)) return [expr.left];
          if (sameValue(expr.left, expr.right)) return [num(1)];
          break;
        case "pow":
          if (isOne(expr.right)) return [expr.left];
          if (isOne(expr.left)) return [expr.left];
          break;
        case "neg":
          if (expr.value.kind === "neg") return [expr.value.value];
          break;
        case "ln":
          if (isOne(expr.value)) return [num(0)];
          if (expr.value.kind === "exp") return [expr.value.value];
          break;
        case "exp":
          if (expr.value.kind === "ln") return [expr.value.value];
          break;
        case "sin":
          if (expr.value.kind === "asin") return [expr.value.value];
          break;
        case "cos":
          if (expr.value.kind === "acos") return [expr.value.value];
          break;
        case "tan":
          if (expr.value.kind === "atan") return [expr.value.value];
          break;
        case "sinh":
          if (expr.value.kind === "asinh") return [expr.value.value];
          break;
        case "cosh":
          if (expr.value.kind === "acosh") return [expr.value.value];
          break;
        case "tanh":
          if (expr.value.kind === "atanh") return [expr.value.value];
          break;
        default:
          break;
      }
      return [];
    },
  },
  {
    name: "eml-short-neg",
    apply(expr) {
      const match = matchPattern(SHORT_NEG_PATTERN, expr);
      const x = match?.__hole_x;
      return x ? [{ kind: "neg", value: x }] : [];
    },
  },
  {
    name: "eml-short-inv",
    apply(expr) {
      const match = matchPattern(SHORT_INV_PATTERN, expr);
      const x = match?.__hole_x;
      return x ? [{ kind: "div", left: num(1), right: x }] : [];
    },
  },
  {
    name: "eml-short-mul",
    apply(expr) {
      const match = matchPattern(SHORT_MUL_PATTERN, expr);
      const x = match?.__hole_x;
      const y = match?.__hole_y;
      return x && y ? [{ kind: "mul", left: x, right: y }] : [];
    },
  },
  {
    name: "eml-short-div",
    apply(expr) {
      const match = matchPattern(SHORT_DIV_PATTERN, expr);
      const x = match?.__hole_x;
      const y = match?.__hole_y;
      return x && y ? [{ kind: "div", left: x, right: y }] : [];
    },
  },
  {
    name: "sub-exp-ln->eml",
    apply(expr) {
      if (expr.kind === "sub" && expr.left.kind === "exp" && expr.right.kind === "ln") {
        return [{ kind: "eml", left: expr.left.value, right: expr.right.value }];
      }
      return [];
    },
  },
  {
    name: "eml->exp",
    apply(expr) {
      return expr.kind === "eml" && isOne(expr.right) ? [{ kind: "exp", value: expr.left }] : [];
    },
  },
  {
    name: "eml->ln",
    apply(expr) {
      if (expr.kind === "eml" && isOne(expr.left)) {
        if (
          expr.right.kind === "eml" &&
          expr.right.left.kind === "eml" &&
          isOne(expr.right.left.left) &&
          isOne(expr.right.right)
        ) {
          return [{ kind: "ln", value: expr.right.left.right }];
        }
        if (
          expr.right.kind === "exp" &&
          expr.right.value.kind === "eml" &&
          isOne(expr.right.value.left)
        ) {
          return [{ kind: "ln", value: expr.right.value.right }];
        }
      }
      return [];
    },
  },
  {
    name: "eml->sub",
    apply(expr) {
      if (expr.kind === "eml" && expr.left.kind === "ln" && expr.right.kind === "exp") {
        return [{ kind: "sub", left: expr.left.value, right: expr.right.value }];
      }
      return [];
    },
  },
  {
    name: "algebraic-forms",
    apply(expr) {
      const out: Expr[] = [];
      if (expr.kind === "exp" && expr.value.kind === "add") {
        const { left, right } = expr.value;
        if (left.kind === "ln" && right.kind === "ln")
          out.push({ kind: "mul", left: left.value, right: right.value });
      }
      if (expr.kind === "exp" && expr.value.kind === "sub") {
        const { left, right } = expr.value;
        if (left.kind === "ln" && right.kind === "ln")
          out.push({ kind: "div", left: left.value, right: right.value });
      }
      if (expr.kind === "exp" && expr.value.kind === "mul") {
        const { left, right } = expr.value;
        if (left.kind === "ln") out.push({ kind: "pow", left: left.value, right });
        if (right.kind === "ln") out.push({ kind: "pow", left: right.value, right: left });
      }
      if (expr.kind === "pow" && expr.right.kind === "num" && expr.right.value === 0.5) {
        out.push({ kind: "sqrt", value: expr.left });
      }
      if (expr.kind === "sub" && isZero(expr.left)) {
        out.push({ kind: "neg", value: expr.right });
      }
      if (expr.kind === "sub" && expr.right.kind === "neg") {
        out.push({ kind: "add", left: expr.left, right: expr.right.value });
      }
      if (
        expr.kind === "div" &&
        expr.left.kind === "sin" &&
        expr.right.kind === "cos" &&
        sameValue(expr.left.value, expr.right.value)
      ) {
        out.push({ kind: "tan", value: expr.left.value });
      }
      if (
        expr.kind === "div" &&
        expr.left.kind === "cos" &&
        expr.right.kind === "sin" &&
        sameValue(expr.left.value, expr.right.value)
      ) {
        out.push({ kind: "cot", value: expr.left.value });
      }
      if (expr.kind === "div" && isOne(expr.left) && expr.right.kind === "cos") {
        out.push({ kind: "sec", value: expr.right.value });
      }
      if (expr.kind === "div" && isOne(expr.left) && expr.right.kind === "sin") {
        out.push({ kind: "csc", value: expr.right.value });
      }
      if (
        expr.kind === "div" &&
        expr.left.kind === "sinh" &&
        expr.right.kind === "cosh" &&
        sameValue(expr.left.value, expr.right.value)
      ) {
        out.push({ kind: "tanh", value: expr.left.value });
      }
      if (
        expr.kind === "div" &&
        expr.left.kind === "cosh" &&
        expr.right.kind === "sinh" &&
        sameValue(expr.left.value, expr.right.value)
      ) {
        out.push({ kind: "coth", value: expr.left.value });
      }
      if (expr.kind === "div" && isOne(expr.left) && expr.right.kind === "cosh") {
        out.push({ kind: "sech", value: expr.right.value });
      }
      if (expr.kind === "div" && isOne(expr.left) && expr.right.kind === "sinh") {
        out.push({ kind: "csch", value: expr.right.value });
      }
      return out;
    },
  },
];

function replaceAtPath(expr: Expr, path: number[], replacement: Expr): Expr {
  if (path.length === 0) return replacement;
  const [head, ...rest] = path;
  switch (expr.kind) {
    case "eml":
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
      return head === 0
        ? { ...expr, left: replaceAtPath(expr.left, rest, replacement) }
        : { ...expr, right: replaceAtPath(expr.right, rest, replacement) };
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
      return { ...expr, value: replaceAtPath(expr.value, rest, replacement) };
    default:
      throw new Error("Bad path");
  }
}

function collect(
  expr: Expr,
  path: number[] = [],
  out: Array<{ path: number[]; expr: Expr }> = [],
): Array<{ path: number[]; expr: Expr }> {
  out.push({ path, expr });
  switch (expr.kind) {
    case "eml":
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
      collect(expr.left, [...path, 0], out);
      collect(expr.right, [...path, 1], out);
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

const tokenScoreCache = new WeakMap<Expr, number>();
const exprKeyCache = new WeakMap<Expr, string>();

function exprKey(expr: Expr): string {
  const cached = exprKeyCache.get(expr);
  if (cached !== undefined) return cached;
  const key = toString(expr);
  exprKeyCache.set(expr, key);
  return key;
}

function tokenScore(expr: Expr): number {
  const cached = tokenScoreCache.get(expr);
  if (cached !== undefined) return cached;
  const score = countTokens(expr) + 0.05 * countTypes(expr);
  tokenScoreCache.set(expr, score);
  return score;
}

function readabilityPenalty(expr: Expr): number {
  switch (expr.kind) {
    case "mul":
      return (
        (sameValue(expr.left, expr.right) ? 4 : 1) +
        readabilityPenalty(expr.left) +
        readabilityPenalty(expr.right)
      );
    case "add":
      return 1 + readabilityPenalty(expr.left) + readabilityPenalty(expr.right);
    case "sub":
      return 2 + readabilityPenalty(expr.left) + readabilityPenalty(expr.right);
    case "pow":
      return readabilityPenalty(expr.left) + readabilityPenalty(expr.right);
    case "div":
      return readabilityPenalty(expr.left) + readabilityPenalty(expr.right);
    case "eml":
      return 3 + readabilityPenalty(expr.left) + readabilityPenalty(expr.right);
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
      return readabilityPenalty(expr.value);
    default:
      return 0;
  }
}

function compareReadable(a: Expr, b: Expr): number {
  const tokenDiff = countTokens(a) - countTokens(b);
  if (tokenDiff !== 0) return tokenDiff;
  const readabilityDiff = readabilityPenalty(a) - readabilityPenalty(b);
  if (readabilityDiff !== 0) return readabilityDiff;
  const typeDiff = countTypes(a) - countTypes(b);
  if (typeDiff !== 0) return typeDiff;
  return exprKey(a).localeCompare(exprKey(b));
}

function rewriteGreedy(expr: Expr, rules: RewriteRule[]): Expr {
  let current = expr;
  for (let iter = 0; iter < 24; iter += 1) {
    const next = rewriteGreedyStep(current, rules);
    if (exprKey(next) === exprKey(current)) return current;
    current = next;
  }
  return current;
}

function rewriteGreedyStep(expr: Expr, rules: RewriteRule[]): Expr {
  const direct = applyRules(expr, rules);
  let base = expr;
  switch (expr.kind) {
    case "eml":
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
      base = {
        ...expr,
        left: rewriteGreedyStep(expr.left, rules),
        right: rewriteGreedyStep(expr.right, rules),
      };
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
      base = { ...expr, value: rewriteGreedyStep(expr.value, rules) };
      break;
    default:
      break;
  }

  const rewrittenBase = applyRules(base, rules);
  return compareReadable(direct, rewrittenBase) <= 0 ? direct : rewrittenBase;
}

function applyRules(expr: Expr, rules: RewriteRule[]): Expr {
  let best = expr;
  for (const rule of rules) {
    for (const candidate of rule.apply(expr)) {
      if (compareReadable(candidate, best) < 0) {
        best = candidate;
      }
    }
  }
  return best;
}

function canonicalizeReadable(expr: Expr, rules: RewriteRule[]): Expr {
  let current = expr;
  for (let i = 0; i < 16; i += 1) {
    const next = rewriteGreedyStep(current, rules);
    if (exprKey(next) === exprKey(current)) return current;
    current = next;
  }
  return current;
}

function optimize(root: Expr, options: SearchOptions = {}): Expr {
  const maxStates = options.maxStates ?? 1500;
  const beamWidth = options.beamWidth ?? 64;
  const rules = options.rules ?? coreRewriteRules;
  const seed = rewriteGreedy(root, rules);
  const queue: Expr[] = [seed];
  const seen = new Set<string>();
  const neighborCache = new Map<string, Expr[]>();
  let best = seed;
  let bestScore = tokenScore(seed);

  for (let iter = 0; iter < maxStates && queue.length > 0; iter += 1) {
    queue.sort((a, b) => tokenScore(a) - tokenScore(b));
    const current = queue.shift() as Expr;
    const key = exprKey(current);
    if (seen.has(key)) continue;
    seen.add(key);

    const currentScore = tokenScore(current);
    if (currentScore < bestScore) {
      best = current;
      bestScore = currentScore;
    }

    const next =
      neighborCache.get(key) ??
      (() => {
        const neighbors: Expr[] = [];
        for (const { path, expr } of collect(current)) {
          for (const rule of rules) {
            for (const candidate of rule.apply(expr)) {
              neighbors.push(replaceAtPath(current, path, candidate));
            }
          }
        }
        neighborCache.set(key, neighbors);
        return neighbors;
      })();

    next.sort((a, b) => tokenScore(a) - tokenScore(b));
    for (const candidate of next.slice(0, beamWidth)) {
      const candidateKey = exprKey(candidate);
      if (!seen.has(candidateKey)) queue.push(candidate);
    }
  }

  return best;
}

export function reduceTokens(root: Expr, options: SearchOptions = {}): Expr {
  const rules = options.rules ?? coreRewriteRules;
  const seed = optimize(root, options);
  const emlSeed = optimize(reduceTypes(root), options);
  const best = compareReadable(emlSeed, seed) < 0 ? emlSeed : seed;
  return canonicalizeReadable(best, rules);
}

export function simplifyToElementary(root: Expr, options: SearchOptions = {}): Expr {
  return reduceTokens(root, options);
}
