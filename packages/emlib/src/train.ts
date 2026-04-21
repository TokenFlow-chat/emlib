import type { Complex } from "./master";
import {
  clampMasterParams,
  createMasterTree,
  masterGradient,
  masterLoss,
  masterToExpr,
} from "./master";
import type { Expr } from "./ast";

// ============================================================================
// Adam optimizer
// ============================================================================

class AdamState {
  m: number[];
  v: number[];
  t = 0;

  constructor(paramCount: number) {
    this.m = Array.from({ length: paramCount }, () => 0);
    this.v = Array.from({ length: paramCount }, () => 0);
  }

  step(
    params: number[],
    grads: number[],
    lr: number,
    beta1 = 0.9,
    beta2 = 0.999,
    eps = 1e-8,
  ): void {
    this.t += 1;
    const t = this.t;
    for (let i = 0; i < params.length; i++) {
      const g = grads[i]!;
      this.m[i] = beta1 * this.m[i]! + (1 - beta1) * g;
      this.v[i] = beta2 * this.v[i]! + (1 - beta2) * g * g;
      const mHat = this.m[i]! / (1 - Math.pow(beta1, t));
      const vHat = this.v[i]! / (1 - Math.pow(beta2, t));
      params[i] = params[i]! - (lr * mHat) / (Math.sqrt(vHat) + eps);
    }
  }
}

// ============================================================================
// Training interface
// ============================================================================

export interface MasterTrainOptions {
  /** Tree depth (1 = simplest, 2 = exp/ln, 3+ = harder targets). */
  depth?: number;
  /** Number of independent random restarts. */
  restarts?: number;
  /** Adam learning rate. */
  lr?: number;
  /** Training epochs before hardening. */
  epochs?: number;
  /** Hardening epochs (temperature annealing). */
  hardeningEpochs?: number;
  /** Initial softmax temperature. */
  initialTemperature?: number;
  /** Final softmax temperature during hardening. */
  finalTemperature?: number;
  /** MSE tolerance to declare success. */
  tolerance?: number;
  /** Random seed offset for restarts. */
  seedOffset?: number;
}

export interface MasterTrainResult {
  /** Whether training found a solution within tolerance. */
  success: boolean;
  /** Final MSE after clamping. */
  loss: number;
  /** Number of restarts attempted. */
  restarts: number;
  /** Total epochs run (training + hardening) across all restarts. */
  totalEpochs: number;
  /** Final parameters (clamped). */
  params: number[];
  /** Recovered expression tree (only valid if success). */
  expr: Expr | null;
  /** Tree depth used. */
  depth: number;
}

function randomParams(count: number, seed: number): number[] {
  // Simple LCG for reproducibility across environments.
  let s = seed + 12345;
  const a = 1664525;
  const c = 1013904223;
  const m = 4294967296;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    s = (a * s + c) % m;
    // Normal-ish init around 0 with small variance.
    out.push((s / m - 0.5) * 0.2);
  }
  return out;
}

/**
 * Train a master formula to fit target samples.
 *
 * Follows the three-stage pipeline from the paper:
 *   1. Adam optimization with temperature = 1.0
 *   2. Hardening: anneal temperature toward 0 while continuing optimization
 *   3. Clamping: round each softmax to one-hot and verify exact recovery
 */
export function trainMasterFormula(
  samples: readonly Complex[],
  targets: readonly Complex[],
  options: MasterTrainOptions = {},
): MasterTrainResult {
  const depth = options.depth ?? 2;
  const restarts = options.restarts ?? 16;
  const lr = options.lr ?? 0.05;
  const epochs = options.epochs ?? 800;
  const hardeningEpochs = options.hardeningEpochs ?? 400;
  const initialTemperature = options.initialTemperature ?? 1.0;
  const finalTemperature = options.finalTemperature ?? 0.05;
  const tolerance = options.tolerance ?? 1e-12;
  const seedOffset = options.seedOffset ?? 0;

  const tree = createMasterTree(depth);
  const paramCount = tree.paramCount;

  let bestResult: MasterTrainResult | null = null;
  let totalEpochs = 0;

  for (let r = 0; r < restarts; r++) {
    const params = randomParams(paramCount, seedOffset + r * 7919);
    const adam = new AdamState(paramCount);

    // Phase 1: standard training.
    for (let e = 0; e < epochs; e++) {
      const grads = masterGradient(tree, samples, targets, params, initialTemperature);
      adam.step(params, grads, lr);
    }
    totalEpochs += epochs;

    // Phase 2: hardening with temperature annealing.
    for (let e = 0; e < hardeningEpochs; e++) {
      const t =
        initialTemperature -
        ((initialTemperature - finalTemperature) * e) / Math.max(1, hardeningEpochs - 1);
      const grads = masterGradient(tree, samples, targets, params, t);
      // Lower LR during hardening for stability.
      adam.step(params, grads, lr * 0.3);
    }
    totalEpochs += hardeningEpochs;

    // Phase 3: clamp and verify.
    const clamped = clampMasterParams(tree, params);
    const clampedLoss = masterLoss(tree, samples, targets, clamped, 0.001);

    const result: MasterTrainResult = {
      success: clampedLoss <= tolerance,
      loss: clampedLoss,
      restarts: r + 1,
      totalEpochs,
      params: clamped,
      expr: clampedLoss <= tolerance ? masterToExpr(tree, clamped) : null,
      depth,
    };

    if (!bestResult || result.loss < bestResult.loss) {
      bestResult = result;
    }

    // Early exit if we already found an exact solution.
    if (bestResult.success) break;
  }

  return (
    bestResult ?? {
      success: false,
      loss: Infinity,
      restarts: 0,
      totalEpochs: 0,
      params: randomParams(paramCount, seedOffset),
      expr: null,
      depth,
    }
  );
}

// Re-export createMasterTree for convenience.
export { createMasterTree } from "./master";
