import { expect, test } from "bun:test";
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
} from "../src/index";

test("lower ln(x) exactly", () => {
  const expr = parse("ln(x)");
  const pure = toPureEml(expr);
  const a = evaluate(expr, { x: 2.3 });
  const b = evaluate(pure, { x: 2.3 });
  expect(a.re).toBeCloseTo(b.re, 8);
  expect(a.im).toBeCloseTo(b.im, 8);
});

test("simplify pure eml back to ln(x)", () => {
  const expr = toPureEml(parse("ln(x)"));
  const simplified = simplifyToElementary(expr);
  expect(toString(simplified)).toBe("ln(x)");
});

test("toPureEml uses the direct E(x,y) form for exp(x) - ln(y)", () => {
  expect(toString(toPureEml(parse("exp(x) - ln(y)")))).toBe("E(x,y)");
});

test("toPureEml applies simple algebraic and inverse cancellations before lowering", () => {
  expect(toString(toPureEml(parse("exp(ln(x))")))).toBe("x");
  expect(toString(toPureEml(parse("x + 0")))).toBe("x");
  expect(toString(toPureEml(parse("1 * x")))).toBe("x");
  expect(toString(toPureEml(parse("x / 1")))).toBe("x");
});

test("reduceTypes keeps only the EML core and chooses shorter direct forms when available", () => {
  const expr = parse("exp(x) - ln(y)");
  const reduced = reduceTypes(expr);
  const before = analyzeExpr(expr);
  const after = analyzeExpr(reduced);

  expect(after.typeCount).toBeLessThanOrEqual(before.typeCount);
  expect(after.types).toEqual(["eml"]);
  expect(after.tokenCount).toBeLessThanOrEqual(before.tokenCount);
});

test("reduceTokens prefers the shorter mixed vocabulary form", () => {
  const expr = parse("exp(x) - ln(y)");
  const reduced = reduceTokens(expr);
  expect(toString(reduced)).toBe("E(x,y)");
  expect(analyzeExpr(reduced).tokenCount).toBeLessThan(analyzeExpr(expr).tokenCount);
});

test("lossless arithmetic keeps exact rational and complex values", () => {
  const rational = evaluateLossless(parse("1/3 + 1/6"));
  expect(toString(valueToExpr(rational))).toBe("1/2");

  const complex = evaluateLossless(parse("(1 + 2*i) / (3 - 4*i)"));
  expect(toString(valueToExpr(complex))).toBe("-1/5+2/5*i");
});

test("lossless evaluation keeps safe elementary identities exact", () => {
  expect(toString(valueToExpr(evaluateLossless(parse("sqrt(4)"))))).toBe("2");
  expect(toString(valueToExpr(evaluateLossless(parse("sqrt(-4)"))))).toBe("2*i");
  expect(toString(valueToExpr(evaluateLossless(parse("sin(0)"))))).toBe("0");
  expect(toString(valueToExpr(evaluateLossless(parse("cos(0)"))))).toBe("1");
  expect(toString(valueToExpr(evaluateLossless(parse("acosh(1)"))))).toBe("0");
  expect(toString(valueToExpr(evaluateLossless(parse("exp(ln(2))"))))).toBe("2");
  expect(toString(valueToExpr(evaluateLossless(parse("ln(exp(2))"))))).toBe("2");
});

test("lossless evaluation stays conservative on branch-sensitive log identities", () => {
  const symbolic = evaluateLossless(parse("ln(exp(i))"));
  expect(toString(valueToExpr(symbolic))).toBe("ln(exp(1*i))");
});

test("toPureEml uses compact paper witnesses for key arithmetic forms", () => {
  const cases = [
    ["-x", 15],
    ["1/x", 15],
    ["x*y", 25],
    ["x/y", 39],
    ["1/2", 39],
  ] as const;

  for (const [source, maxTokens] of cases) {
    const lowered = toPureEml(parse(source));
    expect(analyzeExpr(lowered).tokenCount).toBeLessThanOrEqual(maxTokens);
  }
});

test("simplifyToElementary recognizes the new compact witnesses", () => {
  expect(toString(simplifyToElementary(toPureEml(parse("1/x"))))).toBe("1/x");
  expect(toString(simplifyToElementary(toPureEml(parse("x*y"))))).toBe("x*y");
  expect(toString(simplifyToElementary(toPureEml(parse("x/y"))))).toBe("x/y");
  expect(toString(simplifyToElementary(toPureEml(parse("x^2"))))).toBe("x^2");
});

test("compact EML witnesses stay numerically equivalent on arithmetic samples", () => {
  const samples = [
    { expr: "-x", env: { x: 2.5 } },
    { expr: "1/x", env: { x: 2.5 } },
    { expr: "x*y", env: { x: 2.5, y: 4 } },
    { expr: "x/y", env: { x: 2.5, y: 4 } },
    { expr: "x^2", env: { x: 2.5 } },
    { expr: "sqrt(x)", env: { x: 2.5 } },
  ] as const;

  for (const { expr, env } of samples) {
    const direct = evaluate(parse(expr), env);
    const lowered = evaluate(toPureEml(parse(expr)), env);
    expect(lowered.re).toBeCloseTo(direct.re, 8);
    expect(lowered.im).toBeCloseTo(direct.im, 8);
  }
});

test("toPureEml accepts iterative compression levels without regressing accuracy", () => {
  const base = toPureEml(parse("tan(x)"));
  const compressed = toPureEml(parse("tan(x)"), { compression: "light" });
  expect(analyzeExpr(compressed).tokenCount).toBeLessThanOrEqual(analyzeExpr(base).tokenCount);

  const direct = evaluate(parse("tan(x)"), { x: 0.35 });
  const lowered = evaluate(compressed, { x: 0.35 });
  expect(lowered.re).toBeCloseTo(direct.re, 8);
  expect(lowered.im).toBeCloseTo(direct.im, 8);
});

test("synthesis returns a finite candidate", () => {
  const result = synthesizePureEml(parse("ln(x)"), {
    maxLeaves: 7,
    beamWidth: 128,
    variables: ["x"],
  });
  expect(result).toBeDefined();
  if (!result) {
    throw new Error("Expected a synthesis candidate for ln(x)");
  }
  expect(Number.isFinite(result.distance)).toBe(true);
  expect(Number.isFinite(result.delta)).toBe(true);
});
