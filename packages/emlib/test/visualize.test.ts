import { expect, test } from "bun:test";
import {
  add,
  analyzeExpr,
  countTotalNodes,
  countUniqueSubtrees,
  exprToD2,
  mul,
  num,
  parse,
  reduceTypes,
  sin,
  toPureEml,
  toString,
  variable,
} from "../src/index";

const EXPECTED_TAN_EXPR_D2 = `n0: {
  label: "tan"
  class: function
}
n1: {
  label: "x"
  class: variable
}

n0 -> n1`;

const EXPECTED_LN_PURE_EML_DEDUP_ALL_D2 = `n0: {
  label: "E"
  class: function
}
n1: {
  label: "1"
  class: constant
}
n2: {
  label: "E"
  class: function
}
n3: {
  label: "E"
  class: function
}
n4: {
  label: "x"
  class: variable
}

n3 -> n1: "x"
n3 -> n4: "y"
n2 -> n3: "x"
n2 -> n1: "y"
n0 -> n1: "x"
n0 -> n2: "y"`;

const EXPECTED_LN_PURE_EML_DEDUP_COMPOUND_D2 = `n0: {
  label: "E"
  class: function
}
n1: {
  label: "1"
  class: constant
}
n2: {
  label: "E"
  class: function
}
n3: {
  label: "E"
  class: function
}
n4: {
  label: "1"
  class: constant
}
n5: {
  label: "x"
  class: variable
}
n6: {
  label: "1"
  class: constant
}

n3 -> n4: "x"
n3 -> n5: "y"
n2 -> n3: "x"
n2 -> n6: "y"
n0 -> n1: "x"
n0 -> n2: "y"`;

const EXPECTED_LN_PURE_EML_DEDUP_NONE_D2 = `n0: {
  label: "E"
  class: function
}
n1: {
  label: "1"
  class: constant
}
n2: {
  label: "E"
  class: function
}
n3: {
  label: "E"
  class: function
}
n4: {
  label: "1"
  class: constant
}
n5: {
  label: "x"
  class: variable
}
n6: {
  label: "1"
  class: constant
}

n3 -> n4: "x"
n3 -> n5: "y"
n2 -> n3: "x"
n2 -> n6: "y"
n0 -> n1: "x"
n0 -> n2: "y"`;

const EXPECTED_TAN_PURE_EML_COUNTS = {
  totalNodes: 773,
  emlNodes: 386,
  xLeaves: 4,
  oneLeaves: 383,
};

function countPureEmlTree(expr: ReturnType<typeof toPureEml>) {
  let totalNodes = 0;
  let emlNodes = 0;
  let xLeaves = 0;
  let oneLeaves = 0;

  const walk = (node: typeof expr) => {
    totalNodes += 1;
    switch (node.kind) {
      case "eml":
        emlNodes += 1;
        walk(node.left);
        walk(node.right);
        return;
      case "var":
        if (node.name === "x") xLeaves += 1;
        return;
      case "num":
        if (node.value === 1) oneLeaves += 1;
        return;
      default:
        throw new Error(`Expected a pure EML tree, got ${node.kind}`);
    }
  };

  walk(expr);
  return { totalNodes, emlNodes, xLeaves, oneLeaves };
}

