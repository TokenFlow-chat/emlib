# EMLib: EML lib

[简体中文](./README.zh.md)

EML is a research-oriented TypeScript monorepo built around the operator

$$
\mathrm{eml}(x, y) = \exp(x) - \ln(y)
$$

inspired by the paper
[_All elementary functions from a single binary operator_](https://arxiv.org/abs/2603.21852).

This repository combines two parts:

- `packages/emlib`: a small library for parsing, lowering, rewriting, evaluating, and visualizing elementary expressions.
- `src/`: a Bun + React 19 playground that makes the paper, the lowering pipeline, and D2-based expression diagrams explorable in one UI.

The goal is not just to restate the paper. The project turns the paper's core idea into executable code, a reusable library, and a browser-based playground that helps contributors inspect what is exact, what is approximate, and where expression size grows in practice.

## Why this repository exists

The paper argues that a single binary operator plus a distinguished constant can generate a broad family of elementary functions. This repo exists to make that claim inspectable from three angles:

- library code you can call from TypeScript
- a visual playground you can run locally or deploy as static assets
- documentation that explains the mathematical and engineering tradeoffs

## What is implemented today

### `emlib`

`emlib` currently supports:

- parsing and printing a compact elementary-expression AST
- exact lowering toward pure EML trees with `reduceTypes()` / `toPureEml()`
- token-oriented rewriting with `reduceTokens()` / `simplifyToElementary()`
- expression metrics with `analyzeExpr()`
- exact arithmetic for integers, rationals, and complex rationals when possible via `evaluateLossless()`
- approximate complex evaluation via `evaluate()`
- D2 export for expression trees via `exprToD2()`
- a small beam-search synthesizer for pure EML candidates via `synthesizePureEml()`

Supported expression families include:

- arithmetic: `+`, `-`, `*`, `/`, `^`
- constants: numeric literals, `e`, `pi`, `i`
- core transcendental forms: `exp`, `ln`, `sqrt`, `eml` / `E`
- trigonometric: `sin`, `cos`, `tan`, `cot`, `sec`, `csc`
- hyperbolic: `sinh`, `cosh`, `tanh`, `coth`, `sech`, `csch`
- inverse families: `asin`, `acos`, `atan`, `asec`, `acsc`, `acot`, `asinh`, `acosh`, `atanh`

### Playground

The web app currently provides:

- side-by-side inspection of the original expression and its pure EML form
- token-count and operator-type metrics for both forms
- approximate evaluation of both forms under the same variable assignments
- D2-based tree rendering for standard and pure forms
- lazy loading of the D2 runtime so diagram rendering does not bloat the initial bundle
- simple bilingual UI support inside the app

## Project status

This is an active exploratory codebase, but it is already usable for local experiments and collaborative iteration.

What to expect:

- the repo is optimized for local Bun workflows
- `emlib` is consumed as a workspace package by the playground
- package publishing to npm is not set up yet
- mathematical coverage is intentionally narrower than “all possible elementary mathematics”; the README only claims what the current code and tests actually cover

## Quick start

### Prerequisites

- [Bun](https://bun.sh/)

### Install and run

```bash
bun install
bun run dev
```

This starts the Bun development server defined in `src/index.ts`.

### Build the static site

```bash
bun run build
```

Production assets are written to `dist/`.

## Common commands

```bash
bun run dev        # local dev server with HMR
bun run build      # production build to dist/
bun run test       # Bun tests (root + workspace tests)
bun run lint       # oxlint over app and library sources
bun run typecheck  # tsgo typecheck + emlib build
bun run check      # lint + typecheck + test + build
```

## Repository layout

```text
.
├── docs/
│   ├── 2603.21852v2.pdf
│   └── eml_deep_dive.md
├── packages/
│   └── emlib/
│       ├── src/
│       ├── test/
│       └── README.md
├── src/
│   ├── components/
│   ├── features/eml-playground/
│   ├── i18n/
│   ├── styles/
│   ├── App.tsx
│   ├── frontend.tsx
│   ├── index.html
│   └── index.ts
├── build.ts
├── package.json
└── tsconfig.json
```

## Using `emlib`

```ts
import {
  analyzeExpr,
  evaluate,
  evaluateLossless,
  exprToD2,
  parse,
  reduceTokens,
  reduceTypes,
  toString,
} from "emlib";

const expr = parse("exp(x) - ln(y)");

console.log(analyzeExpr(expr));
console.log(toString(reduceTypes(expr)));
console.log(toString(reduceTokens(expr)));
console.log(evaluate(expr, { x: 0.5, y: 2 }));
console.log(evaluateLossless(parse("(1 + 2*i) / (3 - 4*i)")));
console.log(exprToD2(expr));
```

### Semantics and evaluation notes

- Exact lowering is implemented by first desugaring extended elementary functions into a smaller core and then lowering that core into pure EML forms.
- `evaluateLossless()` keeps rational and complex-rational arithmetic exact when possible and preserves symbolic transcendental leftovers instead of silently rounding them.
- `evaluate()` uses approximate complex arithmetic and follows the implemented principal-branch behavior of `ln`, inverse functions, and derived identities.

## Documentation

- [docs/eml_deep_dive.md](./docs/eml_deep_dive.md): a longer Chinese walkthrough of the paper and the engineering interpretation behind this repo
- [docs/2603.21852v2.pdf](./docs/2603.21852v2.pdf): a local copy of the paper used as reference material
- [packages/emlib/README.md](./packages/emlib/README.md): package-level notes focused on the library itself

## Development notes

### Tooling

- Bun handles dev serving, building, and testing
- React 19 powers the playground UI
- `oxlint` is the default linter
- `tsgo` from `@typescript/native-preview` is used for type checking and package builds

### Frontend build strategy

The app intentionally keeps the D2 runtime behind dynamic import boundaries. `build.ts` enables bundle splitting so diagram rendering stays out of the initial entry chunk unless needed.

### Deployment

The repository includes a GitHub Actions workflow that builds `dist/` on pushes to `main` and deploys it to GitHub Pages. The workflow is currently configured with the custom domain `eml.tokenflow.chat`.

## Contributing

Issues and pull requests are welcome.

If you want to contribute, the most helpful workflow is:

1. Install dependencies with `bun install`.
2. Run `bun run check` before opening a PR.
3. Keep README and docs updates aligned with the actual code and tests.
4. Be explicit about whether a change affects mathematical semantics, UI behavior, or both.

Good contribution areas include:

- new exact lowering rules with tests
- better rewrite heuristics and simplification passes
- tighter documentation around branch cuts and evaluation semantics
- UI improvements for inspecting large pure EML trees
- packaging and release ergonomics for `emlib`

## License

This repository is licensed under [Apache License 2.0](./LICENSE).
