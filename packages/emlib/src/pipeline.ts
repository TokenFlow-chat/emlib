import type { Expr } from "./ast";
import { countTokens, exprKey } from "./analyze";
import { reduceTypes } from "./lower";
import { compressPureEml, type CompressionOptions, type SampleEnv } from "./synth";

export interface TransformOptions extends CompressionOptions {
  strict?: boolean;
  compressionBeamWidth?: number;
  compressionMaxLeaves?: number;
  compressionSamples?: SampleEnv[];
}

const compressionCache = new Map<string, Expr>();

function compressionCacheKey(expr: Expr, options: TransformOptions): string {
  const sampleKey = (samples?: SampleEnv[]) =>
    samples
      ? samples
          .map((env) =>
            Object.keys(env)
              .sort()
              .map((key) => `${key}:${env[key]}`)
              .join(","),
          )
          .join(";")
      : "";
  return [
    exprKey(expr),
    String(options.compression ?? "off"),
    String(options.compressionBeamWidth ?? ""),
    String(options.compressionMaxLeaves ?? ""),
    String(options.maxDelta ?? ""),
    String(options.minTokenGain ?? ""),
    sampleKey(options.compressionSamples),
    sampleKey(options.validationSamples),
  ].join("|");
}

function maybeCompressPureEml(expr: Expr, options: TransformOptions): Expr {
  const compression = options.compression ?? "off";
  if (compression === "off" || compression === 0) return expr;
  if (countTokens(expr) < 9) return expr;

  const key = compressionCacheKey(expr, options);
  const cached = compressionCache.get(key);
  if (cached) return cached;

  const compressed =
    compressPureEml(expr, {
      compression,
      samples: options.compressionSamples,
      validationSamples: options.validationSamples,
      beamWidth: options.compressionBeamWidth,
      maxLeaves: options.compressionMaxLeaves,
      maxDelta: options.maxDelta,
      minTokenGain: options.minTokenGain,
    })?.expr ?? expr;

  // Cap cache size to prevent unbounded growth.
  if (compressionCache.size >= 1024) compressionCache.clear();
  compressionCache.set(key, compressed);
  return compressed;
}

/**
 * Lower a standard expression to pure EML, with optional post-lowering compression.
 * This is the recommended high-level entry point for lowering.
 */
export function toPureEml(expr: Expr, options: TransformOptions = {}): Expr {
  const lowered = reduceTypes(expr, { strict: options.strict });
  return maybeCompressPureEml(lowered, options);
}
