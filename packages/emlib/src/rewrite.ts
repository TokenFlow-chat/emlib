import type { Expr } from "./ast";
import { exprEquals, isNumericValue, num } from "./ast";
import { countTokens, countTypes } from "./analyze";
import { reduceTypes } from "./lower";
import { evaluateLossless, valueToExpr } from "./numeric";
import { parse } from "./parser";
import { toString } from "./print";

// ============================================================================
// Types
// ============================================================================

export interface RewriteRule {
  name: string;
  apply(expr: Expr): Expr[];
}

type UnaryExprNode = Extract<Expr, { value: Expr }>;
type BinaryExprNode = Extract<Expr, { left: Expr; right: Expr }>;

type PatternAtom = Extract<Expr, { kind: "num" | "var" | "const" }>;
type PatternHole = { kind: "hole"; name: string };
type PatternUnaryNode = { kind: UnaryExprNode["kind"]; value: PatternExpr };
type PatternBinaryNode = { kind: BinaryExprNode["kind"]; left: PatternExpr; right: PatternExpr };
type PatternExpr = PatternAtom | PatternHole | PatternUnaryNode | PatternBinaryNode;

type TemplateSpec = readonly [name: string, pattern: string, replacement: string];
type TemplateCompileOptions = { lowerPattern?: boolean };

type PatternBindings = Map<string, Expr>;

interface PatternTemplate {
  name: string;
  pattern: PatternExpr;
  replacement: PatternExpr;
}

// ============================================================================
// Constants
// ============================================================================

const EXACT_NUMERIC_LIMIT = 32;
const EXACT_RATIONAL_DEN_LIMIT = 16;
const EXACT_RATIONAL_NUM_LIMIT = 16;
const PATTERN_HOLE_RE = /\?([A-Za-z_][A-Za-z0-9_]*)/g;

const UNARY_PATTERN_KINDS = [
  "exp",
  "ln",
  "sqrt",
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "sinh",
  "cosh",
  "tanh",
  "coth",
  "sech",
  "csch",
  "asin",
  "acos",
  "atan",
  "asec",
  "acsc",
  "acot",
  "asinh",
  "acosh",
  "atanh",
] as const;

const EXACT_PURE_BINARY_SOURCES = ["-?x", "?x+?y", "?x-?y", "?x*?y", "?x/?y", "?x^?y"] as const;

const SHORT_TEMPLATE_SPECS: readonly TemplateSpec[] = [
  ["eml-short-neg", "E(E(1,E(1,E(1,E(E(1,1),1)))),E(?x,1))", "-?x"],
  ["eml-short-inv", "E(E(E(1,E(1,E(1,E(E(1,1),1)))),?x),1)", "1/?x"],
  ["eml-short-mul", "E(E(1,E(E(E(1,E(E(1,E(1,?x)),1)),E(1,E(E(1,E(?y,1)),1))),1)),1)", "?x*?y"],
  [
    "eml-short-div",
    "E(E(1,E(E(E(1,E(E(1,E(1,?x)),1)),E(1,E(E(1,E(E(E(E(1,E(1,E(1,E(E(1,1),1)))),?y),1),1)),1))),1)),1)",
    "?x/?y",
  ],
];

