import type { Vector3 } from "three";

import type { ExpressionGraphInstance, ForceGraphNode } from "./force-graph-types";

export function focusNode(instance: ExpressionGraphInstance, node: ForceGraphNode) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const z = node.z ?? 0;
  if (![x, y, z].every(Number.isFinite)) return;

  const distance = 40;
  const distRatio = 1 + distance / (Math.hypot(x, y, z) || 1);

  instance.cameraPosition(
    { x: x * distRatio, y: y * distRatio, z: z * distRatio },
    { x, y, z },
    800,
  );
}

export function seedInertiaRotation(instance: ExpressionGraphInstance) {
  const controls = instance.controls() as { _lastAngle: number; _lastAxis: Vector3 };
  if (controls._lastAngle === 0) {
    controls._lastAngle = -0.005;
    controls._lastAxis.set(0, 1, 0);
  }
}