function countNodes(d2: string): number {
  return (d2.match(/: \{/g) || []).length;
}

test("fixture: tan(x) lowers to a stable compact pure eml tree", () => {
  const pure = toPureEml(parse("tan(x)"));
  expect(toString(pure).startsWith("E(")).toBe(true);
  expect(toString(pure)).toContain("x");
  expect(analyzeExpr(pure).tokenCount).toBe(EXPECTED_TAN_PURE_EML_COUNTS.totalNodes);
});

test("fixture: tan(x) pure eml tree has the built-in node counts", () => {
  expect(countPureEmlTree(toPureEml(parse("tan(x)")))).toEqual(EXPECTED_TAN_PURE_EML_COUNTS);
});

test("exprToD2 exports the shared three-class visualization", () => {
  const d2 = exprToD2(parse("exp(x) - ln(y)"));
  expect(d2).toContain('label: "-"');
  expect(d2).toContain('label: "exp"');
  expect(d2).toContain('label: "ln"');
  expect(d2).toContain('label: "x"');
  expect(d2).toContain('label: "y"');
  expect(d2).toContain("class: function");
  expect(d2).toContain("class: variable");
});

test("fixture: tan(x) exports to the built-in d2 expression tree", () => {
  expect(exprToD2(parse("tan(x)"))).toBe(EXPECTED_TAN_EXPR_D2);
});

test("default: deduplicate is 'none' (no sharing)", () => {
  expect(exprToD2(reduceTypes(parse("ln(x)")))).toBe(EXPECTED_LN_PURE_EML_DEDUP_NONE_D2);
});

test("deduplicate: 'all' shares all nodes including leaves", () => {
  expect(exprToD2(reduceTypes(parse("ln(x)")), { deduplicate: "all" })).toBe(
    EXPECTED_LN_PURE_EML_DEDUP_ALL_D2,
  );
});

test("deduplicate: 'compound' shares only compound subtrees (leaves separate)", () => {
  expect(exprToD2(reduceTypes(parse("ln(x)")), { deduplicate: "compound" })).toBe(
    EXPECTED_LN_PURE_EML_DEDUP_COMPOUND_D2,
  );
});

test("deduplicate: 'none' produces full tree without any sharing", () => {
  expect(exprToD2(reduceTypes(parse("ln(x)")), { deduplicate: "none" })).toBe(
    EXPECTED_LN_PURE_EML_DEDUP_NONE_D2,
  );
});

test("deduplicate: true (boolean) equals 'compound' mode", () => {
  expect(exprToD2(reduceTypes(parse("ln(x)")), { deduplicate: true })).toBe(
    EXPECTED_LN_PURE_EML_DEDUP_COMPOUND_D2,
  );
});

test("deduplicate: false (boolean) equals 'none' mode", () => {
  expect(exprToD2(reduceTypes(parse("ln(x)")), { deduplicate: false })).toBe(
    EXPECTED_LN_PURE_EML_DEDUP_NONE_D2,
  );
});

test("deduplicate: 'compound' shares compound subtrees but not leaves", () => {
  const x2a = mul(variable("x"), variable("x"));
  const x2b = mul(variable("x"), variable("x"));
  const expr = add(x2a, x2b);
  const d2 = exprToD2(expr, { deduplicate: "compound" });

  expect(countNodes(d2)).toBe(4);
  expect(d2).toContain('label: "+"');
  expect(d2).toContain('label: "*');
});

test("deduplicate: 'all' shares everything including leaf nodes", () => {
  const x2a = mul(variable("x"), variable("x"));
  const x2b = mul(variable("x"), variable("x"));
  const expr = add(x2a, x2b);
  const d2 = exprToD2(expr, { deduplicate: "all" });

  expect(countNodes(d2)).toBe(3);
  expect(d2).toContain('label: "+"');
  expect(d2).toContain('label: "*');
  expect(d2).toContain('label: "x"');
});

test("deduplicate: 'none' produces full tree", () => {
  const x2a = mul(variable("x"), variable("x"));
  const x2b = mul(variable("x"), variable("x"));
  const expr = add(x2a, x2b);
  const d2 = exprToD2(expr, { deduplicate: "none" });

  expect(countNodes(d2)).toBe(7);
});

test("deduplicate: 'all' shares repeated leaf constants", () => {
  const expr = add(num("1"), num("1"));
  const d2 = exprToD2(expr, { deduplicate: "all" });

  expect(countNodes(d2)).toBe(2);
  expect(d2).toContain('label: "+"');
  const oneCount = (d2.match(/label: "1"/g) || []).length;
  expect(oneCount).toBe(1);
});

test("deduplicate: 'compound' does not share leaf constants", () => {
  const expr = add(num("1"), num("1"));
  const d2 = exprToD2(expr, { deduplicate: "compound" });

  expect(countNodes(d2)).toBe(3);
  const oneCount = (d2.match(/label: "1"/g) || []).length;
  expect(oneCount).toBe(2);
});

test("commutative binary ops (add, mul) omit edge labels", () => {
  const d2 = exprToD2(parse("x + y"));
  // Edge lines should not have labels
  expect(d2).not.toMatch(/>.*: "x"/);
  expect(d2).not.toMatch(/>.*: "y"/);
  const edges = d2.split("\n").filter((l) => l.includes("->"));
  expect(edges.every((l) => !l.includes(":"))).toBe(true);
});

test("non-commutative binary ops (sub, div, pow) show edge labels by default", () => {
  const d2 = exprToD2(parse("x - y"));
  expect(d2).toMatch(/>.*: "x"/);
  expect(d2).toMatch(/>.*: "y"/);
});

test("unary ops always omit edge labels", () => {
  const d2 = exprToD2(parse("sin(x)"));
  const edges = d2.split("\n").filter((l) => l.includes("->"));
  expect(edges.every((l) => !l.includes(":"))).toBe(true);
});

test("edgeLabels=false hides labels on non-commutative ops too", () => {
  const d2 = exprToD2(parse("x - y"), { edgeLabels: false });
  const edges = d2.split("\n").filter((l) => l.includes("->"));
  expect(edges.every((l) => !l.includes(":"))).toBe(true);
});

test("exprToD2 with custom nodePrefix", () => {
  const d2 = exprToD2(parse("tan(x)"), { nodePrefix: "node_" });
  expect(d2).toContain("node_0");
  expect(d2).toContain("node_1");
  expect(d2).not.toContain("n0");
});

test("countUniqueSubtrees returns correct count", () => {
  const x = variable("x");
  const x2a = mul(x, x);
  const x2b = mul(x, x);
  const expr = add(x2a, x2b);

  expect(countUniqueSubtrees(expr)).toBe(3);
  expect(countTotalNodes(expr)).toBe(7);
});

test("countUniqueSubtrees for simple expression", () => {
  const expr = sin(variable("x"));
  expect(countUniqueSubtrees(expr)).toBe(2);
  expect(countTotalNodes(expr)).toBe(2);
});

test("countUniqueSubtrees for deeply nested with repetition", () => {
  const one = num("1");
  const expr = add(add(one, one), add(one, one));

  expect(countUniqueSubtrees(expr)).toBe(3);
  expect(countTotalNodes(expr)).toBe(7);
});

test("deduplicate: 'all' on sin(x) * sin(x) yields 3 nodes", () => {
  const expr = mul(sin(variable("x")), sin(variable("x")));
  const d2 = exprToD2(expr, { deduplicate: "all" });

  expect(countNodes(d2)).toBe(3);
});

test("deduplicate: 'compound' on sin(x) * sin(x) yields 3 nodes", () => {
  const expr = mul(sin(variable("x")), sin(variable("x")));
  const d2 = exprToD2(expr, { deduplicate: "compound" });

  expect(countNodes(d2)).toBe(3);
});

test("countTotalNodes for complex expression", () => {
  const x = variable("x");
  const expr = add(mul(x, x), mul(x, x));
  expect(countTotalNodes(expr)).toBe(7);
});
