import type { BinaryExpr, Expr } from "./ast";
import { isBinaryExpr, isUnaryExpr } from "./ast";

export const EXPR_GRAPH_PROTOCOL = "emlib.expr.graph" as const;
export const EXPR_GRAPH_VERSION = 1 as const;

export type DedupMode = "all" | "compound" | "none";
export type SerializedExprNodeRole = "operator" | "variable" | "constant";
export type SerializedExprLinkArgument = "value" | "left" | "right";

export interface SerializeExprOptions {
  nodePrefix?: string;
  linkPrefix?: string;
  /** Include display labels for arguments where order matters, such as E(x, y), subtraction, division, and powers. Defaults to true. */
  includeArgumentLabels?: boolean;
  /**
   * Deduplication mode for graph-shaped exports.
   * - `'compound'`: shares subtrees with >1 node, leaves remain separate unless they are inside a shared compound subtree.
   * - `'all'`: shares all structurally identical nodes, including leaves.
   * - `'none'` (default): exports a full tree with no sharing.
   * - `true` -> `'compound'`, `false` -> `'none'`.
   */
  deduplicate?: boolean | DedupMode;
}

export interface SerializeExprJsonOptions extends SerializeExprOptions {
  space?: string | number;
}

export interface SerializedExprNode {
  id: string;
  label: string;
  kind: Expr["kind"];
  role: SerializedExprNodeRole;
  arity: 0 | 1 | 2;
  depth: number;
  structuralKey: string;
  occurrenceCount: number;
  repeated: boolean;
  raw?: string;
  value?: number;
  name?: string;
}

export interface SerializedExprLink {
  id: string;
  source: string;
  target: string;
  argument: SerializedExprLinkArgument;
  parentKind: BinaryExpr["kind"] | Exclude<Expr["kind"], "num" | "var" | "const">;
  label?: string;
}

export interface SerializedExprGraphStats {
  totalNodes: number;
  uniqueSubtrees: number;
  graphNodes: number;
  graphLinks: number;
  reusedNodes: number;
  maxDepth: number;
}

export interface SerializedExprGraph {
  protocol: typeof EXPR_GRAPH_PROTOCOL;
  version: typeof EXPR_GRAPH_VERSION;
  rootId: string;
  deduplicate: DedupMode;
  nodes: SerializedExprNode[];
  links: SerializedExprLink[];
  stats: SerializedExprGraphStats;
}

