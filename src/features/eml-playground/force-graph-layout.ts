import type { LayoutMode } from "./constants";
import type {
  ExpressionGraphInstance,
  ForceGraphLink,
  ForceGraphNode,
  ForceSettings,
} from "./force-graph-types";

export function setDagMode(instance: ExpressionGraphInstance, layoutMode: LayoutMode) {
  const setMode = instance.dagMode as unknown as (mode: string | null) => ExpressionGraphInstance;

  if (layoutMode === "td") {
    setMode("td");
    instance.dagLevelDistance(38);
    return;
  }

  if (layoutMode === "lr") {
    setMode("lr");
    instance.dagLevelDistance(38);
    return;
  }

  if (layoutMode === "radial") {
    setMode("radialout");
    instance.dagLevelDistance(44);
    return;
  }

  setMode(null);
}

export function configureForces(instance: ExpressionGraphInstance, layoutMode: LayoutMode) {
  const linkForce = instance.d3Force("link") as ForceSettings | undefined;
  linkForce?.distance?.((link: ForceGraphLink) => {
    if (layoutMode === "free") return link.label ? 54 : 42;
    return link.label ? 46 : 34;
  });
  linkForce?.strength?.((link: ForceGraphLink) => (link.label ? 0.72 : 0.48));

  const chargeForce = instance.d3Force("charge") as ForceSettings | undefined;
  chargeForce?.strength?.((node: ForceGraphNode) => {
    if (layoutMode === "free") return node.repeated ? -190 : -130;
    return node.repeated ? -145 : -96;
  });

  instance.d3VelocityDecay(0.32);
  instance.d3AlphaDecay(0.028);
}
