import type { Expr } from "./ast";
import {
  acos,
  acosh,
  acot,
  acsc,
  add,
  asec,
  asin,
  asinh,
  atan,
  atanh,
  constant,
  cos,
  cosh,
  cot,
  csc,
  div,
  eml,
  exp,
  ln,
  mul,
  neg,
  num,
  pow,
  sec,
  sin,
  sinh,
  sqrt,
  sub,
  tan,
  tanh,
  variable,
  sech,
  csch,
  coth,
} from "./ast";

const unaryFunctions = {
  exp,
  ln,
  sqrt,
  sin,
  cos,
  tan,
  cot,
  sec,
  csc,
  sinh,
  cosh,
  tanh,
  coth,
  sech,
  csch,
  asin,
  acos,
  atan,
  asec,
  acsc,
  acot,
  asinh,
  acosh,
  atanh,
} satisfies Record<string, (value: Expr) => Expr>;

type Token =
  | { kind: "num"; value: string }
  | { kind: "id"; value: string }
  | { kind: "op"; value: string }
  | { kind: "eof"; value: "" };

class Lexer {
  private i = 0;
  constructor(private readonly input: string) {}

  next(): Token {
    while (this.i < this.input.length && /\s/.test(this.input[this.i] ?? "")) this.i += 1;
    if (this.i >= this.input.length) return { kind: "eof", value: "" };
    const ch = this.input[this.i] ?? "";
    if (/[0-9.]/.test(ch)) {
      const start = this.i;
      this.i += 1;
      while (this.i < this.input.length && /[0-9._]/.test(this.input[this.i] ?? "")) this.i += 1;
      return { kind: "num", value: this.input.slice(start, this.i).replaceAll("_", "") };
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = this.i;
      this.i += 1;
      while (this.i < this.input.length && /[A-Za-z0-9_]/.test(this.input[this.i] ?? ""))
        this.i += 1;
      return { kind: "id", value: this.input.slice(start, this.i) };
    }
    this.i += 1;
    return { kind: "op", value: ch };
  }
}

export function parse(input: string): Expr {
  const lexer = new Lexer(input);
  let tok: Token = lexer.next();

  const eat = (kind?: Token["kind"], value?: string): Token => {
    if ((kind && tok.kind !== kind) || (value && tok.value !== value)) {
      throw new Error(`Unexpected token ${tok.kind}:${tok.value}`);
    }
    const out = tok;
    tok = lexer.next();
    return out;
  };

  const parseExpr = (): Expr => parseAddSub();

  const parseAddSub = (): Expr => {
    let left = parseMulDiv();
    while (tok.kind === "op" && (tok.value === "+" || tok.value === "-")) {
      const op = tok.value;
      eat("op", op);
      const right = parseMulDiv();
      left = op === "+" ? add(left, right) : sub(left, right);
    }
    return left;
  };

  const parseMulDiv = (): Expr => {
    let left = parsePow();
    while (tok.kind === "op" && (tok.value === "*" || tok.value === "/")) {
      const op = tok.value;
      eat("op", op);
      const right = parsePow();
      left = op === "*" ? mul(left, right) : div(left, right);
    }
    return left;
  };

  const parsePow = (): Expr => {
    let left = parseUnary();
    if (tok.kind === "op" && tok.value === "^") {
      eat("op", "^");
      left = pow(left, parsePow());
    }
    return left;
  };

  const parseUnary = (): Expr => {
    if (tok.kind === "op" && tok.value === "-") {
      eat("op", "-");
      return neg(parseUnary());
    }
    return parsePrimary();
  };

  const parsePrimary = (): Expr => {
    if (tok.kind === "num") {
      return num(eat("num").value);
    }
    if (tok.kind === "id") {
      const nameTok = eat("id");
      const name = nameTok.value;
      if ((tok as Token).kind === "op" && tok.value === "(") {
        eat("op", "(");
        const a = parseExpr();
        if (name === "eml" || name === "E") {
          eat("op", ",");
          const b = parseExpr();
          eat("op", ")");
          return eml(a, b);
        }
        eat("op", ")");
        const fn = unaryFunctions[name as keyof typeof unaryFunctions];
        if (fn) {
          return fn(a);
        }
        throw new Error(`Unsupported function ${name}`);
      }
      if (name === "e" || name === "pi" || name === "i") return constant(name);
      return variable(name);
    }
    if (tok.kind === "op" && tok.value === "(") {
      eat("op", "(");
      const e = parseExpr();
      eat("op", ")");
      return e;
    }
    throw new Error(`Unexpected token ${tok.kind}:${tok.value}`);
  };

  const result = parseExpr();
  if (tok.kind !== "eof") throw new Error(`Unexpected trailing token ${tok.kind}:${tok.value}`);
  return result;
}
