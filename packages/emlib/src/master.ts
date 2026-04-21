import type { Expr } from "./ast";
import { eml, num, variable } from "./ast";
import { C, type Complex, cAdd, cSub, cMul, cExp, cLog } from "./evaluator";

// Re-export Complex so consumers can import from this module.
export type { Complex } from "./evaluator";

// ============================================================================
// Master Formula: parameterized EML tree
//
// Implements the "master formula" from Section 4.3 of the paper:
//   F(x) = eml(α + β*x + γ*left_child, α' + β'*x + γ'*right_child)
//
// Each input slot uses a softmax over logits to interpolate between:
//   - constant 1
//   - input variable x
//   - child subtree result (non-leaf nodes only)
//
// During training, weights are pushed toward {0,1} via temperature
// annealing (hardening), then clamped to exact discrete choices.
// ============================================================================

function softmax(logits: readonly number[], temperature = 1.0): number[] {
  if (temperature <= 0) {
    const maxIdx = logits.indexOf(Math.max(...logits));
    return logits.map((_, i) => (i === maxIdx ? 1 : 0));
  }
  const shifted = logits.map((l) => l - Math.max(...logits));
  const exps = shifted.map((l) => Math.exp(l / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export interface MasterNodeMeta {
  /** Index in the post-order traversal. */
  index: number;
  /** True if this node is at depth 0 (leaf). */
  isLeaf: boolean;
  /** Left child index, or -1 for leaf. */
  leftChild: number;
  /** Right child index, or -1 for leaf. */
  rightChild: number;
  /** Start index of this node's params in the flat array. */
  paramStart: number;
  /** Number of params for this node (4 for leaf, 6 for internal). */
  paramCount: number;
}

export interface MasterTree {
  /** Tree depth (1 = single node, 2 = 3 nodes, etc). */
  depth: number;
  /** Total node count = 2^depth - 1. */
  nodeCount: number;
  /** Total parameter count = 5*2^depth - 6. */
  paramCount: number;
  /** Post-order node metadata. */
  nodes: MasterNodeMeta[];
}

/**
 * Build a full binary master formula tree of the given depth.
 * Nodes are arranged in post-order so children always precede parents.
 */
export function createMasterTree(depth: number): MasterTree {
  if (depth < 1 || !Number.isFinite(depth) || depth !== Math.floor(depth)) {
    throw new Error(`Master tree depth must be a positive integer, got ${depth}`);
  }

  const nodeCount = (1 << depth) - 1;
  const nodes: MasterNodeMeta[] = [];

  // Build post-order layout recursively.
  let paramCursor = 0;

  function build(subDepth: number, baseOffset: number): void {
    if (subDepth === 1) {
      // Leaf: 2 input slots × 2 logits = 4 params.
      nodes.push({
        index: nodes.length,
        isLeaf: true,
        leftChild: -1,
        rightChild: -1,
        paramStart: paramCursor,
        paramCount: 4,
      });
      paramCursor += 4;
      return;
    }

    const leftOffset = baseOffset;
    const rightOffset = baseOffset + ((1 << (subDepth - 1)) - 1);
    build(subDepth - 1, leftOffset);
    build(subDepth - 1, rightOffset);

    // Internal node: 2 input slots × 3 logits = 6 params.
    nodes.push({
      index: nodes.length,
      isLeaf: false,
      leftChild: leftOffset + ((1 << (subDepth - 1)) - 1) - 1,
      rightChild: rightOffset + ((1 << (subDepth - 1)) - 1) - 1,
      paramStart: paramCursor,
      paramCount: 6,
    });
    paramCursor += 6;
  }

  build(depth, 0);

  return {
    depth,
    nodeCount,
    paramCount: paramCursor,
    nodes,
  };
}

/**
 * Forward evaluation of the master formula for a single input.
 * Returns the value at the root node.
 */
export function forwardMaster(
  tree: MasterTree,
  x: Complex,
  params: readonly number[],
  temperature = 1.0,
): Complex {
  if (params.length !== tree.paramCount) {
    throw new Error(`Expected ${tree.paramCount} params, got ${params.length}`);
  }

  // Pre-initialize with dummy values; every slot will be overwritten in post-order.
  const values: Complex[] = Array.from({ length: tree.nodeCount }, () => C(0, 0));
  const ONE = C(1, 0);

  for (const node of tree.nodes) {
    const ps = node.paramStart;
    let leftInput: Complex;
    let rightInput: Complex;

    if (node.isLeaf) {
      const lw = softmax([params[ps]!, params[ps + 1]!], temperature) as [number, number];
      const rw = softmax([params[ps + 2]!, params[ps + 3]!], temperature) as [number, number];
      leftInput = cAdd(cMul(C(lw[0], 0), ONE), cMul(C(lw[1], 0), x));
      rightInput = cAdd(cMul(C(rw[0], 0), ONE), cMul(C(rw[1], 0), x));
    } else {
      const lcv = values[node.leftChild]!;
      const rcv = values[node.rightChild]!;
      const lw = softmax([params[ps]!, params[ps + 1]!, params[ps + 2]!], temperature) as [
        number,
        number,
        number,
      ];
      const rw = softmax([params[ps + 3]!, params[ps + 4]!, params[ps + 5]!], temperature) as [
        number,
        number,
        number,
      ];
      leftInput = cAdd(cAdd(cMul(C(lw[0], 0), ONE), cMul(C(lw[1], 0), x)), cMul(C(lw[2], 0), lcv));
      rightInput = cAdd(cAdd(cMul(C(rw[0], 0), ONE), cMul(C(rw[1], 0), x)), cMul(C(rw[2], 0), rcv));
    }

    // Clamp exp argument to prevent overflow.
    const clampedLeft = C(Math.max(-50, Math.min(50, leftInput.re)), leftInput.im);

    values[node.index] = cSub(cExp(clampedLeft), cLog(rightInput));
  }

  return values[tree.nodeCount - 1]!;
}

/**
 * Convert trained (discrete) master parameters into a standard AST.
 * Call this after clamping/hardening with a very low temperature.
 */
export function masterToExpr(tree: MasterTree, params: readonly number[], varName = "x"): Expr {
  if (params.length !== tree.paramCount) {
    throw new Error(`Expected ${tree.paramCount} params, got ${params.length}`);
  }

  // Pre-initialize; every slot overwritten in post-order.
  const nodeExprs: Expr[] = Array.from({ length: tree.nodeCount }, () => num(0));
  const xVar = variable(varName);
  const one = num(1);

  for (const node of tree.nodes) {
    const ps = node.paramStart;
    let leftExpr: Expr;
    let rightExpr: Expr;

    if (node.isLeaf) {
      const lw = softmax([params[ps]!, params[ps + 1]!], 0.001) as [number, number];
      const rw = softmax([params[ps + 2]!, params[ps + 3]!], 0.001) as [number, number];
      leftExpr = lw[1] > lw[0] ? xVar : one;
      rightExpr = rw[1] > rw[0] ? xVar : one;
    } else {
      const lcv = nodeExprs[node.leftChild]!;
      const rcv = nodeExprs[node.rightChild]!;
      const lw = softmax([params[ps]!, params[ps + 1]!, params[ps + 2]!], 0.001) as [
        number,
        number,
        number,
      ];
      const rw = softmax([params[ps + 3]!, params[ps + 4]!, params[ps + 5]!], 0.001) as [
        number,
        number,
        number,
      ];

      const maxL = Math.max(...lw);
      const maxR = Math.max(...rw);
      leftExpr = lw[0] === maxL ? one : lw[1] === maxL ? xVar : lcv;
      rightExpr = rw[0] === maxR ? one : rw[1] === maxR ? xVar : rcv;
    }

    nodeExprs[node.index] = eml(leftExpr, rightExpr);
  }

  return nodeExprs[tree.nodeCount - 1]!;
}

/**
 * Compute mean squared error over a batch of samples.
 */
export function masterLoss(
  tree: MasterTree,
  samples: readonly Complex[],
  targets: readonly Complex[],
  params: readonly number[],
  temperature = 1.0,
): number {
  let s = 0;
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const pred = forwardMaster(tree, samples[i]!, params, temperature);
    const dr = pred.re - targets[i]!.re;
    const di = pred.im - targets[i]!.im;
    s += dr * dr + di * di;
  }
  return s / n;
}

/**
 * Numerical gradient via central differences.
 * Stable and correct; slightly slower than autodiff but avoids
 * manually deriving gradients through softmax + exp + log.
 */
export function masterGradient(
  tree: MasterTree,
  samples: readonly Complex[],
  targets: readonly Complex[],
  params: readonly number[],
  temperature = 1.0,
  eps = 1e-6,
): number[] {
  const grads = Array.from({ length: tree.paramCount }, () => 0);
  const mutable = [...params];

  for (let i = 0; i < tree.paramCount; i++) {
    const orig = mutable[i]!;
    mutable[i] = orig + eps;
    const plus = masterLoss(tree, samples, targets, mutable, temperature);
    mutable[i] = orig - eps;
    const minus = masterLoss(tree, samples, targets, mutable, temperature);
    mutable[i] = orig;
    grads[i] = (plus - minus) / (2 * eps);
  }

  return grads;
}

/**
 * Clamp parameters to discrete {0,1} choices.
 * Returns a fresh param array with hardened logits (10 vs -10).
 */
export function clampMasterParams(tree: MasterTree, params: readonly number[]): number[] {
  const out = [...params];

  for (const node of tree.nodes) {
    const ps = node.paramStart;

    if (node.isLeaf) {
      // Left slot: pick max of [1, x]
      const l1 = params[ps]!;
      const lx = params[ps + 1]!;
      if (l1 >= lx) {
        out[ps] = 10;
        out[ps + 1] = -10;
      } else {
        out[ps] = -10;
        out[ps + 1] = 10;
      }
      // Right slot
      const r1 = params[ps + 2]!;
      const rx = params[ps + 3]!;
      if (r1 >= rx) {
        out[ps + 2] = 10;
        out[ps + 3] = -10;
      } else {
        out[ps + 2] = -10;
        out[ps + 3] = 10;
      }
    } else {
      // Internal: pick max of [1, x, child]
      for (let slot = 0; slot < 2; slot++) {
        const off = ps + slot * 3;
        const v0 = params[off]!;
        const v1 = params[off + 1]!;
        const v2 = params[off + 2]!;
        const maxV = Math.max(v0, v1, v2);
        out[off] = v0 === maxV ? 10 : -10;
        out[off + 1] = v1 === maxV ? 10 : -10;
        out[off + 2] = v2 === maxV ? 10 : -10;
      }
    }
  }

  return out;
}
