import type { Expr } from "./ast";
import { isBinaryExpr, isUnaryExpr } from "./ast";

export type DedupMode = "all" | "compound" | "none";

export interface D2ExportOptions {
  nodePrefix?: string;
  /** When true, edge labels are shown for binary operators that distinguish left/right (sub, div, pow, eml). Labels are omitted for commutative operators (add, mul) and unary ops. Defaults to true. */
  edgeLabels?: boolean;
  /**
   * Deduplication mode.
   * - `'compound'`: shares subtrees with >1 node, leaves remain separate.
   * - `'all'`: shares all structurally identical nodes, including leaves.
   * - `'none'` (default): no deduplication, renders as a full tree.
   * - `true` → `'compound'`, `false` → `'none'` (backward compatibility).
   */
  deduplicate?: boolean | DedupMode;
}

function resolveDedupMode(value: boolean | DedupMode | undefined): DedupMode {
  if (value === undefined || value === false) return "none";
  if (value === true) return "compound";
  return value;
}

interface D2State {
  nextId: number;
  nodes: string[];
  edges: string[];
}

type D2NodeClass = "function" | "variable" | "constant";

function escapeD2String(value: string): string {
  return JSON.stringify(value);
}

function nextNodeId(state: D2State, prefix: string): string {
  const id = `${prefix}${state.nextId}`;
  state.nextId += 1;
  return id;
}

function pushNode(state: D2State, id: string, className: D2NodeClass, label: string) {
  state.nodes.push(`${id}: {`);
  state.nodes.push(`  label: ${escapeD2String(label)}`);
  state.nodes.push(`  class: ${className}`);
  state.nodes.push("}");
}

function pushEdge(state: D2State, from: string, to: string, label: string | null) {
  if (label) {
    state.edges.push(`${from} -> ${to}: ${escapeD2String(label)}`);
    return;
  }
  state.edges.push(`${from} -> ${to}`);
}

function exprNodeLabel(expr: Expr): string {
  switch (expr.kind) {
    case "num":
      return expr.raw;
    case "var":
      return expr.name;
    case "const":
      return expr.name;
    case "add":
      return "+";
    case "sub":
      return "-";
    case "mul":
      return "*";
    case "div":
      return "/";
    case "pow":
      return "^";
    case "eml":
      return "E";
    default:
      return expr.kind;
  }
}

function nodeVisual(expr: Expr): { className: D2NodeClass; label: string } {
  switch (expr.kind) {
    case "num":
    case "const":
      return { className: "constant", label: exprNodeLabel(expr) };
    case "var":
      return { className: "variable", label: expr.name };
    default:
      return { className: "function", label: exprNodeLabel(expr) };
  }
}

function computeStructuralKey(expr: Expr): string {
  if (expr.kind === "num") return `num:${expr.raw}`;
  if (expr.kind === "var") return `var:${expr.name}`;
  if (expr.kind === "const") return `const:${expr.name}`;
  if (isUnaryExpr(expr)) return `${expr.kind}(${computeStructuralKey(expr.value)})`;
  return `${expr.kind}(${computeStructuralKey(expr.left)},${computeStructuralKey(expr.right)})`;
}

function isCommutativeBinaryExpr(expr: Expr): boolean {
  return expr.kind === "add" || expr.kind === "mul";
}

function edgeLabel(expr: Expr, side: "left" | "right", edgeLabels: boolean): string | null {
  if (isBinaryExpr(expr) && !isCommutativeBinaryExpr(expr) && edgeLabels) {
    return side === "left" ? "x" : "y";
  }
  return null;
}

type KeyMap = Map<string, string>;

function renderExprTree(
  expr: Expr,
  state: D2State,
  nodePrefix: string,
  edgeLabels: boolean,
  keyMap: KeyMap,
  mode: DedupMode,
): string {
  const compound = isBinaryExpr(expr) || isUnaryExpr(expr);

  if (mode === "all" || (mode === "compound" && compound)) {
    const key = computeStructuralKey(expr);
    const existing = keyMap.get(key);
    if (existing) return existing;
  }

  const id = nextNodeId(state, nodePrefix);

  if (mode === "all" || (mode === "compound" && compound)) {
    const key = computeStructuralKey(expr);
    keyMap.set(key, id);
  }

  const visual = nodeVisual(expr);
  pushNode(state, id, visual.className, visual.label);

  if (isBinaryExpr(expr)) {
    const leftId = renderExprTree(expr.left, state, nodePrefix, edgeLabels, keyMap, mode);
    const rightId = renderExprTree(expr.right, state, nodePrefix, edgeLabels, keyMap, mode);
    pushEdge(state, id, leftId, edgeLabel(expr, "left", edgeLabels));
    pushEdge(state, id, rightId, edgeLabel(expr, "right", edgeLabels));
  } else if (isUnaryExpr(expr)) {
    const childId = renderExprTree(expr.value, state, nodePrefix, edgeLabels, keyMap, mode);
    pushEdge(state, id, childId, null);
  }

  return id;
}

function finalizeD2(state: D2State): string {
  const lines: string[] = [];
  if (state.nodes.length > 0 || state.edges.length > 0) {
    lines.push("");
  }
  lines.push(...state.nodes);
  if (state.nodes.length > 0 && state.edges.length > 0) {
    lines.push("");
  }
  lines.push(...state.edges);
  return lines.join("\n");
}

export function exprToD2(expr: Expr, options: D2ExportOptions = {}): string {
  const { nodePrefix = "n", edgeLabels = true, deduplicate } = options;
  const mode = resolveDedupMode(deduplicate);
  const state: D2State = { nextId: 0, nodes: [], edges: [] };
  const keyMap: KeyMap = new Map();
  renderExprTree(expr, state, nodePrefix, edgeLabels, keyMap, mode);
  return finalizeD2(state).trim();
}

/**
 * Count unique subtrees in an expression.
 * Returns the number of distinct subtrees (structural identity).
 */
export function countUniqueSubtrees(expr: Expr): number {
  const keys = new Set<string>();
  const walk = (node: Expr) => {
    keys.add(computeStructuralKey(node));
    if (isBinaryExpr(node)) {
      walk(node.left);
      walk(node.right);
    } else if (isUnaryExpr(node)) {
      walk(node.value);
    }
  };
  walk(expr);
  return keys.size;
}

/**
 * Count total nodes in an expression (tree traversal, no deduplication).
 */
export function countTotalNodes(expr: Expr): number {
  let count = 0;
  const walk = (node: Expr) => {
    count += 1;
    if (isBinaryExpr(node)) {
      walk(node.left);
      walk(node.right);
    } else if (isUnaryExpr(node)) {
      walk(node.value);
    }
  };
  walk(expr);
  return count;
}
