import { expect, test } from "bun:test";
import { cMul, desugarElementary, evaluate, parse } from "../src/index";

type RealUnaryCase = {
  expr: string;
  expected: (x: number) => number;
  samples: number[];
  digits?: number;
};

function expectRealClose(expr: string, x: number, expected: number, digits = 12) {
  const value = evaluate(parse(expr), { x });
  expect(value.re).toBeCloseTo(expected, digits);
  expect(Math.abs(value.im)).toBeLessThan(1e-12);
}

function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error("median requires at least one value");
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function benchmark(
  exprSource: string,
  envs: Record<string, number>[],
  iterations: number,
): { direct: number; desugared: number } {
  const direct = parse(exprSource);
  const lowered = desugarElementary(direct);

  const run = (expr: ReturnType<typeof parse>): { elapsed: number; checksum: number } => {
    let checksum = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      for (const env of envs) {
        const value = evaluate(expr, env);
        checksum += value.re * 0.5 + value.im * 0.25;
      }
    }
    return { elapsed: performance.now() - start, checksum };
  };

  for (let i = 0; i < 3; i += 1) {
    run(direct);
    run(lowered);
  }

  const directRuns: number[] = [];
  const loweredRuns: number[] = [];
  let directChecksum = 0;
  let loweredChecksum = 0;
  for (let i = 0; i < 5; i += 1) {
    const directResult = run(direct);
    const loweredResult = run(lowered);
    directRuns.push(directResult.elapsed);
    loweredRuns.push(loweredResult.elapsed);
    directChecksum = directResult.checksum;
    loweredChecksum = loweredResult.checksum;
  }

  expect(directChecksum).toBeCloseTo(loweredChecksum, 10);
  return { direct: median(directRuns), desugared: median(loweredRuns) };
}

test("evaluate matches native Math on principal real branches with high precision", () => {
  const cases: RealUnaryCase[] = [
    { expr: "exp(x)", expected: Math.exp, samples: [-2, -0.5, 0, 0.5, 2], digits: 13 },
    { expr: "ln(x)", expected: Math.log, samples: [0.125, 0.5, 1, 3, 10], digits: 13 },
    { expr: "sqrt(x)", expected: Math.sqrt, samples: [0, 0.25, 2, 9], digits: 13 },
    { expr: "sin(x)", expected: Math.sin, samples: [-2, -0.5, 0, 0.5, 2], digits: 13 },
    { expr: "cos(x)", expected: Math.cos, samples: [-2, -0.5, 0, 0.5, 2], digits: 13 },
    { expr: "tan(x)", expected: Math.tan, samples: [-1, -0.25, 0, 0.25, 1], digits: 12 },
    { expr: "sinh(x)", expected: Math.sinh, samples: [-2, -0.5, 0, 0.5, 2], digits: 13 },
    { expr: "cosh(x)", expected: Math.cosh, samples: [-2, -0.5, 0, 0.5, 2], digits: 13 },
    { expr: "tanh(x)", expected: Math.tanh, samples: [-2, -0.5, 0, 0.5, 2], digits: 13 },
    { expr: "asin(x)", expected: Math.asin, samples: [-1, -0.25, 0, 0.25, 1], digits: 13 },
    { expr: "atan(x)", expected: Math.atan, samples: [-3, -0.25, 0, 0.25, 3], digits: 13 },
    { expr: "asinh(x)", expected: Math.asinh, samples: [-3, -0.25, 0, 0.25, 3], digits: 13 },
    { expr: "acosh(x)", expected: Math.acosh, samples: [1, 1.25, 2, 8], digits: 13 },
    { expr: "atanh(x)", expected: Math.atanh, samples: [-0.8, -0.25, 0, 0.25, 0.8], digits: 13 },
  ];

  for (const { expr, expected, samples, digits } of cases) {
    for (const sample of samples) {
      expectRealClose(expr, sample, expected(sample), digits);
    }
  }
});

test("evaluate keeps principal complex sqrt stable on representative samples", () => {
  const samples = [
    { re: -4, im: 0 },
    { re: 3, im: 4 },
    { re: -2.5, im: 7 },
    { re: 0.25, im: -9 },
  ];

  const expr = parse("sqrt(z)");
  for (const z of samples) {
    const root = evaluate(expr, { z });
    const squared = cMul(root, root);
    expect(squared.re).toBeCloseTo(z.re, 11);
    expect(squared.im).toBeCloseTo(z.im, 11);
    expect(root.re).toBeGreaterThanOrEqual(-1e-12);
    if (Math.abs(root.re) < 1e-12) {
      expect(root.im).toBeGreaterThanOrEqual(-1e-12);
    }
  }
});

test("direct approximate evaluation stays faster than evaluating the desugared AST", () => {
  const expr = "asin(x)+atan(z)+acsc(v)+acot(w)+asinh(a)+acosh(b)+atanh(c)+sqrt(d)+tan(t)+cosh(h)";
  const envs = [
    { x: 0.2, z: -0.4, v: 2.8, w: -3.5, a: 1.1, b: 2.4, c: 0.4, d: 3.2, t: 0.3, h: -1.2 },
    { x: -0.6, z: 0.75, v: -2.3, w: 1.25, a: -0.75, b: 5.5, c: -0.2, d: 0.8, t: -0.4, h: 0.8 },
    { x: 0.99, z: -1.5, v: 1.8, w: 0.6, a: 2.4, b: 1.4, c: 0.7, d: 9.5, t: 0.8, h: 1.7 },
  ];

  const { direct, desugared } = benchmark(expr, envs, 1000);
  expect(direct).toBeLessThan(desugared * 0.8);
});
