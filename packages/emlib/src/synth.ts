import type { Expr } from './ast';
import { eml, num, variable } from './ast';
import { evaluate } from './eval';
import { toString } from './print';

export interface SampleEnv {
  [name: string]: number;
}

export interface SynthOptions {
  maxLeaves?: number;
  beamWidth?: number;
  variables?: string[];
  samples?: SampleEnv[];
  tolerance?: number;
}

export interface SynthResult {
  expr: Expr;
  distance: number;
  leaves: number;
}

interface Candidate extends SynthResult {
  values: number[];
}

function leafCount(expr: Expr): number {
  switch (expr.kind) {
    case 'num':
    case 'var':
      return 1;
    case 'eml':
      return leafCount(expr.left) + leafCount(expr.right);
    default:
      throw new Error('synth only works with pure EML candidates');
  }
}

function metric(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = (a[i] ?? NaN) - (b[i] ?? NaN);
    s += d * d;
  }
  return Math.sqrt(s / Math.max(1, a.length));
}

function fingerprint(values: number[], tol = 1e-10): string {
  return values.map((v) => (Number.isFinite(v) ? (Math.round(v / tol) * tol).toFixed(10) : 'nan')).join('|');
}

function evalReal(expr: Expr, samples: SampleEnv[]): number[] {
  return samples.map((env) => evaluate(expr, env).re);
}

export function synthesizePureEml(target: Expr, options: SynthOptions = {}): SynthResult | null {
  const maxLeaves = options.maxLeaves ?? 9;
  const beamWidth = options.beamWidth ?? 256;
  const variables = options.variables ?? ['x'];
  const samples = options.samples ?? [
    { x: 0.5, y: 1.2 },
    { x: 0.8, y: 1.5 },
    { x: 1.1, y: 1.9 },
    { x: 1.4, y: 2.3 },
  ];
  const tolerance = options.tolerance ?? 1e-8;

  const targetValues = evalReal(target, samples);
  const levels = new Map<number, Candidate[]>();
  const seed: Candidate[] = [
    { expr: num(1), values: samples.map(() => 1), distance: metric(samples.map(() => 1), targetValues), leaves: 1 },
    ...variables.map((name) => {
      const expr = variable(name);
      const values = samples.map((s) => s[name] ?? NaN);
      return { expr, values, distance: metric(values, targetValues), leaves: 1 };
    }),
  ];
  levels.set(1, seed);

  let best: Candidate | null = seed.slice().sort((a, b) => a.distance - b.distance)[0] ?? null;
  if (best && best.distance <= tolerance) return best;

  for (let leaves = 3; leaves <= maxLeaves; leaves += 2) {
    const pool: Candidate[] = [];
    const seen = new Set<string>();
    for (let l = 1; l < leaves; l += 2) {
      const r = leaves - l;
      const lefts = levels.get(l) ?? [];
      const rights = levels.get(r) ?? [];
      for (const a of lefts.slice(0, beamWidth)) {
        for (const b of rights.slice(0, beamWidth)) {
          const expr = eml(a.expr, b.expr);
          const values = evalReal(expr, samples);
          if (values.some((v) => !Number.isFinite(v))) continue;
          const fp = fingerprint(values);
          if (seen.has(fp)) continue;
          seen.add(fp);
          const cand: Candidate = { expr, values, distance: metric(values, targetValues), leaves };
          pool.push(cand);
        }
      }
    }
    pool.sort((a, b) => a.distance - b.distance || a.leaves - b.leaves || toString(a.expr).localeCompare(toString(b.expr)));
    levels.set(leaves, pool.slice(0, beamWidth));
    const top = pool[0];
    if (top && (!best || top.distance < best.distance)) best = top;
    if (best && best.distance <= tolerance) return best;
  }
  return best;
}
