import type { ForceGraphNode } from "./force-graph-types";

type LabelModule = typeof import("./force-graph-labels-impl");

let labelModulePromise: Promise<LabelModule> | null = null;

export function loadLabelModule() {
  if (!labelModulePromise) {
    labelModulePromise = import("./force-graph-labels-impl");
  }
  return labelModulePromise;
}

let cachedModule: LabelModule | null = null;

export async function getCreateTextSprite() {
  if (cachedModule) return cachedModule.createTextSprite;
  const mod = await import("./force-graph-labels-impl");
  cachedModule = mod;
  return mod.createTextSprite;
}

export type { ForceGraphNode };
