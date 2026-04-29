# AGENTS.md

## Toolchain

- **Runtime/Package manager**: [Bun](https://bun.sh). Use `bun` for everything — scripts, tests, package management.
- **Typechecker**: `tsgo` (from `@typescript/native-preview`), not `tsc`.
- **Formatter**: `oxfmt`, not prettier.
- **Linter**: `oxlint`, not eslint.
- **Tests**: `bun test` (native Bun test runner), not vitest/jest.

## Commands

```bash
bun run dev          # dev server with HMR (--hot)
bun run start        # production server (NODE_ENV=production)
bun run build        # build static site to dist/
bun run test         # run Bun tests across the workspace
bun run fmt          # format with oxfmt
bun run fmt:check    # verify formatting
bun run lint         # lint src + packages/emlib + build.ts
bun run typecheck    # tsgo --noEmit (root) + emlib type-only build
bun run check        # lint -> typecheck -> test -> build (run before PRs)
```

## Monorepo Structure

```
eml (root workspace)
├── src/                   # Bun + React playground (shadcn/ui, Tailwind v4, D2)
│   ├── index.html         # HTML entrypoint (Bun build scans *.html)
│   ├── frontend.tsx       # React entrypoint (loaded from index.html)
│   └── index.ts           # Bun.serve dev server
├── packages/emlib/        # Core TS library (parsing, lowering, evaluation, synthesis)
│   └── src/index.ts       # Library barrel export
└── build.ts               # Build script (Bun.build, bun-plugin-tailwind)
```

- The `emlib` package is loaded as `workspace:*` dependency in the root. During dev, Bun resolves to `src/index.ts` directly.
- The playground `src/` imports from `emlib` as a workspace package, not a relative path.
- Detailed emlib API docs live in [`packages/emlib/README.md`](packages/emlib/README.md).

## Key Conventions

- `@/` path alias maps to `src/` (shadcn/ui convention via `components.json`).
- `bun-env.d.ts` provides Bun runtime types; included in the root tsconfig.
- `noUnusedLocals`/`noUnusedParameters` is `true` in the root tsconfig but `false` in `packages/emlib/tsconfig.json`. The root lint command only lints `src/`, `packages/emlib/src/`, and `packages/emlib/test/`.
- The root `typecheck` script also builds the emlib package (`tsgo -p tsconfig.json` in `packages/emlib`). If you change the library, run `bun run typecheck` or `bun run check` to verify it compiles.
- Production build (`build.ts`) scans `src/**/*.html` as entrypoints, uses `bun-plugin-tailwind`, sets `NODE_ENV=production`, outputs to `dist/`.
- CI (GitHub Pages deploy on push to `main`) only runs `bun i --frozen-lockfile` + `bun run build`. It does not run lint, typecheck, or tests — run `bun run check` locally before pushing.

## Testing

- Tests live in `packages/emlib/test/`. The playground app has no tests.
- Tests use `bun:test`: `import { expect, test } from "bun:test"`.
- Run all tests: `bun run test` (or `bun test`).
- Run a specific test file: `bun test packages/emlib/test/basic.test.ts`.
- `bun run check` includes tests; run it before opening a PR.

## D2 Diagrams

- The playground renders diagrams with `@terrastruct/d2`. The `emlib` library only exports `exprToD2()` to produce D2 source text; the rendering/rendering cache is handled in the playground app.
- Diagram rendering runs client-side (WASM). It may be slow on first load.

## emlib Internals

### Library is never compiled to JS

The `emlib` package's `exports` field maps all conditions to `./src/index.ts`. Bun imports TypeScript source directly in dev, and `Bun.build()` inlines everything during the production build. The library's `build` script (`tsgo -p tsconfig.json`) is type-only (`noEmit: true`).

### Two evaluation modes

- `evaluate(expr, env?)` — approximate floating-point complex arithmetic (`ApproxComplex` with `re`/`im` numbers).
- `evaluateLossless(expr, env?)` — exact rational/complex arithmetic (`bigint`-based) plus symbolic leftovers. Conservative: branch-sensitive identities (e.g. `ln(exp(i))`) stay symbolic instead of approximating.

### Caching strategy

- `WeakMap<Expr, ...>` for intra-expression memoization (tokens, variables, expr keys).
- `Map<string, ...>` capped at 4096 entries for inter-expression caches (lowering results). On overflow, the entire cache is cleared. Compression cache caps at 1024.

### Pattern matching hack

The rewrite system in `rewrite.ts` compiles `?x` template patterns by substituting `?x` → `_h0_`, parsing with the normal parser, then walking the AST to convert `_h0_` nodes back to `PatternHole` nodes. Don't try to duplicate the grammar for patterns.

### AST construction

All AST constructors (`num()`, `variable()`, `add()`, `sin()`, `eml()`, etc.) create plain object literals — no classes, no prototypes. Structural sharing uses `rewriteChildren(expr, fn)` which returns the same object reference if children are unchanged.

## Playground App

### Feature-slice layout

All playground UI lives under `src/features/eml-playground/`. Components (`playground-*.tsx`) are rendered by the corresponding hook (`use-playground-studio.ts` owns all state). The 4-page sections (hero, highlights, summary, playground) load lazily via `LazySection` + `IntersectionObserver`.

### D2 WASM lazy loading

`useD2Preview` uses `IntersectionObserver` with `280px` `rootMargin` — the `@terrastruct/d2` WASM module only loads when the preview panel is near the viewport. SVGs are sanitized (scripts, event handlers, unsafe hrefs stripped) and served as blob URLs.

### URL state sync

`usePlaygroundUrlSync` bidirectionally syncs playground state (expression, tabs, experiment settings) with URL query params via `history.replaceState`. Only non-default values appear in the URL.

### i18n

The default locale is `en-US` (falls back from `navigator.languages` → `eml.locale` in `localStorage`). Use `useI18n()` / `useMessages(selector)` hooks. Strings are templates (e.g. `{ detail }` parameters). The English source of truth is `src/i18n/locales/en-US.ts`.

### HMR pattern

The React entrypoint (`src/frontend.tsx`) uses Bun's `import.meta.hot` for HMR-preserving state: `(import.meta.hot.data.root ??= createRoot(elem)).render(app)`.

### CSS performance

All `<section>` elements use `content-visibility: auto` for offscreen rendering deferral. The dev server auto-applies Tailwind via `bunfig.toml` `[serve.static]` (no build step needed for CSS in dev).
