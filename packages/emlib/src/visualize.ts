import type { Expr } from './ast';

export interface D2ExportOptions {
  nodePrefix?: string;
  edgeLabels?: boolean;
}

interface D2State {
  nextId: number;
  nodes: string[];
  edges: string[];
}

type D2NodeClass = 'function' | 'variable' | 'constant';

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
  state.nodes.push('}');
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

function nodeVisual(expr: Expr): { className: D2NodeClass; label: string } {
  switch (expr.kind) {
    case 'num':
    case 'const':
      return { className: 'constant', label: exprNodeLabel(expr) };
    case 'var':
      return { className: 'variable', label: expr.name };
    default:
      return { className: 'function', label: exprNodeLabel(expr) };
  }
}

function renderExprTree(expr: Expr, state: D2State, nodePrefix: string, edgeLabels: boolean): string {
  const id = nextNodeId(state, nodePrefix);
  const visual = nodeVisual(expr);
  pushNode(state, id, visual.className, visual.label);

  switch (expr.kind) {
    case 'eml':
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow': {
      const leftId = renderExprTree(expr.left, state, nodePrefix, edgeLabels);
      const rightId = renderExprTree(expr.right, state, nodePrefix, edgeLabels);
      pushEdge(state, id, leftId, edgeLabels ? 'x' : null);
      pushEdge(state, id, rightId, edgeLabels ? 'y' : null);
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
      const childId = renderExprTree(expr.value, state, nodePrefix, edgeLabels);
      pushEdge(state, id, childId, edgeLabels ? 'arg' : null);
      break;
    }
    default:
      break;
  }

  return id;
}

function renderClassDefinitions(): string[] {
  return [
    'classes: {',
    '  function: {',
    '    shape: circle',
    '    style: {',
    '      fill-pattern: none',
    '    }',
    '  }',
    '  variable: {',
    '    shape: square',
    '    style: {',
    '      fill-pattern: lines',
    '    }',
    '  }',
    '  constant: {',
    '    shape: square',
    '    style: {',
    '      fill-pattern: dots',
    '    }',
    '  }',
    '}',
  ];
}

function finalizeD2(state: D2State): string {
  const lines: string[] = [];
  lines.push(...renderClassDefinitions());
  if (state.nodes.length > 0 || state.edges.length > 0) {
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
  const { nodePrefix = 'n', edgeLabels = true } = options;
  const state: D2State = { nextId: 0, nodes: [], edges: [] };
  renderExprTree(expr, state, nodePrefix, edgeLabels);
  return finalizeD2(state);
}
