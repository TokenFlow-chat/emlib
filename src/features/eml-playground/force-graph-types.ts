import type { ForceGraph3DInstance } from "3d-force-graph";
import type { SerializedExprLink, SerializedExprNode } from "emlib";
import type { Object3D } from "three";

export type ForceGraphNode = SerializedExprNode & {
  name: string;
  val: number;
  color: string;
  x?: number;
  y?: number;
  z?: number;
  /** Set by three-forcegraph ThreeDigest at render time. */
  __threeObj?: Object3D;
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
