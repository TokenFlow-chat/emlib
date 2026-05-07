import { Mesh, MeshLambertMaterial, TorusGeometry } from "three";

import type { ExpressionGraphInstance, ForceGraphNode } from "./force-graph-types";

const HIGHLIGHT_MARKER = "__selected_ring__";

export function highlightSelectedNode(
  instance: ExpressionGraphInstance,
  nodeId: string,
): Mesh | null {
  const node = findNode(instance, nodeId);
  if (!node?.__threeObj) return null;

  clearNodeHighlight(instance, nodeId);

  const nodeVal = typeof node.val === "number" ? node.val : 2;
  const radius = Math.cbrt(nodeVal) * 4.6;
  const geo = new TorusGeometry(radius * 1.35, radius * 0.18, 16, 48);
  const mat = new MeshLambertMaterial({
    color: 0xf0c040,
    transparent: true,
    opacity: 0.85,
  });
  const ring = new Mesh(geo, mat);
  ring.name = HIGHLIGHT_MARKER;
  ring.rotation.z = Math.PI / 2;
  node.__threeObj.add(ring);
  return ring;
}

export function clearNodeHighlight(instance: ExpressionGraphInstance, nodeId: string): void {
  const node = findNode(instance, nodeId);
  if (!node?.__threeObj) return;

  const ring = node.__threeObj.getObjectByName(HIGHLIGHT_MARKER) as Mesh | undefined;
  if (!ring) return;

  node.__threeObj.remove(ring);
  ring.geometry?.dispose();
  const mat = ring.material;
  if (Array.isArray(mat)) {
    for (const m of mat) m.dispose();
  } else {
    mat?.dispose();
  }
}

function findNode(instance: ExpressionGraphInstance, nodeId: string): ForceGraphNode | undefined {
  return instance.graphData().nodes.find((n) => String(n.id) === nodeId);
}