const ALGEBRAIC_TEMPLATE_SPECS: readonly TemplateSpec[] = [
  ["exp-ln-mul", "exp(ln(?x)+ln(?y))", "?x*?y"],
  ["exp-ln-div", "exp(ln(?x)-ln(?y))", "?x/?y"],
  ["exp-ln-pow-left", "exp(ln(?x)*?y)", "?x^?y"],
  ["exp-ln-pow-right", "exp(?y*ln(?x))", "?x^?y"],
  ["pow-half-sqrt", "?x^0.5", "sqrt(?x)"],
  ["zero-sub-neg", "0-?x", "-?x"],
  ["sub-neg-add", "?x-(-?y)", "?x+?y"],
  ["sin-over-cos", "sin(?x)/cos(?x)", "tan(?x)"],
  ["cos-over-sin", "cos(?x)/sin(?x)", "cot(?x)"],
  ["inv-cos", "1/cos(?x)", "sec(?x)"],
  ["inv-sin", "1/sin(?x)", "csc(?x)"],
  ["sin-over-tan", "sin(?x)/tan(?x)", "cos(?x)"],
  ["cos-over-cot", "cos(?x)/cot(?x)", "sin(?x)"],
  ["sinh-over-cosh", "sinh(?x)/cosh(?x)", "tanh(?x)"],
  ["cosh-over-sinh", "cosh(?x)/sinh(?x)", "coth(?x)"],
  ["inv-cosh", "1/cosh(?x)", "sech(?x)"],
  ["inv-sinh", "1/sinh(?x)", "csch(?x)"],
  ["sinh-over-tanh", "sinh(?x)/tanh(?x)", "cosh(?x)"],
  ["cosh-over-coth", "cosh(?x)/coth(?x)", "sinh(?x)"],
  ["tan-times-cos-left", "tan(?x)*cos(?x)", "sin(?x)"],
  ["tan-times-cos-right", "cos(?x)*tan(?x)", "sin(?x)"],
  ["cot-times-sin-left", "cot(?x)*sin(?x)", "cos(?x)"],
  ["cot-times-sin-right", "sin(?x)*cot(?x)", "cos(?x)"],
  ["tanh-times-cosh-left", "tanh(?x)*cosh(?x)", "sinh(?x)"],
  ["tanh-times-cosh-right", "cosh(?x)*tanh(?x)", "sinh(?x)"],
  ["coth-times-sinh-left", "coth(?x)*sinh(?x)", "cosh(?x)"],
  ["coth-times-sinh-right", "sinh(?x)*coth(?x)", "cosh(?x)"],
];

// Set of unary expression kinds for O(1) lookup in readabilityPenalty.
const UNARY_KINDS = new Set<string>([
  "neg",
  "exp",
  "ln",
  "sqrt",
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "sinh",
  "cosh",
  "tanh",
  "coth",
  "sech",
  "csch",
  "asin",
  "acos",
  "atan",
  "asec",
  "acsc",
  "acot",
  "asinh",
  "acosh",
  "atanh",
]);

// ============================================================================
// Lazy-initialized globals
// ============================================================================

let exactPureLiteralMap: Map<string, Expr> | null = null;
let shortTemplates: PatternTemplate[] | null = null;
let shortTemplateRules: RewriteRule[] | null = null;
let exactPurePatterns: PatternTemplate[] | null = null;
let algebraicTemplates: PatternTemplate[] | null = null;
let earlyPureLiftRules: RewriteRule[] | null = null;

const exactPureLiftCache = new WeakMap<Expr, Expr>();
const exactFoldCache = new WeakMap<Expr, Expr>();
const containsVariableCache = new WeakMap<Expr, boolean>();
const containsEmlCache = new WeakMap<Expr, boolean>();

// ============================================================================
// Simple predicates
// ============================================================================

function isOne(e: Expr): boolean {
  return isNumericValue(e, 1);
}
function isZero(e: Expr): boolean {
  return isNumericValue(e, 0);
}
function sameValue(a: Expr, b: Expr): boolean {
  return exprEquals(a, b);
}

function isBinaryExpr(expr: Expr): expr is BinaryExprNode {
  return typeof expr === "object" && expr !== null && "left" in expr && "right" in expr;
}

function isUnaryExpr(expr: Expr): expr is UnaryExprNode {
  return typeof expr === "object" && expr !== null && "value" in expr && !("raw" in expr);
}

function isPatternBinaryExpr(pattern: PatternExpr): pattern is PatternBinaryNode {
  return "left" in pattern && "right" in pattern;
}

