import { expect, test } from 'bun:test';
import {
  analyzeExpr,
  evaluate,
  evaluateLossless,
  parse,
  reduceTokens,
  reduceTypes,
  simplifyToElementary,
  synthesizePureEml,
  toPureEml,
  toString,
  valueToExpr,
} from '../src/index';

test('lower ln(x) exactly', () => {
  const expr = parse('ln(x)');
  const pure = toPureEml(expr);
  const a = evaluate(expr, { x: 2.3 });
  const b = evaluate(pure, { x: 2.3 });
  expect(a.re).toBeCloseTo(b.re, 8);
  expect(a.im).toBeCloseTo(b.im, 8);
});

test('simplify pure eml back to ln(x)', () => {
  const expr = toPureEml(parse('ln(x)'));
  const simplified = simplifyToElementary(expr);
  expect(toString(simplified)).toBe('ln(x)');
});

test('toPureEml uses the direct E(x,y) form for exp(x) - ln(y)', () => {
  expect(toString(toPureEml(parse('exp(x) - ln(y)')))).toBe('E(x,y)');
});

test('toPureEml applies simple algebraic and inverse cancellations before lowering', () => {
  expect(toString(toPureEml(parse('exp(ln(x))')))).toBe('x');
  expect(toString(toPureEml(parse('x + 0')))).toBe('x');
  expect(toString(toPureEml(parse('1 * x')))).toBe('x');
  expect(toString(toPureEml(parse('x / 1')))).toBe('x');
});

test('reduceTypes keeps only the EML core and chooses shorter direct forms when available', () => {
  const expr = parse('exp(x) - ln(y)');
  const reduced = reduceTypes(expr);
  const before = analyzeExpr(expr);
  const after = analyzeExpr(reduced);

  expect(after.typeCount).toBeLessThanOrEqual(before.typeCount);
  expect(after.types).toEqual(['eml']);
  expect(after.tokenCount).toBeLessThanOrEqual(before.tokenCount);
});

test('reduceTokens prefers the shorter mixed vocabulary form', () => {
  const expr = parse('exp(x) - ln(y)');
  const reduced = reduceTokens(expr);
  expect(toString(reduced)).toBe('E(x,y)');
  expect(analyzeExpr(reduced).tokenCount).toBeLessThan(analyzeExpr(expr).tokenCount);
});

test('lossless arithmetic keeps exact rational and complex values', () => {
  const rational = evaluateLossless(parse('1/3 + 1/6'));
  expect(toString(valueToExpr(rational))).toBe('1/2');

  const complex = evaluateLossless(parse('(1 + 2*i) / (3 - 4*i)'));
  expect(toString(valueToExpr(complex))).toBe('-1/5+2/5*i');
});

test('synthesis returns a finite candidate', () => {
  const result = synthesizePureEml(parse('ln(x)'), { maxLeaves: 7, beamWidth: 128, variables: ['x'] });
  expect(result).toBeDefined();
  if (!result) {
    throw new Error('Expected a synthesis candidate for ln(x)');
  }
  expect(Number.isFinite(result.distance)).toBe(true);
});
