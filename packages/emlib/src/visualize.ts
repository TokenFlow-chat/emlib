import type { Expr } from './ast';
import { isNumericValue } from './ast';

export interface D2ExportOptions {
  nodePrefix?: string;
  edgeLabels?: boolean;
  operatorShape?: 'circle' | 'hexagon' | 'diamond' | 'rectangle';
  leafShape?: 'rectangle' | 'oval' | 'circle';
  includeConfig?: boolean;
  layoutEngine?: 'dagre' | 'elk';
}

interface MutableD2Options {
  nodePrefix: string;
  edgeLabels: boolean;
  operatorShape: 'circle' | 'hexagon' | 'diamond' | 'rectangle';
  leafShape: 'rectangle' | 'oval' | 'circle';
  includeConfig: boolean;
  layoutEngine: 'dagre' | 'elk';
}

interface D2State {
  nextId: number;
  nodes: string[];
  edges: string[];
}

const defaultOptions: MutableD2Options = {
  nodePrefix: 'n',
  edgeLabels: true,
  operatorShape: 'circle',
  leafShape: 'rectangle',
  includeConfig: false,
  layoutEngine: 'dagre',
};

function withDefaults(options: D2ExportOptions = {}): MutableD2Options {
  return { ...defaultOptions, ...options };
}

function escapeD2String(value: string): string {
  return JSON.stringify(value);
}

function nextNodeId(state: D2State, prefix: string): string {
  const id = `${prefix}${state.nextId}`;
  state.nextId += 1;
  return id;
}

function pushNode(state: D2State, id: string, label: string, shape: string) {
  state.nodes.push(`${id}: {`);
  state.nodes.push(`  label: ${escapeD2String(label)}`);
  state.nodes.push(`  shape: ${shape}`);
  state.nodes.push(`}`);
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
    case 'num':
      return expr.raw;
    case 'var':
      return expr.name;
    case 'const':
      return expr.name;
    case 'add':
      return '+';
    case 'sub':
      return '-';
    case 'mul':
      return '*';
    case 'div':
      return '/';
    case 'pow':
      return '^';
    default:
      return expr.kind;
  }
}

function isLeaf(expr: Expr): boolean {
  return expr.kind === 'num' || expr.kind === 'var' || expr.kind === 'const';
}

function renderExprTree(expr: Expr, state: D2State, options: MutableD2Options): string {
  const id = nextNodeId(state, options.nodePrefix);
  pushNode(state, id, exprNodeLabel(expr), isLeaf(expr) ? options.leafShape : options.operatorShape);

  switch (expr.kind) {
    case 'eml':
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow': {
      const leftId = renderExprTree(expr.left, state, options);
      const rightId = renderExprTree(expr.right, state, options);
      pushEdge(state, id, leftId, options.edgeLabels ? 'L' : null);
      pushEdge(state, id, rightId, options.edgeLabels ? 'R' : null);
      break;
    }
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
    case 'atanh': {
      const childId = renderExprTree(expr.value, state, options);
      pushEdge(state, id, childId, options.edgeLabels ? 'arg' : null);
      break;
    }
    default:
      break;
  }

  return id;
}

function assertPureEmlTree(expr: Expr): void {
  switch (expr.kind) {
    case 'eml':
      assertPureEmlTree(expr.left);
      assertPureEmlTree(expr.right);
      return;
    case 'var':
      return;
    case 'num':
      if (!isNumericValue(expr, 1)) {
        throw new Error(`Pure EML tree visualization expects leaves to be variables or 1. Got ${expr.raw}`);
      }
      return;
    default:
      throw new Error(`Pure EML tree visualization only supports eml internal nodes. Got ${expr.kind}`);
  }
}

function renderPureEmlTree(expr: Expr, state: D2State, options: MutableD2Options): string {
  const id = nextNodeId(state, options.nodePrefix);

  if (expr.kind === 'eml') {
    pushNode(state, id, 'eml', options.operatorShape);
    const leftId = renderPureEmlTree(expr.left, state, options);
    const rightId = renderPureEmlTree(expr.right, state, options);
    pushEdge(state, id, leftId, options.edgeLabels ? 'L' : null);
    pushEdge(state, id, rightId, options.edgeLabels ? 'R' : null);
    return id;
  }

  const label = expr.kind === 'var' ? expr.name : '1';
  pushNode(state, id, label, options.leafShape);
  return id;
}

function finalizeD2(state: D2State, options: MutableD2Options): string {
  const lines: string[] = [];
  if (options.includeConfig) {
    lines.push('vars: {');
    lines.push('  d2-config: {');
    lines.push(`    layout-engine: ${options.layoutEngine}`);
    lines.push('  }');
    lines.push('}');
    lines.push('');
  }
  lines.push(...state.nodes);
  if (state.nodes.length > 0 && state.edges.length > 0) {
    lines.push('');
  }
  lines.push(...state.edges);
  return lines.join('\n');
}

export function exprToD2(expr: Expr, options: D2ExportOptions = {}): string {
  const resolved = withDefaults(options);
  const state: D2State = { nextId: 0, nodes: [], edges: [] };
  renderExprTree(expr, state, resolved);
  return finalizeD2(state, resolved);
}

export function pureEmlTreeToD2(expr: Expr, options: D2ExportOptions = {}): string {
  assertPureEmlTree(expr);
  const resolved = withDefaults(options);
  const state: D2State = { nextId: 0, nodes: [], edges: [] };
  renderPureEmlTree(expr, state, resolved);
  return finalizeD2(state, resolved);
}