function isPatternUnaryExpr(pattern: PatternExpr): pattern is PatternUnaryNode {
  return "value" in pattern && !("raw" in pattern);
}

// ============================================================================
// Child rewriting
// ============================================================================

function rewriteChildren(expr: Expr, recurse: (child: Expr) => Expr): Expr {
  if (isBinaryExpr(expr)) {
    const left = recurse(expr.left);
    const right = recurse(expr.right);
    return left === expr.left && right === expr.right ? expr : { ...expr, left, right };
  }
  if (isUnaryExpr(expr)) {
    const value = recurse(expr.value);
    return value === expr.value ? expr : { ...expr, value };
  }
  return expr;
}

// ============================================================================
// Pattern system
// ============================================================================

function patternNodeCount(pattern: PatternExpr): number {
  if (pattern.kind === "hole") return 1;
  if (isPatternBinaryExpr(pattern)) {
    return 1 + patternNodeCount(pattern.left) + patternNodeCount(pattern.right);
  }
  if (isPatternUnaryExpr(pattern)) {
    return 1 + patternNodeCount(pattern.value);
  }
  return 1;
}

/**
 * Convert an Expr into a PatternExpr by treating variables whose names appear
 * in `varToHole` as pattern holes.
 */
function exprToPattern(expr: Expr, varToHole: ReadonlyMap<string, string>): PatternExpr {
  if (expr.kind === "var") {
    const holeName = varToHole.get(expr.name);
    return holeName ? { kind: "hole", name: holeName } : expr;
  }
  if (isBinaryExpr(expr)) {
    return {
      kind: expr.kind,
      left: exprToPattern(expr.left, varToHole),
      right: exprToPattern(expr.right, varToHole),
    };
  }
  if (isUnaryExpr(expr)) {
    return { kind: expr.kind, value: exprToPattern(expr.value, varToHole) };
  }
  return expr;
}

/**
 * Compile a pattern source string into a PatternExpr.
 *
 * Because the parser does not natively support `?name` hole syntax, we replace
 * each hole with a short synthetic variable (`__hN__`) before parsing, then
 * map those variables back to holes afterwards. Identical hole names (e.g.
 * multiple occurrences of `?x`) share the same synthetic variable, keeping
 * the AST compact and intuitive.
 */
function compilePattern(source: string, lowerPattern = false): PatternExpr {
  const holeToVar = new Map<string, string>();
  let nextId = 0;

  const rewritten = source.replace(PATTERN_HOLE_RE, (_whole, holeName: string) => {
    let varName = holeToVar.get(holeName);
    if (!varName) {
      varName = `__h${nextId++}__`;
      holeToVar.set(holeName, varName);
    }
    return varName;
  });

  const parsed = parse(rewritten);
  const materialized = lowerPattern ? reduceTypes(parsed) : parsed;

  // Invert the mapping so exprToPattern can look up holes by variable name.
  const varToHole = new Map<string, string>();
  for (const [hole, v] of holeToVar) {
    varToHole.set(v, hole);
  }

  return exprToPattern(materialized, varToHole);
}

function compileTemplate(
  name: string,
  patternSource: string,
  replacementSource: string,
  options: TemplateCompileOptions = {},
): PatternTemplate {
  return {
    name,
    pattern: compilePattern(patternSource, options.lowerPattern ?? false),
    replacement: compilePattern(replacementSource),
  };
}

function compileTemplates(
  specs: readonly TemplateSpec[],
  options: TemplateCompileOptions = {},
): PatternTemplate[] {
  return specs.map(([name, pattern, replacement]) =>
    compileTemplate(name, pattern, replacement, options),
  );
}

/**
 * Match a pattern against an expression, returning bindings for all holes.
 * Implemented iteratively to avoid stack overflow on deeply nested ASTs.
 */
