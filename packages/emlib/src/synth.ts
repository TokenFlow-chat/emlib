import type { Expr } from "./ast";
import { eml, num, variable } from "./ast";
import { countTokens } from "./analyze";
import { evaluate } from "./evaluator";
import { toString } from "./print";

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
  delta: number;
  leaves: number;
}

interface Candidate extends SynthResult {
  values: number[];
}

export type CompressionLevel = 0 | 1 | 2 | 3 | "off" | "light" | "medium" | "aggressive";

export interface CompressionOptions extends SynthOptions {
  compression?: CompressionLevel;
  validationSamples?: SampleEnv[];
  maxDelta?: number;
  minTokenGain?: number;
}

function metric(a: number[], b: number[]): number {
  let s = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? NaN;
    const bv = b[i] ?? NaN;
    if (Number.isNaN(av) || Number.isNaN(bv)) return Number.POSITIVE_INFINITY;
    if (!Number.isFinite(av) || !Number.isFinite(bv)) {
      if (av === bv) continue;
      s += 1e12;
      n += 1;
      continue;
    }
    const d = av - bv;
    s += d * d;
    n += 1;
  }
  return Math.sqrt(s / Math.max(1, n));
}

function fingerprint(values: number[], tol = 1e-10): string {
  return values
    .map((v) => {
      if (Number.isNaN(v)) return "nan";
      if (v === Number.POSITIVE_INFINITY) return "inf";
      if (v === Number.NEGATIVE_INFINITY) return "-inf";
      return (Math.round(v / tol) * tol).toFixed(10);
    })
    .join("|");
}

function evalReal(expr: Expr, samples: SampleEnv[]): number[] {
  return samples.map((env) => evaluate(expr, env).re);
}

function maxAbsDelta(a: number[], b: number[]): number {
  let best = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? NaN;
    const bv = b[i] ?? NaN;
    if (Number.isNaN(av) || Number.isNaN(bv)) return Number.POSITIVE_INFINITY;
    if (!Number.isFinite(av) || !Number.isFinite(bv)) {
      if (av !== bv) return Number.POSITIVE_INFINITY;
      continue;
    }
    best = Math.max(best, Math.abs(av - bv));
  }
  return best;
}

function collectVariables(expr: Expr, out = new Set<string>()): string[] {
  switch (expr.kind) {
    case "var":
      out.add(expr.name);
      break;
    case "eml":
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
      collectVariables(expr.left, out);
      collectVariables(expr.right, out);
      break;
    case "neg":
    case "exp":
    case "ln":
    case "sqrt":
    case "sin":
    case "cos":
    case "tan":
    case "cot":
    case "sec":
    case "csc":
    case "sinh":
    case "cosh":
    case "tanh":
    case "coth":
    case "sech":
    case "csch":
    case "asin":
    case "acos":
    case "atan":
    case "asec":
    case "acsc":
    case "acot":
    case "asinh":
    case "acosh":
    case "atanh":
      collectVariables(expr.value, out);
      break;
    default:
      break;
  }
  return [...out].sort();
}

function buildDefaultSamples(
  variables: string[],
  variant: "train" | "validate" = "train",
): SampleEnv[] {
  const bases = variant === "train" ? [0.45, 0.8, 1.1, 1.55, 2.2] : [0.62, 0.93, 1.37, 1.88, 2.6];
  return bases.map((base, index) => {
    const env: SampleEnv = {};
    for (let v = 0; v < variables.length; v += 1) {
      const shift = 0.23 * (v + 1) * (index + 1);
      env[variables[v] as string] = base + shift;
    }
    return env;
  });
}

function normalizeCompressionLevel(level: CompressionLevel | undefined): 0 | 1 | 2 | 3 {
  if (level === undefined || level === "off" || level === 0) return 0;
  if (level === "light" || level === 1) return 1;
  if (level === "aggressive" || level === 3) return 3;
  return 2;
}

