import { expect, test } from "bun:test";
import {
  countTotalNodes,
  countUniqueSubtrees,
  parse,
  reduceTypes,
  serializeExpr,
  serializeExprToJson,
} from "../src/index";

test("serializeExpr exports the protocol envelope and expression graph", () => {
  const graph = serializeExpr(parse("exp(x) - ln(y)"));

  expect(graph.protocol).toBe("emlib.expr.graph");
  expect(graph.version).toBe(1);
  expect(graph.rootId).toBe("n0");
  expect(graph.deduplicate).toBe("none");
  expect(graph.stats).toEqual({
    totalNodes: 5,
    uniqueSubtrees: 5,
    graphNodes: 5,
    graphLinks: 4,
    reusedNodes: 0,
    maxDepth: 2,
  });

  expect(graph.nodes.map((node) => [node.id, node.label, node.role])).toEqual([
    ["n0", "-", "operator"],
    ["n1", "exp", "operator"],
    ["n2", "x", "variable"],
    ["n3", "ln", "operator"],
    ["n4", "y", "variable"],
  ]);
  expect(graph.links.map((link) => [link.source, link.target, link.argument, link.label])).toEqual([
    ["n1", "n2", "value", undefined],
    ["n3", "n4", "value", undefined],
    ["n0", "n1", "left", "x"],
    ["n0", "n3", "right", "y"],
  ]);
});

test("serializeExpr exports pure EML as renderer-neutral JSON", () => {
  const graph = serializeExpr(reduceTypes(parse("ln(x)")), { deduplicate: "none" });

  expect(graph.nodes[0]).toMatchObject({
    id: "n0",
    label: "E",
    kind: "eml",
    role: "operator",
    arity: 2,
  });
  const rootLinks = graph.links.filter((link) => link.source === graph.rootId);
  expect(rootLinks[0]).toMatchObject({ argument: "left", label: "x" });
  expect(rootLinks[1]).toMatchObject({ argument: "right", label: "y" });
});

test("serializeExpr supports compound and all-node deduplication", () => {
  const expr = parse("(x + 1) * (x + 1)");
  const full = serializeExpr(expr);
  const compound = serializeExpr(expr, { deduplicate: "compound" });
  const all = serializeExpr(expr, { deduplicate: "all" });

  expect(full.stats.graphNodes).toBe(7);
  expect(full.stats.uniqueSubtrees).toBe(4);
  expect(compound.stats.graphNodes).toBe(4);
  expect(compound.stats.graphLinks).toBe(4);
  expect(compound.nodes.find((node) => node.label === "+")).toMatchObject({
    occurrenceCount: 2,
    repeated: true,
  });
  expect(all.stats.graphNodes).toBe(4);
  expect(all.nodes.find((node) => node.label === "x")).toMatchObject({
    occurrenceCount: 2,
    repeated: true,
  });
});

test("serializeExpr can share repeated leaves when deduplicate is all", () => {
  const graph = serializeExpr(parse("x + x"), { deduplicate: "all" });

  expect(graph.nodes.map((node) => node.label)).toEqual(["+", "x"]);
  expect(graph.links.map((link) => link.target)).toEqual(["n1", "n1"]);
  expect(graph.nodes[1]).toMatchObject({ occurrenceCount: 2, repeated: true });
});

test("serializeExpr supports custom ids and optional argument labels", () => {
  const graph = serializeExpr(parse("x - y"), {
    nodePrefix: "node_",
    linkPrefix: "link_",
    includeArgumentLabels: false,
  });

  expect(graph.rootId).toBe("node_0");
  expect(graph.nodes.map((node) => node.id)).toEqual(["node_0", "node_1", "node_2"]);
  expect(graph.links.map((link) => [link.id, link.label])).toEqual([
    ["link_0", undefined],
    ["link_1", undefined],
  ]);
});

test("serializeExprToJson emits stable JSON text", () => {
  const json = serializeExprToJson(parse("tan(x)"), { space: 0 });
  const parsed = JSON.parse(json) as ReturnType<typeof serializeExpr>;

  expect(parsed.protocol).toBe("emlib.expr.graph");
  expect(parsed.nodes.map((node) => node.label)).toEqual(["tan", "x"]);
});

test("subtree counters remain available as analysis helpers", () => {
  const expr = parse("(x + 1) * (x + 1)");

  expect(countTotalNodes(expr)).toBe(7);
  expect(countUniqueSubtrees(expr)).toBe(4);
});