function matchPattern(
  pattern: PatternExpr,
  expr: Expr,
  bindings: PatternBindings = new Map(),
): PatternBindings | null {
  const stack: Array<[PatternExpr, Expr]> = [[pattern, expr]];

  while (stack.length > 0) {
    const [p, e] = stack.pop()!;

    if (p.kind === "hole") {
      const bound = bindings.get(p.name);
      if (bound === undefined) {
        bindings.set(p.name, e);
      } else if (!exprEquals(bound, e)) {
        return null;
      }
      continue;
    }

    if (p.kind !== e.kind) return null;

    if (p.kind === "num") {
      if ((e as { raw: string }).raw !== p.raw) return null;
      continue;
    }

    if (p.kind === "var") {
      if ((e as { name: string }).name !== p.name) return null;
      continue;
    }

    if (p.kind === "const") {
      if ((e as { name: string }).name !== p.name) return null;
      continue;
    }

    if (isPatternBinaryExpr(p) && isBinaryExpr(e)) {
      // Push right first so left is processed first (LIFO).
      stack.push([p.right, e.right]);
      stack.push([p.left, e.left]);
      continue;
    }

    if (isPatternUnaryExpr(p) && isUnaryExpr(e)) {
      stack.push([p.value, e.value]);
      continue;
    }

    return null;
  }

  return bindings;
}

function instantiatePattern(
  pattern: PatternExpr,
  bindings: ReadonlyMap<string, Expr>,
  recurse: (expr: Expr) => Expr = (expr) => expr,
): Expr {
  if (pattern.kind === "hole") {
    const bound = bindings.get(pattern.name);
    if (!bound) throw new Error(`Missing binding for ?${pattern.name}`);
    return recurse(bound);
  }
  if (isPatternBinaryExpr(pattern)) {
    return {
      kind: pattern.kind,
      left: instantiatePattern(pattern.left, bindings, recurse),
      right: instantiatePattern(pattern.right, bindings, recurse),
    };
  }
  if (isPatternUnaryExpr(pattern)) {
    return { kind: pattern.kind, value: instantiatePattern(pattern.value, bindings, recurse) };
  }
  return pattern;
}

function createTemplateRule(template: PatternTemplate): RewriteRule {
  return {
    name: template.name,
    apply(expr) {
      const bindings = matchPattern(template.pattern, expr);
      return bindings ? [instantiatePattern(template.replacement, bindings)] : [];
    },
  };
}

function addTemplateMatches(expr: Expr, templates: readonly PatternTemplate[], out: Expr[]): void {
  for (const template of templates) {
    const bindings = matchPattern(template.pattern, expr);
    if (bindings) out.push(instantiatePattern(template.replacement, bindings));
  }
}

// ============================================================================
// Exact pure forms & helpers
// ============================================================================

function smallIntGcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function exactPureLiteralSources(): string[] {
  const out = new Set<string>(["0", "e", "i", "pi"]);
  for (let n = -EXACT_NUMERIC_LIMIT; n <= EXACT_NUMERIC_LIMIT; n += 1) {
    out.add(String(n));
  }
  for (let den = 2; den <= EXACT_RATIONAL_DEN_LIMIT; den += 1) {
    for (let numer = -EXACT_RATIONAL_NUM_LIMIT; numer <= EXACT_RATIONAL_NUM_LIMIT; numer += 1) {
      if (numer === 0 || smallIntGcd(numer, den) !== 1) continue;
      out.add(`${numer}/${den}`);
    }
  }
  return [...out];
}

function getExactPureLiteralMap(): Map<string, Expr> {
  if (exactPureLiteralMap) return exactPureLiteralMap;

  const map = new Map<string, Expr>();
  for (const source of exactPureLiteralSources()) {
    const parsed = parse(source);
    const lowered = reduceTypes(parsed);
    const loweredKey = exprKey(lowered);
    const previous = map.get(loweredKey);
    const replacement = parsed;
    if (!previous || compareReadable(replacement, previous) < 0) {
      map.set(loweredKey, replacement);
    }
  }

  exactPureLiteralMap = map;
  return map;
}

