type ForceGraphModule = typeof import("3d-force-graph");

let modulePromise: Promise<ForceGraphModule> | null = null;

export function loadForceGraphRuntime(): Promise<ForceGraphModule> {
  if (!modulePromise) {
    modulePromise = import("3d-force-graph");
  }
  return modulePromise;
}