function deriveCompressionSearch(
  expr: Expr,
  options: CompressionOptions,
): Required<
  Pick<
    CompressionOptions,
    | "beamWidth"
    | "maxLeaves"
    | "maxDelta"
    | "minTokenGain"
    | "variables"
    | "samples"
    | "validationSamples"
    | "tolerance"
  >
> | null {
  const level = normalizeCompressionLevel(options.compression);
  if (level === 0) return null;

  const tokenBudget = countTokens(expr);
  if (tokenBudget < 9) return null;
  if (tokenBudget > 96 && options.maxLeaves === undefined) return null;

  const variables = options.variables ?? collectVariables(expr);
  if (variables.length > 2 && options.maxLeaves === undefined) return null;
  const samples = options.samples ?? buildDefaultSamples(variables, "train");
  const validationSamples = options.validationSamples ?? buildDefaultSamples(variables, "validate");

  const maxLeavesByLevel = [0, 17, 27, 35] as const;
  const maxLeavesByLevelMulti = [0, 15, 21, 25] as const;
  const beamByLevel = [0, 192, 384, 768] as const;
  const beamByLevelMulti = [0, 128, 224, 320] as const;
  const gainByLevel = [0, 2, 2, 1] as const;
  const deltaByLevel = [0, 1e-10, 1e-11, 1e-12] as const;
  const multivariate = variables.length > 1;

  return {
    beamWidth: options.beamWidth ?? (multivariate ? beamByLevelMulti[level] : beamByLevel[level]),
    maxLeaves:
      options.maxLeaves ??
      Math.min(
        tokenBudget - 2,
        multivariate ? maxLeavesByLevelMulti[level] : maxLeavesByLevel[level],
      ),
    maxDelta: options.maxDelta ?? deltaByLevel[level],
    minTokenGain: options.minTokenGain ?? gainByLevel[level],
    variables,
    samples,
    validationSamples,
    tolerance: options.tolerance ?? 1e-10,
  };
}

function compareCandidates(a: Candidate, b: Candidate): number {
  return (
    a.distance - b.distance ||
    a.leaves - b.leaves ||
    toString(a.expr).localeCompare(toString(b.expr))
  );
}

function isBetterRepresentative(candidate: Candidate, previous: Candidate): boolean {
  return (
    candidate.leaves < previous.leaves ||
    (candidate.leaves === previous.leaves && candidate.distance < previous.distance) ||
    (candidate.leaves === previous.leaves &&
      candidate.distance === previous.distance &&
      toString(candidate.expr) < toString(previous.expr))
  );
}

function combineEmlValues(left: number[], right: number[]): number[] {
  const out = Array.from<number>({ length: left.length });
  for (let i = 0; i < left.length; i += 1) {
    const a = left[i] ?? NaN;
    const b = right[i] ?? NaN;
    if (Number.isNaN(a) || Number.isNaN(b) || b < 0) {
      out[i] = Number.NaN;
      continue;
    }
    const value = Math.exp(a) - Math.log(b);
    out[i] = Number.isNaN(value) ? Number.NaN : value;
  }
  return out;
}

function keepLevelFrontier(pool: Candidate[], beamWidth: number): Candidate[] {
  const keep = new Map<string, Candidate>();
  const add = (candidate: Candidate) => {
    const key = toString(candidate.expr);
    if (!keep.has(key)) keep.set(key, candidate);
  };

  const byQuality = pool.slice().sort(compareCandidates);
  const bySize = pool.slice().sort((a, b) => a.leaves - b.leaves || compareCandidates(a, b));
  const withInfinities = pool
    .filter((candidate) => candidate.values.some((value) => !Number.isFinite(value)))
    .sort((a, b) => a.leaves - b.leaves || compareCandidates(a, b));

  for (const candidate of byQuality.slice(0, beamWidth)) add(candidate);
  for (const candidate of bySize.slice(0, Math.max(8, Math.floor(beamWidth / 2)))) add(candidate);
  for (const candidate of withInfinities.slice(0, Math.max(4, Math.floor(beamWidth / 4))))
    add(candidate);

  return [...keep.values()].sort(compareCandidates);
}

