# EML Deep Dive: One Operator to Rule Them All

> TL;DR: Some mathematician proved that `exp(x) - ln(y)` plus the constant `1` is enough to build every button on your TI-84. This doc explains why that matters, how the discovery actually happened (spoiler: brute force), and what it looks like when you turn it into working TypeScript.

---

## 1. The Punchline

You know NAND, right? One gate. Feed it into itself enough times and you get AND, OR, NOT, XOR, adders, CPUs, the whole stack.

Andrzej Odrzywolek asked: _does continuous mathematics have a NAND?_

Turns out, yes. It's this weird little binary operator:

```
eml(x, y) = exp(x) - ln(y)
```

With nothing but `1` and repeated applications of `eml`, you can recover:

- `+ - * / ^`
- `exp`, `ln`, `sqrt`
- `sin`, `cos`, `tan`, and their inverses
- `sinh`, `cosh`, `tanh`, and their inverses
- Constants: `e`, `π`, `i`, integers, rationals

Every expression collapses to a single grammar:

```
S → 1 | eml(S, S)
```

That's it. No `sin` node. No `mul` node. Just identical `eml` nodes stacked into a binary tree. Like a circuit built from nothing but NAND gates.

---

## 2. Why This Isn't Obvious

People have known forever that `exp` and `ln` are powerful. Euler figured out that `e^(iθ) = cos θ + i sin θ` in 1748. Liouville and Ritt built entire theories of integration around the exp-log class.

But here's the thing: **reducing a set to two primitives is not the same as reducing to one.**

We knew `+` and `×` could be expressed through `exp/ln`:

```
x × y = e^(ln x + ln y)
x + y = ln(e^x × e^y)
```

We knew trig functions could be expressed through complex exponentials. But nobody had compressed the _entire_ scientific calculator down to a **single binary operator** plus a constant.

The paper's real contribution isn't any one identity. It's that the _endpoint_ of reduction actually exists. The operator `eml` was found by exhaustive search, not derived from theory. The author started with 36 primitives (Table 1), peeled them off one by one, and kept checking if the remainder could still reconstruct the full set. When the set stalled at `{1, eml}`, he knew he'd hit the floor.

This is not a proof paper. It's a **computational discovery** paper with constructive verification.

---

## 3. How the Search Actually Worked

The author didn't sit down with a pen and derive `eml`. He wrote a search engine.

### The Ablation Game

Start with 36 buttons. Remove one. Can the remaining 35 still express everything? If yes, the removed button was redundant. Repeat.

This produced a countdown (Table 2):

| System  | Primitives                 | Count |
| ------- | -------------------------- | ----- |
| Base-36 | Full calculator            | 36    |
| Wolfram | `π,e,i`, `ln`, `+,×,^`     | 7     |
| Calc 3  | `exp,ln,-x,1/x,+`          | 6     |
| Calc 2  | `exp,ln,-`                 | 4     |
| Calc 1  | `e` or `π`, `x^y, log_x y` | 4     |
| Calc 0  | `exp`, `log_x y`           | 3     |
| **EML** | **`1`, `eml(x,y)`**        | **3** |

The crucial pattern: every minimal system contains **a pair of inverse functions** and **a non-commutative operation**.

- `exp`/`ln` are inverses. Subtraction is non-commutative.
- `eml` fuses both properties into one node.

### The Numerical Bootstrap Trick

Direct symbolic verification is intractable (Kolmogorov complexity ~7-9 for typical formulas). So the author cheated, brilliantly:

1. Pick algebraically independent transcendental constants, e.g. `γ` (Euler-Mascheroni) and `A` (Glaisher-Kinkelin).
2. Evaluate the target numerically at these points.
3. Enumerate all candidate EML expressions up to some depth.
4. If a candidate matches numerically, run an inverse symbolic calculator on it.
5. Independently verify the candidate later (symbolic + cross-platform numerical checks).

Under Schanuel's conjecture, coincidental equality between such expressions is essentially impossible. So the numerical sieve is reliable.

**This is the engineering mindset:** don't wait for a closed-form proof. Build a fast filter, then verify survivors.

---

## 4. The Engineering Reality

Reading the paper is one thing. Turning it into a library is another. Here's how we did it in `packages/emlib`.

### 4.1 Two ASTs, Not One

We maintain two expression languages:

- **Standard AST**: `num`, `var`, `const`, `add`, `sub`, `mul`, `div`, `pow`, `neg`, `exp`, `ln`, `sqrt`, `sin`, `cos`, ... (the full 23+ unary + 6 binary family)
- **Pure EML AST**: `num`, `var`, `const`, `eml`