function resolveDedupMode(value: boolean | DedupMode | undefined): DedupMode {
  if (value === undefined || value === false) return "none";
  if (value === true) return "compound";
  return value;
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

function nodeRole(expr: Expr): SerializedExprNodeRole {
  switch (expr.kind) {
    case "num":
    case "const":
      return "constant";
    case "var":
      return "variable";
    default:
      return "operator";
  }
}

function nodeArity(expr: Expr): 0 | 1 | 2 {
  if (isBinaryExpr(expr)) return 2;
  if (isUnaryExpr(expr)) return 1;
  return 0;
}

function computeStructuralKey(expr: Expr): string {
  if (expr.kind === "num") return `num:${expr.raw}`;
  if (expr.kind === "var") return `var:${expr.name}`;
  if (expr.kind === "const") return `const:${expr.name}`;
  if (isUnaryExpr(expr)) return `${expr.kind}(${computeStructuralKey(expr.value)})`;
  return `${expr.kind}(${computeStructuralKey(expr.left)},${computeStructuralKey(expr.right)})`;
}

function isCommutativeBinaryExpr(expr: BinaryExpr): boolean {
  return expr.kind === "add" || expr.kind === "mul";
}

function argumentLabel(
  expr: Expr,
  argument: SerializedExprLinkArgument,
  includeArgumentLabels: boolean,
): string | undefined {
  if (
    isBinaryExpr(expr) &&
    !isCommutativeBinaryExpr(expr) &&
    includeArgumentLabels &&
    argument !== "value"
  ) {
    return argument === "left" ? "x" : "y";
  }

  return undefined;
}

function collectStructuralFrequencies(expr: Expr): Map<string, number> {
  const frequencies = new Map<string, number>();

  const walk = (node: Expr) => {
    const key = computeStructuralKey(node);
    frequencies.set(key, (frequencies.get(key) ?? 0) + 1);

    if (isBinaryExpr(node)) {
      walk(node.left);
      walk(node.right);
    } else if (isUnaryExpr(node)) {
      walk(node.value);
    }
  };

  walk(expr);
  return frequencies;
}

function countNodesAndDepth(expr: Expr): { totalNodes: number; maxDepth: number } {
  let totalNodes = 0;
  let maxDepth = 0;

  const walk = (node: Expr, depth: number) => {
    totalNodes += 1;
    maxDepth = Math.max(maxDepth, depth);

    if (isBinaryExpr(node)) {
      walk(node.left, depth + 1);
      walk(node.right, depth + 1);
    } else if (isUnaryExpr(node)) {
      walk(node.value, depth + 1);
    }
  };

  walk(expr, 0);
  return { totalNodes, maxDepth };
}

type KeyMap = Map<string, string>;

interface SerializeState {
  nextNodeId: number;
  nextLinkId: number;
  nodes: SerializedExprNode[];
  links: SerializedExprLink[];
}

function nextId(prefix: string, value: number): string {
  return `${prefix}${value}`;
}

function pushNode(
  state: SerializeState,
  expr: Expr,
  id: string,
  depth: number,
  structuralKey: string,
  occurrenceCount: number,
) {
  const node: SerializedExprNode = {
    id,
    label: exprNodeLabel(expr),
    kind: expr.kind,
    role: nodeRole(expr),
    arity: nodeArity(expr),
    depth,
    structuralKey,
    occurrenceCount,
    repeated: occurrenceCount > 1,
  };

  if (expr.kind === "num") {
    node.raw = expr.raw;
    node.value = expr.value;
  } else if (expr.kind === "var" || expr.kind === "const") {
    node.name = expr.name;
  }

  state.nodes.push(node);
}

function pushLink(
  state: SerializeState,
  linkPrefix: string,
  source: string,
  target: string,
  parent: Expr,
  argument: SerializedExprLinkArgument,
  includeArgumentLabels: boolean,
) {
  state.links.push({
    id: nextId(linkPrefix, state.nextLinkId),
    source,
    target,
    parentKind: parent.kind as SerializedExprLink["parentKind"],
    argument,
    label: argumentLabel(parent, argument, includeArgumentLabels),
  });
  state.nextLinkId += 1;
}

function serializeNode(
  expr: Expr,
  state: SerializeState,
  keyMap: KeyMap,
  frequencies: Map<string, number>,
  options: Required<
    Pick<SerializeExprOptions, "nodePrefix" | "linkPrefix" | "includeArgumentLabels">
  >,
  mode: DedupMode,
  depth: number,
): string {
  const compound = isBinaryExpr(expr) || isUnaryExpr(expr);
  const structuralKey = computeStructuralKey(expr);

  if (mode === "all" || (mode === "compound" && compound)) {
    const existing = keyMap.get(structuralKey);
    if (existing) return existing;
  }

  const id = nextId(options.nodePrefix, state.nextNodeId);
  state.nextNodeId += 1;

  if (mode === "all" || (mode === "compound" && compound)) {
    keyMap.set(structuralKey, id);
  }

  pushNode(state, expr, id, depth, structuralKey, frequencies.get(structuralKey) ?? 1);

  if (isBinaryExpr(expr)) {
    const leftId = serializeNode(expr.left, state, keyMap, frequencies, options, mode, depth + 1);
    const rightId = serializeNode(expr.right, state, keyMap, frequencies, options, mode, depth + 1);
    pushLink(state, options.linkPrefix, id, leftId, expr, "left", options.includeArgumentLabels);
    pushLink(state, options.linkPrefix, id, rightId, expr, "right", options.includeArgumentLabels);
  } else if (isUnaryExpr(expr)) {
    const valueId = serializeNode(expr.value, state, keyMap, frequencies, options, mode, depth + 1);
    pushLink(state, options.linkPrefix, id, valueId, expr, "value", options.includeArgumentLabels);
  }

  return id;
}

export function serializeExpr(expr: Expr, options: SerializeExprOptions = {}): SerializedExprGraph {
  const { nodePrefix = "n", linkPrefix = "e", includeArgumentLabels = true, deduplicate } = options;
  const mode = resolveDedupMode(deduplicate);
  const frequencies = collectStructuralFrequencies(expr);
  const counts = countNodesAndDepth(expr);
  const state: SerializeState = { nextNodeId: 0, nextLinkId: 0, nodes: [], links: [] };
  const rootId = serializeNode(
    expr,
    state,
    new Map(),
    frequencies,
    { nodePrefix, linkPrefix, includeArgumentLabels },
    mode,
    0,
  );

  return {
    protocol: EXPR_GRAPH_PROTOCOL,
    version: EXPR_GRAPH_VERSION,
    rootId,
    deduplicate: mode,
    nodes: state.nodes,
    links: state.links,
    stats: {
      ...counts,
      uniqueSubtrees: frequencies.size,
      graphNodes: state.nodes.length,
      graphLinks: state.links.length,
      reusedNodes: state.nodes.filter((node) => node.repeated).length,
    },
  };
}

export function serializeExprToJson(expr: Expr, options: SerializeExprJsonOptions = {}): string {
  const { space = 2, ...serializeOptions } = options;
  return JSON.stringify(serializeExpr(expr, serializeOptions), null, space);
}

/**
 * Count unique subtrees in an expression.
 * Returns the number of distinct subtrees (structural identity).
 */
export function countUniqueSubtrees(expr: Expr): number {
  return collectStructuralFrequencies(expr).size;
}

/**
 * Count total nodes in an expression (tree traversal, no deduplication).
 */
export function countTotalNodes(expr: Expr): number {
  return countNodesAndDepth(expr).totalNodes;
}
