import type { Expr } from './ast';

export interface ExprAnalysis {
  tokenCount: number;
  typeCount: number;
  types: string[];
}

function collectTypes(expr: Expr, out = new Set<string>()): Set<string> {
  if (expr.kind !== 'var') {
    out.add(expr.kind === 'const' ? `const:${expr.name}` : expr.kind);
  }
  switch (expr.kind) {
    case 'eml':
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow':
      collectTypes(expr.left, out);
      collectTypes(expr.right, out);
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
      collectTypes(expr.value, out);
      break;
    default:
      break;
  }
  return out;
}

export function countTokens(expr: Expr): number {
  switch (expr.kind) {
    case 'num':
    case 'var':
    case 'const':
      return 1;
    case 'eml':
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow':
      return 1 + countTokens(expr.left) + countTokens(expr.right);
    default:
      return 1 + countTokens(expr.value);
  }
}

export function countTypes(expr: Expr): number {
  return collectTypes(expr).size;
}

export function analyzeExpr(expr: Expr): ExprAnalysis {
  const types = [...collectTypes(expr)].sort();
  return {
    tokenCount: countTokens(expr),
    typeCount: types.length,
    types,
  };
}