Every standard expression can be lowered to pure EML. Every pure EML tree can (sometimes) be lifted back to a readable standard expression.

This isn't gratuitous abstraction. The two representations serve completely different purposes:

- Standard AST is for **humans** (parsing, printing, simplifying).
- Pure EML is for **search** (uniform tree shape means uniform search space).

### 4.2 Lowering: Standard → Pure EML

The `lower.ts` module implements the compilation pipeline. It's essentially a term-rewriting system with memoization.

Key insight: `reduceTypes(expr)` doesn't just transliterate. It actively **chooses the shortest representation** among multiple EML encodings for the same mathematical object.

For example, negation has two witnesses:

```
// Short witness from the paper (15 tokens)
-x = E(E(1,E(1,E(1,E(E(1,1),1)))), E(x,1))

// Generic witness via definition (more tokens)
-x = E(E(1,E(E(E(1,E(E(1,E(1,x)),1)),E(1,E(E(1,E(E(...
```

The library stores both and picks the shorter one via `chooseShortest`. Same for multiplication, division, etc.

This is where engineering diverges from pure math. The paper proves existence. The library has to care about **token count** because it determines whether the search space is tractable.

### 4.3 Lifting: Pure EML → Standard

This is the hard direction. Lowering is deterministic. Lifting is a search problem.

The `rewrite.ts` module implements a **cost-driven rewrite engine**:

1. **Pattern matching**: Template rules like `exp(ln(?x)+ln(?y)) → ?x*?y`
2. **Greedy normalization**: Apply local rewrites until fixed point
3. **Beam search**: When greedy gets stuck, explore neighbors and keep the best `tokenScore`
4. **Exact folding**: Evaluate constant subexpressions losslessly (rational + complex arithmetic)

The scoring function is deliberately simple:

```typescript
tokenScore(expr) = tokenCount(expr) + 0.05 * typeCount(expr);
```

Fewer tokens = better. Fewer distinct operators = better. This biases the search toward human-readable forms.

### 4.4 Pattern Matching: The Hack We Keep

The rewrite engine's templates are written as strings like `"?x+?y"`. Our parser doesn't natively understand `?x`, so `compilePattern` does a string replacement:

```typescript
"?x+?y" → "__h0__+__h0__" → parse() → walk AST → convert vars back to holes
```

Is this elegant? No. Is it correct, maintainable, and preserves the readability of template definitions? Yes.

The "purist" alternative is a separate pattern parser. We considered it. The cost is either:

