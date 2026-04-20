# emlib

A TypeScript library centered on three jobs:

1. reduce function kinds (`Type`) as far as possible
2. reduce total expression tokens (`Token`) as far as possible
3. evaluate with lossless big integers / rationals / complex rationals when possible, and fall back to approximate numeric evaluation when needed

The core operator is:

$$
\mathrm{eml}(x, y) = \exp(x) - \ln(y)
$$

## Main APIs

- `parse(expr)` parses a standard elementary expression AST
- `reduceTypes(expr)` lowers toward the EML core, favoring fewer kinds even if the tree gets larger
- `reduceTokens(expr)` searches for a shorter equivalent expression, allowing mixed vocabularies including `eml`
- `analyzeExpr(expr)` reports `tokenCount`, `typeCount`, and the type set
- `evaluateLossless(expr, env?)` performs exact arithmetic for integers, rationals, and complex rationals; transcendental leftovers stay symbolic
- `evaluate(expr, env?)` performs approximate complex evaluation
- `exprToD2(expr)` exports a D2 expression tree using three visual node categories: function, variable, and constant

Compatibility exports are still present:

- `toPureEml(expr)` is an alias of `reduceTypes(expr)`
- `simplifyToElementary(expr)` currently delegates to `reduceTokens(expr)`

## Supported expression family

- arithmetic: `+ - * / ^`
- constants: numeric literals, `e`, `pi`, `i`
- transcendental core: `exp`, `ln`, `sqrt`
- trigonometric: `sin`, `cos`, `tan`, `cot`, `sec`, `csc`
- hyperbolic: `sinh`, `cosh`, `tanh`, `coth`, `sech`, `csch`
- inverse families: `asin`, `acos`, `atan`, `asec`, `acsc`, `acot`, `asinh`, `acosh`, `atanh`

## Examples

```ts
import {
  analyzeExpr,
  evaluate,
  evaluateLossless,
  parse,
  reduceTokens,
  reduceTypes,
  toString,
  valueToExpr,
} from './src/index';

const expr = parse('exp(x) - ln(y)');

console.log(analyzeExpr(expr));
// { tokenCount: 5, typeCount: 3, types: ['exp', 'ln', 'sub'] }

console.log(toString(reduceTypes(expr)));
// pure EML form with only eml(...) and numeric leaves

console.log(toString(reduceTokens(expr)));
// eml(x, y)

console.log(exprToD2(expr));
// D2 source with function / variable / constant node classes

console.log(exprToD2(reduceTypes(parse('ln(x)'))));
// reduced trees use the same generic D2 visualization

console.log(toString(valueToExpr(evaluateLossless(parse('(1+2*i)/(3-4*i)')))));
// -1 / 5 + 2 / 5 * i

console.log(evaluate(parse('sin(1/3)')));
// approximate complex value
```

## Install

```bash
bun install
bun test
```

## Notes

- `reduceTypes` is the “fewer kinds” direction; it is intentionally willing to expand token count.
- `reduceTokens` is the “shorter expression” direction; it can choose `eml(...)` or standard functions depending on which prints shorter.
- `evaluateLossless` is exact on algebraic-rational arithmetic. For transcendentals like `sin(1/3)`, it preserves the symbolic value instead of silently rounding.
