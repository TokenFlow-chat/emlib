import type { Expr } from "emlib";

export function collectVariables(expr: Expr, out = new Set<string>()): string[] {
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

export function defaultValueForVariable(name: string): string {
  if (name === "x") return "0.5";
  if (name === "y") return "2";
  if (name === "z") return "1";
  return "1";
}

export function parseEnvValue(raw: string | undefined, fallback: string): number {
  const parsed = Number(raw ?? fallback);
  return Number.isFinite(parsed) ? parsed : Number(fallback);
}

export function formatScalar(value: number): string {
  if (Math.abs(value) < 1e-10) return "0";
  const rounded = Number(value.toFixed(6));
  return String(rounded);
}

export function formatComplex(value: { re: number; im: number }): string {
  const re = Math.abs(value.re) < 1e-10 ? 0 : value.re;
  const im = Math.abs(value.im) < 1e-10 ? 0 : value.im;

  if (im === 0) return formatScalar(re);
  if (re === 0) {
    if (im === 1) return "i";
    if (im === -1) return "-i";
    return `${formatScalar(im)}i`;
  }

  const sign = im >= 0 ? "+" : "-";
  const absIm = Math.abs(im);
  const imag = absIm === 1 ? "i" : `${formatScalar(absIm)}i`;
  return `${formatScalar(re)} ${sign} ${imag}`;
}

export function metricDelta(a: { re: number; im: number }, b: { re: number; im: number }): number {
  return Math.hypot(a.re - b.re, a.im - b.im);
}

export function withTransparentD2Background(source: string): string {
  if (!source.trim()) return source;
  return `style: { fill: transparent }

classes: {
  function: { shape: circle }

  variable: {
    shape: square
    style: { fill: cyan }
  }

  constant: {
    shape: square
    style: { fill: pink }
  }
}

${source}`;
}

function isSafeLocalReference(value: string): boolean {
  const normalized = value.trim();
  return normalized === "" || normalized.startsWith("#");
}

function sanitizeSvgDocument(svg: SVGSVGElement): SVGSVGElement {
  svg
    .querySelectorAll("script, foreignObject, iframe, object, embed, audio, video")
    .forEach((node) => {
      node.remove();
    });

  svg.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name);
        continue;
      }

      if ((name === "href" || name === "xlink:href") && !isSafeLocalReference(value)) {
        node.removeAttribute(attribute.name);
      }
    }
  });

  return svg;
}

export function buildSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function normalizeRenderedSvg(output: unknown): string | null {
  let raw: string | null = null;

  if (typeof output === "string") {
    raw = output;
  } else if (output && typeof output === "object") {
    if ("svg" in output && typeof output.svg === "string") {
      raw = output.svg;
    } else if ("data" in output && typeof output.data === "string") {
      raw = output.data;
    } else if ("outerHTML" in output && typeof output.outerHTML === "string") {
      raw = output.outerHTML;
    }
  }

  if (!raw || !raw.includes("<svg")) return null;

  const parsed = new DOMParser().parseFromString(raw, "image/svg+xml");
  if (parsed.querySelector("parsererror")) return null;

  const svg = parsed.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== "svg") return null;

  const safeSvg = sanitizeSvgDocument(svg as unknown as SVGSVGElement);
  safeSvg.setAttribute("width", "100%");
  safeSvg.setAttribute("height", "100%");
  safeSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  return safeSvg.outerHTML;
}