- Duplicating the entire expression grammar for patterns, or
- Making the main parser aware of holes, which then leaks into `lower.ts` (where `reduceTypes` doesn't know what to do with holes)

In a system where templates are written by humans and read far more often than they're compiled, **string templates win**. The `_hN_` prefix is an implementation detail hidden inside `compilePattern`. It never escapes the pattern module.

### 4.5 Synthesis: Searching the EML Space

The `synth.ts` module implements the paper's core idea: **if every formula is a binary tree of identical nodes, you can search the space structurally.**

`synthesizePureEml(target, options)`:

1. Evaluates the target expression at sample points.
2. Builds EML trees bottom-up (leaves = `1` and variables).
3. Uses a **semantic fingerprint** (`fingerprint(values)`) to deduplicate equivalent trees without parsing.
4. Keeps a **beam frontier** per tree size, pruning by MSE and token count.
5. Stops when a tree matches the target within tolerance.

This is a direct implementation of the numerical bootstrap described in the paper. The difference is that our library does it in TypeScript with complex-number evaluation, not Mathematica.

---

## 5. The Things Nobody Tells You

### 5.1 EML Is Not Shorter

Do not use EML because it's compact. It isn't.

| Function | Standard Form | EML Tokens |
| -------- | ------------- | ---------- |
| `exp(x)` | 3             | 3          |
| `ln(x)`  | 3             | 7          |
| `-x`     | 2             | 15         |
| `x*y`    | 3             | 17-25      |
| `1/2`    | 3             | 29-39      |
| `π`      | 1             | >53        |

EML's value is **structural uniformity**, not brevity. A heterogeneous grammar (`sin`, `+`, `^`, `log`) has dozens of node types. EML has one. That uniformity makes search, circuit mapping, and hardware compilation tractable in ways that "just use exp and ln" never could.

### 5.2 Complex Numbers Are Not Optional

To get `i`, you need `ln(-1)`. To get `sin(x)`, you need Euler's formula. EML operates internally over `ℂ`, even when the final answer is real.

This has teeth:

- **Branch cuts**: `ln(z)` on the negative real axis jumps by `2πi`. The paper discusses this extensively because it breaks naive implementations.
- **`ln(0) = -∞`**: Required for some witnesses to work. Lean 4 assigns `Complex.log 0 = 0` (a junk value), which breaks the EML chain entirely.
- **IEEE 754**: Works fine because `inf` and signed zeros are first-class. Pure Python fails because it traps on `log(0)`.

Our evaluator handles complex numbers natively. If you try to evaluate a pure EML tree that branches through `ln(-1)`, it just works—provided you accept the principal branch.

### 5.3 The "Constant-Free Sheffer" Is Still Open

NAND can generate `0` and `1` from any input: `NAND(x, NAND(x, x)) = 1`. EML cannot do this. You _must_ have the distinguished constant `1` (or `e`, or `-∞`) in your terminal set.

The paper explicitly leaves this as an open problem. A ternary operator has been found that requires no constant, but the binary case remains unresolved.

---

## 6. What This Enables

### Symbolic Regression with a Fixed Architecture

Modern symbolic regression struggles with grammar selection:

- Do you include `sin`? What if the true law is `sinh`?
- Do you include `exp`? What if it's `x^2.3`?
- Every missing operator is a blind spot.

EML removes the question entirely. The search space is **complete by construction**: any elementary function is in there somewhere. The master formula is just a parameterized binary tree:

```
F(x) = eml(α1 + β1*x + γ1*eml(...), α2 + β2*x + γ2*eml(...))
```

Train the `α, β, γ` weights with Adam. If they snap to `{0,1}`, you've recovered an exact closed form. The paper reports 100% success at depth 2, ~25% at depths 3-4, <1% at depth 5.

The optimization landscape is hard. But it exists.

### Single-Instruction Machines

An EML expression is just a sequence of RPN instructions on a stack machine. Every instruction is the same opcode. This is:

- Trivial to implement in hardware (FPGA, analog circuits)
- Trivial to JIT-compile
- Trivial to serialize

The paper's Table 3 draws the analogy explicitly: NAND gate → Op-Amp → Transistor → EML Sheffer.

### Interpretability

When a neural network finds a pattern, you get weights. When an EML tree converges, you get a formula you can read, differentiate, and verify. The author calls this "legibility as elementary function expressions."

---

## 7. Reading the Paper (If You Bother)

Skip the proofs on first read. Go in this order:

1. **Abstract + Summary paragraph** (pages 1-2): establishes the NAND analogy.
2. **Table 2** (page 8): the reduction countdown. This is the whole story.
3. **Section 4.3** (pages 12-14): the symbolic regression experiments. This is where the operator stops being a curiosity and starts being useful.
4. **Figure 2** (page 22): concrete EML trees for `ln(x)`, `-x`, `1/x`, `x*y`. Stare at these until they make sense.
5. **Everything else**: details, edge cases, branch discussions.

Do not read it as a theorem paper. Read it as a **systems paper** about a weird CPU instruction set that happens to be Turing-complete for continuous math.

---

## 8. The Codebase

This repo (`packages/emlib`) is a clean-slate implementation of the paper's ideas in TypeScript. It's not a port of the author's Mathematica/Rust toolkits. It's designed for:

- **Embedding**: Small enough to bundle into a web app.
- **Hacking**: No build system black magic. Just `bun test`.
- **Extension**: The pattern-matching and search infrastructure is generic. Add new rewrite rules by writing strings.

Current status:

- ✅ Parser / printer for standard expressions
- ✅ Complex evaluator (IEEE 754-ish, with `inf`/`nan`)
- ✅ Exact rational arithmetic (`1/3 + 1/6 = 1/2`, not `0.5000001`)
- ✅ Full lowering of 23 unary + 6 binary operators to pure EML
- ✅ Lifting / simplification via pattern matching + beam search
- ✅ Synthesis of pure EML witnesses from numerical samples
- ✅ Optional compression (search for shorter equivalent EML trees)
- ✅ Gradient-based master formula training with Adam (`master.ts` + `train.ts`)

Not implemented (yet):

- Branch-cut aware rewriting
- Full SI witness database import

---

## 9. The Bottom Line

Mathematics doesn't usually work like this. We don't discover new primitives by brute-force search. We prove theorems.

But sometimes the theorem _is_ the search. EML wasn't derived. It was found, numerically sifted, and then verified after the fact. The fact that it works—that a single operator `exp(x) - ln(y)` is enough—is a statement about the structure of elementary functions that no one anticipated.

If you're building anything that searches over formulas, this matters. Not because EML is shorter. Because EML is **one**. And one is a much better number than thirty-six.

---

_Paper: Andrzej Odrzywolek, "All elementary functions from a single operator", arXiv:2603.21852v2_
_Code: `packages/emlib/` in this repo_
