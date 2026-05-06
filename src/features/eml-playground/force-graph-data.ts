import type { SerializedExprGraph, SerializedExprLink, SerializedExprNode } from "emlib";

import { LINK_COLORS, NODE_COLORS } from "./force-graph-colors";
import type { ForceGraphData, ForceGraphNode, ForceGraphLink } from "./force-graph-types";

export function baseNodeColor(node: SerializedExprNode): string {
  switch (node.role) {
    case "operator":
      return NODE_COLORS.operator;
    case "variable":
      return NODE_COLORS.variable;
    case "constant":
      return NODE_COLORS.constant;
    default:
      return NODE_COLORS.other;
  }
}

export function linkColor(link: SerializedExprLink): string {
  switch (link.argument) {
    case "left":
      return LINK_COLORS.left;
    case "right":
      return LINK_COLORS.right;
    case "value":
      return LINK_COLORS.value;
    default:
      return LINK_COLORS.other;
  }
}

export function linkWidth(link: SerializedExprLink): number {
  return link.argument === "value" ? 1.05 : 1.75;
}

export function linkCurvature(link: SerializedExprLink): number {
  if (link.argument === "left") return -0.16;
  if (link.argument === "right") return 0.16;
  return 0.0;
}

export function linkParticles(link: SerializedExprLink): number {
  return link.argument === "value" ? 1 : 2;
}

export function linkParticleSpeed(link: SerializedExprLink): number {
  return link.argument === "value" ? 0.0035 : 0.0065;
}

export function nodeTooltip(node: SerializedExprNode): string {
  return [
    `${node.label} (${node.kind})`,
    `role: ${node.role}`,
    `depth: ${node.depth}`,
    `occurrences: ${node.occurrenceCount}`,
  ].join("\n");
}

export function linkTooltip(
  link: Pick<SerializedExprLink, "argument" | "label" | "parentKind">,
): string {
  return link.label
    ? `${link.parentKind} ${link.argument}: ${link.label}`
    : `${link.parentKind} ${link.argument}`;
}

export function toForceGraphData(graph: SerializedExprGraph): ForceGraphData {
  return {
    nodes: graph.nodes.map(
      (node): ForceGraphNode => ({
        ...node,
        name: nodeTooltip(node),
        val: node.role === "operator" ? 3 + node.arity : 2 + (node.repeated ? 0.9 : 0),
        color: baseNodeColor(node),
      }),
    ),
    links: graph.links.map(
      (link): ForceGraphLink => ({
        ...link,
        source: link.source,
        target: link.target,
        name: linkTooltip(link),
        color: linkColor(link),
        width: linkWidth(link),
        curvature: linkCurvature(link),
        particles: linkParticles(link),
        particleSpeed: linkParticleSpeed(link),
      }),
    ),
  };
}