function getShortTemplates(): readonly PatternTemplate[] {
  if (shortTemplates) return shortTemplates;
  shortTemplates = compileTemplates(SHORT_TEMPLATE_SPECS);
  return shortTemplates;
}

function getShortTemplateRules(): readonly RewriteRule[] {
  if (shortTemplateRules) return shortTemplateRules;
  shortTemplateRules = getShortTemplates().map(createTemplateRule);
  return shortTemplateRules;
}

function getExactPurePatterns(): readonly PatternTemplate[] {
  if (exactPurePatterns) return exactPurePatterns;

  const specs: TemplateSpec[] = [
    ...UNARY_PATTERN_KINDS.map((kind) => [`pure-${kind}`, `${kind}(?x)`, `${kind}(?x)`] as const),
    ...EXACT_PURE_BINARY_SOURCES.map((source) => [`pure-${source}`, source, source] as const),
  ];
  const patterns = compileTemplates(specs, { lowerPattern: true });

  patterns.sort(
    (a, b) =>
      patternNodeCount(b.pattern) - patternNodeCount(a.pattern) ||
      b.name.length - a.name.length ||
      0,
  );

  exactPurePatterns = patterns;
  return patterns;
}

function getAlgebraicTemplates(): readonly PatternTemplate[] {
  if (algebraicTemplates) return algebraicTemplates;
  algebraicTemplates = compileTemplates(ALGEBRAIC_TEMPLATE_SPECS);
  return algebraicTemplates;
}

function getEarlyPureLiftRules(): RewriteRule[] {
  if (earlyPureLiftRules) return earlyPureLiftRules;
  earlyPureLiftRules = [foldBasicRule, ...getShortTemplateRules()];
  return earlyPureLiftRules;
}

function containsVariable(expr: Expr): boolean {
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

function containsEml(expr: Expr): boolean {
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

function liftExactPureForms(expr: Expr): Expr {
  const cached = exactPureLiftCache.get(expr);
  if (cached) return cached;

  const ruleLift = applyRules(expr, getEarlyPureLiftRules());
  if (compareReadable(ruleLift, expr) < 0 && !containsEml(ruleLift)) {
    const lifted = liftExactPureForms(ruleLift);
    exactPureLiftCache.set(expr, lifted);
    return lifted;
  }

  const directLiteral = getExactPureLiteralMap().get(exprKey(expr));
  if (directLiteral) {
    exactPureLiftCache.set(expr, directLiteral);
    return directLiteral;
  }

  for (const pattern of getExactPurePatterns()) {
    const bindings = matchPattern(pattern.pattern, expr);
    if (bindings) {
      const lifted = instantiatePattern(pattern.replacement, bindings, liftExactPureForms);
      exactPureLiftCache.set(expr, lifted);
      return lifted;
    }
  }

  const rebuilt = rewriteChildren(expr, liftExactPureForms);

  const normalized = applyRules(rebuilt, coreRewriteRules);
  const lifted = compareReadable(normalized, rebuilt) < 0 ? normalized : rebuilt;
  exactPureLiftCache.set(expr, lifted);
  return lifted;
}

function foldExactSubexpressions(expr: Expr): Expr {
  const cached = exactFoldCache.get(expr);
  if (cached) return cached;

  const rebuilt = rewriteChildren(expr, foldExactSubexpressions);

  let folded = rebuilt;
  if (!containsVariable(rebuilt)) {
    const exactValue = valueToExpr(evaluateLossless(rebuilt));
    if (compareReadable(exactValue, rebuilt) <= 0) {
      folded = exactValue;
    }
  }

  const normalized = applyRules(folded, coreRewriteRules);
  const result = compareReadable(normalized, folded) < 0 ? normalized : folded;
  exactFoldCache.set(expr, result);
  return result;
}

// ============================================================================
// Core rewrite rules
// ============================================================================

const foldBasicRule: RewriteRule = {
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
};

export const coreRewriteRules: RewriteRule[] = [
  foldBasicRule,
  ...getShortTemplateRules(),
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
      addTemplateMatches(expr, getAlgebraicTemplates(), out);
      return out;
    },
  },
];