export function synthesizePureEml(target: Expr, options: SynthOptions = {}): SynthResult | null {
  const maxLeaves = options.maxLeaves ?? 9;
  const beamWidth = options.beamWidth ?? 256;
  const variables = options.variables ?? ["x"];
  const samples = options.samples ?? [
    { x: 0.5, y: 1.2 },
    { x: 0.8, y: 1.5 },
    { x: 1.1, y: 1.9 },
    { x: 1.4, y: 2.3 },
  ];
  const tolerance = options.tolerance ?? 1e-8;

  const targetValues = evalReal(target, samples);
  const levels = new Map<number, Candidate[]>();
  const semanticFrontier = new Map<string, Candidate>();
  const seed = keepLevelFrontier(
    [
      {
        expr: num(1),
        values: samples.map(() => 1),
        distance: metric(
          samples.map(() => 1),
          targetValues,
        ),
        delta: maxAbsDelta(
          samples.map(() => 1),
          targetValues,
        ),
        leaves: 1,
      },
      ...variables.map((name) => {
        const expr = variable(name);
        const values = samples.map((s) => s[name] ?? NaN);
        return {
          expr,
          values,
          distance: metric(values, targetValues),
          delta: maxAbsDelta(values, targetValues),
          leaves: 1,
        };
      }),
    ],
    beamWidth,
  );
  for (const candidate of seed) {
    semanticFrontier.set(fingerprint(candidate.values), candidate);
  }
  levels.set(1, seed);

  let best: Candidate | null = seed.slice().sort(compareCandidates)[0] ?? null;
  if (best && best.distance <= tolerance) return best;

  for (let leaves = 3; leaves <= maxLeaves; leaves += 2) {
    const pool = new Map<string, Candidate>();
    for (let l = 1; l < leaves; l += 2) {
      const r = leaves - l - 1;
      const lefts = levels.get(l) ?? [];
      const rights = levels.get(r) ?? [];
      for (const a of lefts) {
        for (const b of rights) {
          const expr = eml(a.expr, b.expr);
          const values = combineEmlValues(a.values, b.values);
          if (values.some((v) => Number.isNaN(v))) continue;
          const fp = fingerprint(values);
          const cand: Candidate = {
            expr,
            values,
            distance: metric(values, targetValues),
            delta: maxAbsDelta(values, targetValues),
            leaves,
          };
          const previousGlobal = semanticFrontier.get(fp);
          if (previousGlobal && !isBetterRepresentative(cand, previousGlobal)) continue;
          const previousLevel = pool.get(fp);
          if (!previousLevel || isBetterRepresentative(cand, previousLevel)) {
            pool.set(fp, cand);
          }
        }
      }
    }
    const level = keepLevelFrontier([...pool.values()], beamWidth);
    for (const candidate of level) {
      semanticFrontier.set(fingerprint(candidate.values), candidate);
    }
    levels.set(leaves, level);
    const top = level[0];
    if (top && (!best || top.distance < best.distance)) best = top;
    if (best && best.distance <= tolerance) return best;
  }
  return best;
}

export function compressPureEml(
  target: Expr,
  options: CompressionOptions = {},
): SynthResult | null {
  const search = deriveCompressionSearch(target, options);
  if (!search) return null;

  const originalTokens = countTokens(target);
  const candidate = synthesizePureEml(target, {
    beamWidth: search.beamWidth,
    maxLeaves: search.maxLeaves,
    variables: search.variables,
    samples: search.samples,
    tolerance: search.tolerance,
  });
  if (!candidate) return null;

  const candidateTokens = countTokens(candidate.expr);
  if (candidateTokens > originalTokens - search.minTokenGain) return null;

  const targetValidation = evalReal(target, search.validationSamples);
  const candidateValidation = evalReal(candidate.expr, search.validationSamples);
  const validatedDelta = maxAbsDelta(candidateValidation, targetValidation);
  if (!(validatedDelta <= search.maxDelta)) return null;

  return {
    ...candidate,
    delta: validatedDelta,
  };
}
