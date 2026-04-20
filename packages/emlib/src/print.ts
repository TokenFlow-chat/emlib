import type { Expr } from './ast';

const PREC = {
  add: 10,
  sub: 10,
  mul: 20,
  div: 20,
  pow: 30,
  neg: 40,
  exp: 50,
  ln: 50,
  sqrt: 50,
  sin: 50,
  cos: 50,
  tan: 50,
  cot: 50,
  sec: 50,
  csc: 50,
  sinh: 50,
  cosh: 50,
  tanh: 50,
  coth: 50,
  sech: 50,
  csch: 50,
  asin: 50,
  acos: 50,
  atan: 50,
  asec: 50,
  acsc: 50,
  acot: 50,
  asinh: 50,
  acosh: 50,
  atanh: 50,
  eml: 60,
  var: 100,
  num: 100,
  const: 100,
} as const;

export function toString(expr: Expr, parentPrec = 0): string {
  switch (expr.kind) {
    case 'num':
      return expr.raw;
    case 'var':
      return expr.name;
    case 'const':
      return expr.name;
    case 'neg': {
      const negPrec = PREC.neg;
      const s = `-${toString(expr.value, negPrec)}`;
      return parentPrec > negPrec ? `(${s})` : s;
    }
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
      return `${expr.kind}(${toString(expr.value)})`;
    case 'eml':
      return `E(${toString(expr.left)},${toString(expr.right)})`;
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow': {
      const opMap: Record<'add'|'sub'|'mul'|'div'|'pow', string> = { add: '+', sub: '-', mul: '*', div: '/', pow: '^' };
      const op = opMap[expr.kind];
      const prec = PREC[expr.kind];
      const s = `${toString(expr.left, prec)}${op}${toString(expr.right, prec + (expr.kind === 'pow' ? -1 : 1))}`;
      return parentPrec > prec ? `(${s})` : s;
    }
  }
  throw new Error('Unreachable');
}

export function toPureEmlString(expr: Expr): string {
  switch (expr.kind) {
    case 'num':
      return expr.raw;
    case 'var':
      return expr.name;
    case 'const':
      return expr.name;
    case 'eml':
      return `E(${toPureEmlString(expr.left)},${toPureEmlString(expr.right)})`;
    default:
      throw new Error(`Expression is not pure EML: ${toString(expr)}`);
  }
}
