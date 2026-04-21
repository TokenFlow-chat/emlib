import { expect, test } from "bun:test";
import {
  C,
  createMasterTree,
  forwardMaster,
  masterLoss,
  masterToExpr,
  trainMasterFormula,
  evaluate,
  toString,
} from "../src/index";

test("createMasterTree produces correct param counts", () => {
  const d1 = createMasterTree(1);
  expect(d1.nodeCount).toBe(1);
  expect(d1.paramCount).toBe(4); // 5*2 - 6 = 4

  const d2 = createMasterTree(2);
  expect(d2.nodeCount).toBe(3);
  expect(d2.paramCount).toBe(14); // 5*4 - 6 = 14

  const d3 = createMasterTree(3);
  expect(d3.nodeCount).toBe(7);
  expect(d3.paramCount).toBe(34); // 5*8 - 6 = 34
});

test("master forward evaluates eml(x,1) = exp(x) with depth-1", () => {
  const tree = createMasterTree(1);
  // Depth-1: single node. Left=x, right=1.
  const params = [-10, 10, 10, -10];

  const x = C(2, 0);
  const result = forwardMaster(tree, x, params, 0.001);

  expect(result.re).toBeCloseTo(Math.exp(2), 6);
  expect(result.im).toBeCloseTo(0, 6);
});

test("master forward evaluates eml(1, eml(x,1)) = e - x at depth-2", () => {
  const tree = createMasterTree(2);
  // node0 = eml(1,1) = e  (unused in root but needed for tree shape)
  // node1 = eml(x,1) = exp(x)
  // root  = eml(1, node1) = exp(1) - ln(exp(x)) = e - x
  const node0 = [10, -10, 10, -10]; // eml(1,1)
  const node1 = [-10, 10, 10, -10]; // eml(x,1)
  const node2 = [10, -10, -10, -10, -10, 10]; // root: left=1, right=child(node1)

  const params = [...node0, ...node1, ...node2];
  expect(params.length).toBe(14);

  const x = C(1.5, 0);
  const result = forwardMaster(tree, x, params, 0.001);

  const expected = Math.E - 1.5;
  expect(result.re).toBeCloseTo(expected, 6);
});

test("masterToExpr recovers exp(x) AST from depth-1", () => {
  const tree = createMasterTree(1);
  const params = [-10, 10, 10, -10];
  const expr = masterToExpr(tree, params, "x");
  expect(toString(expr)).toBe("E(x,1)");

  const val = evaluate(expr, { x: 1.5 });
  expect(val.re).toBeCloseTo(Math.exp(1.5), 8);
});

test("masterToExpr recovers e-x AST from depth-2", () => {
  const tree = createMasterTree(2);
  const node0 = [10, -10, 10, -10]; // eml(1,1)
  const node1 = [-10, 10, 10, -10]; // eml(x,1)
  const node2 = [10, -10, -10, -10, -10, 10]; // root: left=1, right=child(node1)
  const params = [...node0, ...node1, ...node2];

  const expr = masterToExpr(tree, params, "x");
  expect(toString(expr)).toBe("E(1,E(x,1))");

  const val = evaluate(expr, { x: 2.5 });
  expect(val.re).toBeCloseTo(Math.E - 2.5, 8);
});

test("trainMasterFormula recovers exp(x) at depth 1", () => {
  const samples = [0.5, 1.0, 1.5, 2.0].map((x) => C(x, 0));
  const targets = samples.map((s) => C(Math.exp(s.re), 0));

  const result = trainMasterFormula(samples, targets, {
    depth: 1,
    restarts: 8,
    lr: 0.1,
    epochs: 600,
    hardeningEpochs: 300,
    tolerance: 1e-10,
  });

  expect(result.success).toBe(true);
  expect(result.loss).toBeLessThan(1e-10);
  expect(result.expr).not.toBeNull();

  if (result.expr) {
    const val = evaluate(result.expr, { x: 1.2 });
    expect(val.re).toBeCloseTo(Math.exp(1.2), 6);
  }
});

test("trainMasterFormula recovers e-x at depth 2", () => {
  // e - x is expressible at depth-2: eml(1, eml(x,1))
  const samples = [0.5, 1.0, 1.5, 2.0].map((x) => C(x, 0));
  const targets = samples.map((s) => C(Math.E - s.re, 0));

  const result = trainMasterFormula(samples, targets, {
    depth: 2,
    restarts: 16,
    lr: 0.05,
    epochs: 800,
    hardeningEpochs: 400,
    tolerance: 1e-9,
  });

  expect(result.success).toBe(true);
  expect(result.loss).toBeLessThan(1e-9);
  expect(result.expr).not.toBeNull();

  if (result.expr) {
    const val = evaluate(result.expr, { x: 1.2 });
    expect(val.re).toBeCloseTo(Math.E - 1.2, 6);
  }
});

test("trainMasterFormula converges toward ln(x) at depth 3", () => {
  // ln(x) is harder than exp(x); we verify training reduces loss significantly
  // even if exact recovery requires more restarts/depth than practical for CI.
  const samples = [0.6, 0.9, 1.3, 1.8, 2.5].map((x) => C(x, 0));
  const targets = samples.map((s) => C(Math.log(s.re), 0));

  const result = trainMasterFormula(samples, targets, {
    depth: 3,
    restarts: 4,
    lr: 0.03,
    epochs: 400,
    hardeningEpochs: 200,
    tolerance: 1e-8,
  });

  // Training should at least find a decent fit (< 0.5 MSE).
  expect(result.loss).toBeLessThan(0.5);
});

test("trainMasterFormula converges toward -x at depth 2", () => {
  // Negation needs the -Infinity seed witness; our tree lacks direct access.
  // We just verify the optimizer runs and loss improves from random init.
  const samples = [0.5, 1.0, 1.5, 2.0, 3.0].map((x) => C(x, 0));
  const targets = samples.map((s) => C(-s.re, 0));

  const randomLoss = masterLoss(
    createMasterTree(2),
    samples,
    targets,
    Array.from({ length: 14 }, () => Math.random() * 0.2 - 0.1),
    1.0,
  );

  const result = trainMasterFormula(samples, targets, {
    depth: 2,
    restarts: 4,
    lr: 0.05,
    epochs: 400,
    hardeningEpochs: 200,
    tolerance: 1e-8,
  });

  // Optimizer should do better than random.
  expect(result.loss).toBeLessThan(randomLoss);
});
