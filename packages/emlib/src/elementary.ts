import type { Expr } from "./ast";
import { add, div, exp, ln, mul, neg, num, pow, rewriteChildren, sqrt, sub, constant } from "./ast";

const ONE = num(1);
const TWO = num(2);
const HALF = num(0.5);
const I = constant("i");

function sinCore(z: Expr): Expr {
  const iz = mul(I, z);
  return div(sub(exp(iz), exp(neg(iz))), mul(TWO, I));
}

function cosCore(z: Expr): Expr {
  const iz = mul(I, z);
  return div(add(exp(iz), exp(neg(iz))), TWO);
}

function sinhCore(z: Expr): Expr {
  return div(sub(exp(z), exp(neg(z))), TWO);
}

function coshCore(z: Expr): Expr {
  return div(add(exp(z), exp(neg(z))), TWO);
}

function asinCore(z: Expr): Expr {
  return mul(I, ln(add(mul(neg(I), z), sqrt(sub(ONE, pow(z, TWO))))));
}

function acosCore(z: Expr): Expr {
  return mul(I, ln(add(z, mul(sqrt(sub(z, ONE)), sqrt(add(z, ONE))))));
}

function atanCore(z: Expr): Expr {
  return mul(div(neg(I), TWO), ln(div(add(z, neg(I)), sub(neg(I), z))));
}

function asinhCore(z: Expr): Expr {
  return ln(add(z, sqrt(add(pow(z, TWO), ONE))));
}

function acoshCore(z: Expr): Expr {
  return ln(add(z, mul(sqrt(add(z, ONE)), sqrt(sub(z, ONE)))));
}

function atanhCore(z: Expr): Expr {
  return mul(HALF, ln(div(add(ONE, z), sub(ONE, z))));
}

export function desugarElementary(expr: Expr): Expr {
  switch (expr.kind) {
    case "num":
    case "var":
    case "const":
      return expr;
    case "sin":
      return sinCore(desugarElementary(expr.value));
    case "cos":
      return cosCore(desugarElementary(expr.value));
    case "tan": {
      const z = desugarElementary(expr.value);
      return div(sinCore(z), cosCore(z));
    }
    case "cot": {
      const z = desugarElementary(expr.value);
      return div(cosCore(z), sinCore(z));
    }
    case "sec": {
      const z = desugarElementary(expr.value);
      return div(ONE, cosCore(z));
    }
    case "csc": {
      const z = desugarElementary(expr.value);
      return div(ONE, sinCore(z));
    }
    case "sinh":
      return sinhCore(desugarElementary(expr.value));
    case "cosh":
      return coshCore(desugarElementary(expr.value));
    case "tanh": {
      const z = desugarElementary(expr.value);
      return div(sinhCore(z), coshCore(z));
    }
    case "coth": {
      const z = desugarElementary(expr.value);
      return div(coshCore(z), sinhCore(z));
    }
    case "sech":
      return div(ONE, coshCore(desugarElementary(expr.value)));
    case "csch":
      return div(ONE, sinhCore(desugarElementary(expr.value)));
    case "asin":
      return asinCore(desugarElementary(expr.value));
    case "acos":
      return acosCore(desugarElementary(expr.value));
    case "atan":
      return atanCore(desugarElementary(expr.value));
    case "asec":
      return acosCore(div(ONE, desugarElementary(expr.value)));
    case "acsc":
      return asinCore(div(ONE, desugarElementary(expr.value)));
    case "acot":
      return atanCore(div(ONE, desugarElementary(expr.value)));
    case "asinh":
      return asinhCore(desugarElementary(expr.value));
    case "acosh":
      return acoshCore(desugarElementary(expr.value));
    case "atanh":
      return atanhCore(desugarElementary(expr.value));
    default:
      return rewriteChildren(expr, desugarElementary);
  }
}
