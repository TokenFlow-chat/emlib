import type { ForceGraph3DInstance } from "3d-force-graph";
import type { SerializedExprLink, SerializedExprNode } from "emlib";

export type ForceGraphNode = SerializedExprNode & {
  name: string;
  val: number;
  color: string;
  x?: number;
  y?: number;
  z?: number;
};

export type ForceGraphLink = Omit<SerializedExprLink, "source" | "target"> & {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  name: string;
  color: string;
  width: number;
  curvature: number;
  particles: number;
  particleSpeed: number;
};

export type ForceGraphData = {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
};

export type ExpressionGraphInstance = ForceGraph3DInstance<ForceGraphNode, ForceGraphLink>;

export type ForceSettings = {
  distance?: (value: unknown) => unknown;
  strength?: (value: unknown) => unknown;
};