// ============================================================================
// Search infrastructure
// ============================================================================

function replaceAtPath(expr: Expr, path: readonly number[], replacement: Expr, depth = 0): Expr {
  if (depth >= path.length) return replacement;
  const head = path[depth];
  if (isBinaryExpr(expr)) {
    return head === 0
      ? { ...expr, left: replaceAtPath(expr.left, path, replacement, depth + 1) }
      : { ...expr, right: replaceAtPath(expr.right, path, replacement, depth + 1) };
  }
  if (isUnaryExpr(expr)) {
    return { ...expr, value: replaceAtPath(expr.value, path, replacement, depth + 1) };
  }
  throw new Error("Bad path");
}

function collectNeighbors(root: Expr, rules: readonly RewriteRule[]): Expr[] {
  const out: Expr[] = [];
  const path: number[] = [];

  const visit = (expr: Expr): void => {
    for (const rule of rules) {
      for (const candidate of rule.apply(expr)) {
        out.push(replaceAtPath(root, path, candidate));
      }
    }

    if (isBinaryExpr(expr)) {
      path.push(0);
      visit(expr.left);
      path[path.length - 1] = 1;
      visit(expr.right);
      path.pop();
      return;
    }

    if (isUnaryExpr(expr)) {
      path.push(0);
      visit(expr.value);
      path.pop();
    }
  };

  visit(root);
  return out;
}

export interface SearchOptions {
  maxStates?: number;
  beamWidth?: number;
  rules?: RewriteRule[];
}

const tokenCountCache = new WeakMap<Expr, number>();
const typeCountCache = new WeakMap<Expr, number>();
const tokenScoreCache = new WeakMap<Expr, number>();
const readabilityPenaltyCache = new WeakMap<Expr, number>();
const exprKeyCache = new WeakMap<Expr, string>();
const applyRulesCache = new WeakMap<ReadonlyArray<RewriteRule>, WeakMap<Expr, Expr>>();

function exprKey(expr: Expr): string {
  const cached = exprKeyCache.get(expr);
  if (cached !== undefined) return cached;
  const key = toString(expr);
  exprKeyCache.set(expr, key);
  return key;
}

function tokenCount(expr: Expr): number {
  const cached = tokenCountCache.get(expr);
  if (cached !== undefined) return cached;
  const count = countTokens(expr);
  tokenCountCache.set(expr, count);
  return count;
}

function typeCount(expr: Expr): number {
  const cached = typeCountCache.get(expr);
  if (cached !== undefined) return cached;
  const count = countTypes(expr);
  typeCountCache.set(expr, count);
  return count;
}

function tokenScore(expr: Expr): number {
  const cached = tokenScoreCache.get(expr);
  if (cached !== undefined) return cached;
  const score = tokenCount(expr) + 0.05 * typeCount(expr);
  tokenScoreCache.set(expr, score);
  return score;
}

function readabilityPenalty(expr: Expr): number {
  const cached = readabilityPenaltyCache.get(expr);
  if (cached !== undefined) return cached;

  let penalty: number;
  switch (expr.kind) {
    case "mul":
      penalty =
        (sameValue(expr.left, expr.right) ? 4 : 1) +
        readabilityPenalty(expr.left) +
        readabilityPenalty(expr.right);
      break;
    case "add":
      penalty = 1 + readabilityPenalty(expr.left) + readabilityPenalty(expr.right);
      break;
    case "sub":
      penalty = 2 + readabilityPenalty(expr.left) + readabilityPenalty(expr.right);
      break;
    case "pow":
    case "div":
      penalty = readabilityPenalty(expr.left) + readabilityPenalty(expr.right);
      break;
    case "eml":
      penalty = 3 + readabilityPenalty(expr.left) + readabilityPenalty(expr.right);
      break;
    default:
      if (UNARY_KINDS.has(expr.kind)) {
        penalty = readabilityPenalty((expr as UnaryExprNode).value);
      } else {
        penalty = 0;
      }
      break;
  }

  readabilityPenaltyCache.set(expr, penalty);
  return penalty;
}

