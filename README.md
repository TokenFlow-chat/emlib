# EMLib

`EMLib` is a research-oriented TypeScript monorepo built around the operator

$$
\mathrm{eml}(x, y) = \exp(x) - \ln(y)
$$

inspired by _All elementary functions from a single binary operator_ by Andrzej Odrzywolek.

This repository turns the paper into a reusable TypeScript library, a Bun + React playground, and a small documentation set for contributors.

![EML figure](./docs/fig1.svg)

## Links

- Repository: [TokenFlow-chat/emlib](https://github.com/TokenFlow-chat/emlib)
- Demo: [eml.tokenflow.chat](https://eml.tokenflow.chat/)

## What This Repo Includes

- `packages/emlib`: parsing, analysis, lowering, rewriting, evaluation, JSON graph serialization, and experimental search/training utilities for elementary expressions
- `src/`: a browser playground for exploring standard ASTs, pure EML forms, 3D force-directed expression graphs, and selected experiments
- `docs/`: implementation notes and a local copy of the reference paper

The repository is optimized for local Bun workflows, and README claims are intentionally limited to behavior implemented in code and covered by tests.

## Quick Start

- [Bun](https://bun.sh/)

```bash
bun install
bun run dev
```

To build production assets:

```bash
bun run build
```

Static output is written to `dist/`.

## Common Commands

```bash
bun run dev        # local dev server with HMR
bun run start      # run the app in production mode
bun run build      # build the static site to dist/
bun run test       # run Bun tests across the workspace
bun run fmt        # format with oxfmt
bun run fmt:check  # verify formatting
bun run lint       # run oxlint
bun run typecheck  # tsgo typecheck + emlib build
bun run check      # lint + typecheck + test + build
```

## `emlib` At A Glance

```ts
import {
  analyzeExpr,
  evaluate,
  evaluateLossless,
  parse,
  reduceTokens,
  serializeExpr,
  toPureEml,
  toString,
  valueToExpr,
} from "emlib";

const expr = parse("exp(x) - ln(y)");

console.log(analyzeExpr(expr));
console.log(toString(toPureEml(expr)));
console.log(toString(reduceTokens(expr)));
console.log(evaluate(expr, { x: 0.5, y: 2 }));
console.log(toString(valueToExpr(evaluateLossless(parse("(1 + 2*i) / (3 - 4*i)")))));
console.log(serializeExpr(expr));
```

For syntax support, API details, and behavior notes, see [`packages/emlib/README.md`](./packages/emlib/README.md).

## Contributing

Issues and pull requests are welcome.

1. Install dependencies with `bun install`.
2. Run `bun run check` before opening a pull request.
3. Keep README and docs changes aligned with current code and tests.
4. Be explicit about whether a change affects mathematical semantics, library APIs, playground behavior, or documentation.
5. Add or update tests when changing lowering, rewriting, evaluation, synthesis, or training behavior.

## Reference

- Paper title: _All elementary functions from a single binary operator_
- arXiv entry: [2603.21852](https://arxiv.org/abs/2603.21852)

## License

This repository is licensed under the [Apache License 2.0](./LICENSE).
