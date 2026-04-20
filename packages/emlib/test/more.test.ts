import { expect, test } from 'bun:test';
import { evaluate, evaluateLossless, parse, simplifyToElementary, toPureEml, toString, valueToExpr } from '../src/index';

function expectComplexClose(expr: string, env: Record<string, number>) {
  const direct = evaluate(parse(expr), env);
  const lowered = evaluate(toPureEml(parse(expr)), env);
  expect(lowered.re).toBeCloseTo(direct.re, 8);
  expect(lowered.im).toBeCloseTo(direct.im, 8);
}

test('lower exp(x) to the paper core EML form and simplify it back', () => {
  const expr = toPureEml(parse('exp(x)'));
  expect(toString(expr)).toBe('eml(x, 1)');
  const simplified = simplifyToElementary(expr);
  expect(toString(simplified)).toBe('exp(x)');
});

test('parse and print the extended elementary family', () => {
  const samples = [
    'tan(x)',
    'cot(x)',
    'sec(x)',
    'csc(x)',
    'sinh(x)',
    'cosh(x)',
    'tanh(x)',
    'coth(x)',
    'sech(x)',
    'csch(x)',
    'asin(x)',
    'acos(x)',
    'atan(x)',
    'asec(x)',
    'acsc(x)',
    'acot(x)',
    'asinh(x)',
    'acosh(x)',
    'atanh(x)',
  ];

  for (const sample of samples) {
    expect(toString(parse(sample))).toBe(sample);
  }
});

test('lower trig and hyperbolic functions to pure EML exactly', () => {
  expectComplexClose('sin(x)', { x: 0.35 });
  expectComplexClose('cos(x)', { x: 0.35 });
  expectComplexClose('tan(x)', { x: 0.35 });
  expectComplexClose('sinh(x)', { x: 0.45 });
  expectComplexClose('cosh(x)', { x: 0.45 });
  expectComplexClose('tanh(x)', { x: 0.45 });
});

test('lower inverse elementary functions to pure EML exactly on safe principal-branch samples', () => {
  expectComplexClose('asin(x)', { x: 0.3 });
  expectComplexClose('acos(x)', { x: 0.3 });
  expectComplexClose('atan(x)', { x: 0.3 });
  expectComplexClose('asinh(x)', { x: 0.6 });
  expectComplexClose('acosh(x)', { x: 2.5 });
  expectComplexClose('atanh(x)', { x: 0.2 });
});

test('lower derived reciprocal/inverse variants and constants', () => {
  expectComplexClose('sec(x)', { x: 0.2 });
  expectComplexClose('csc(x)', { x: 0.7 });
  expectComplexClose('cot(x)', { x: 0.7 });
  expectComplexClose('sech(x)', { x: 0.3 });
  expectComplexClose('csch(x)', { x: 0.9 });
  expectComplexClose('coth(x)', { x: 0.9 });
  expectComplexClose('asec(x)', { x: 2.4 });
  expectComplexClose('acsc(x)', { x: 2.4 });
  expectComplexClose('acot(x)', { x: 2.4 });

  const i = evaluate(toPureEml(parse('i')));
  expect(i.re).toBeCloseTo(0, 8);
  expect(i.im).toBeCloseTo(1, 8);

  const pi = evaluate(toPureEml(parse('pi')));
  expect(pi.re).toBeCloseTo(Math.PI, 8);
  expect(pi.im).toBeCloseTo(0, 8);
});

test('lossless mode keeps transcendental values symbolic instead of silently rounding them', () => {
  const symbolic = evaluateLossless(parse('sin(1/3)'));
  expect(toString(valueToExpr(symbolic))).toBe('sin(1 / 3)');

  const approx = evaluate(parse('sin(1/3)'));
  expect(approx.re).toBeCloseTo(Math.sin(1 / 3), 12);
  expect(approx.im).toBeCloseTo(0, 12);
});