function compareReadable(a: Expr, b: Expr): number {
  const tokenDiff = tokenCount(a) - tokenCount(b);
  if (tokenDiff !== 0) return tokenDiff;
  const readabilityDiff = readabilityPenalty(a) - readabilityPenalty(b);
  if (readabilityDiff !== 0) return readabilityDiff;
  const typeDiff = typeCount(a) - typeCount(b);
  if (typeDiff !== 0) return typeDiff;
  return exprKey(a).localeCompare(exprKey(b));
}

function iterateUntilStable(expr: Expr, limit: number, step: (current: Expr) => Expr): Expr {
  let current = expr;
  for (let iter = 0; iter < limit; iter += 1) {
    const next = step(current);
    if (exprKey(next) === exprKey(current)) return current;
    current = next;
  }
  return current;
}

function rewriteGreedy(expr: Expr, rules: RewriteRule[]): Expr {
  return iterateUntilStable(expr, 24, (current) => rewriteGreedyStep(current, rules));
}

function rewriteGreedyStep(expr: Expr, rules: RewriteRule[]): Expr {
  const direct = applyRules(expr, rules);
  const base = rewriteChildren(expr, (child) => rewriteGreedyStep(child, rules));

  const rewrittenBase = applyRules(base, rules);
  return compareReadable(direct, rewrittenBase) <= 0 ? direct : rewrittenBase;
}

function applyRules(expr: Expr, rules: RewriteRule[]): Expr {
  let ruleCache = applyRulesCache.get(rules);
  if (!ruleCache) {
    ruleCache = new WeakMap<Expr, Expr>();
    applyRulesCache.set(rules, ruleCache);
  }
  const cached = ruleCache.get(expr);
  if (cached) return cached;

  let best = expr;
  for (const rule of rules) {
    for (const candidate of rule.apply(expr)) {
      if (compareReadable(candidate, best) < 0) {
        best = candidate;
      }
    }
  }
  ruleCache.set(expr, best);
  return best;
}

function canonicalizeReadable(expr: Expr, rules: RewriteRule[]): Expr {
  return iterateUntilStable(expr, 16, (current) => rewriteGreedyStep(current, rules));
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
        const neighbors = collectNeighbors(current, rules);
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

// ============================================================================
// Public API
// ============================================================================

export function reduceTokens(root: Expr, options: SearchOptions = {}): Expr {
  const rules = options.rules ?? coreRewriteRules;
  const seed = optimize(root, options);
  const emlSeed = optimize(reduceTypes(root), options);
  const best = compareReadable(emlSeed, seed) < 0 ? emlSeed : seed;
  return canonicalizeReadable(best, rules);
}

export function simplifyToElementary(root: Expr, options: SearchOptions = {}): Expr {
  const rules = options.rules ?? coreRewriteRules;
  const lifted = foldExactSubexpressions(liftExactPureForms(root));
  const optimized = optimize(lifted, { ...options, rules });
  const polished = foldExactSubexpressions(liftExactPureForms(optimized));
  return canonicalizeReadable(polished, rules);
}

export function reduceTokensString(root: Expr, options: SearchOptions = {}): string {
  return toString(reduceTokens(root, options));
}

export function simplifyToElementaryString(root: Expr, options: SearchOptions = {}): string {
  return toString(simplifyToElementary(root, options));
}
