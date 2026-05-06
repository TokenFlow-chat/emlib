import type { ForceGraph3DInstance, ConfigOptions } from "3d-force-graph";
import type { SerializedExprGraph, SerializedExprLink, SerializedExprNode } from "emlib";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial, type Object3D } from "three";

import type { LayoutMode } from "./constants";

type ForceGraphModule = typeof import("3d-force-graph");

type ForceGraphNode = SerializedExprNode & {
  name: string;
  val: number;
  color: string;
  x?: number;
  y?: number;
  z?: number;
};

type ForceGraphLink = Omit<SerializedExprLink, "source" | "target"> & {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  name: string;
  color: string;
  width: number;
  curvature: number;
  particles: number;
  particleSpeed: number;
};

type ForceGraphData = {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
};

type ExpressionGraphInstance = ForceGraph3DInstance<ForceGraphNode, ForceGraphLink>;

type ForceSettings = {
  distance?: (value: unknown) => unknown;
  strength?: (value: unknown) => unknown;
};

let forceGraphModulePromise: Promise<ForceGraphModule> | null = null;

function loadForceGraphRuntime() {
  if (!forceGraphModulePromise) {
    forceGraphModulePromise = import("3d-force-graph");
  }

  return forceGraphModulePromise;
}

export function usePreviewActivation<T extends Element>() {
  const [node, setNode] = useState<T | null>(null);
  const [isActivated, setIsActivated] = useState(false);
  const ref = useCallback((nextNode: T | null) => {
    setNode(nextNode);
  }, []);

  useEffect(() => {
    if (isActivated || !node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsActivated(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isActivated, node]);

  return { ref, isActivated };
}

function baseNodeColor(node: SerializedExprNode): string {
  switch (node.role) {
    case "operator":
      return "#2f7d8c";
    case "variable":
      return "#b9783b";
    case "constant":
      return "#a84f6a";
    default:
      return "#52616b";
  }
}

function linkColor(link: SerializedExprLink): string {
  switch (link.argument) {
    case "left":
      return "#2d63c8";
    case "right":
      return "#c44f82";
    case "value":
      return "#3f8f76";
    default:
      return "#7f9492";
  }
}

function linkWidth(link: SerializedExprLink): number {
  return link.argument === "value" ? 1.05 : 1.75;
}

function linkCurvature(link: SerializedExprLink): number {
  if (link.argument === "left") return -0.16;
  if (link.argument === "right") return 0.16;
  return 0.0;
}

function linkParticles(link: SerializedExprLink): number {
  return link.argument === "value" ? 1 : 2;
}

function linkParticleSpeed(link: SerializedExprLink): number {
  return link.argument === "value" ? 0.0035 : 0.0065;
}

function nodeTooltip(node: SerializedExprNode): string {
  return [
    `${node.label} (${node.kind})`,
    `role: ${node.role}`,
    `depth: ${node.depth}`,
    `occurrences: ${node.occurrenceCount}`,
  ].join("\n");
}

function linkTooltip(link: Pick<SerializedExprLink, "argument" | "label" | "parentKind">): string {
  return link.label
    ? `${link.parentKind} ${link.argument}: ${link.label}`
    : `${link.parentKind} ${link.argument}`;
}

function toForceGraphData(graph: SerializedExprGraph): ForceGraphData {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      name: nodeTooltip(node),
      val: node.role === "operator" ? 3 + node.arity : 2 + (node.repeated ? 0.9 : 0),
      color: baseNodeColor(node),
    })),
    links: graph.links.map((link) => ({
      ...link,
      source: link.source,
      target: link.target,
      name: linkTooltip(link),
      color: linkColor(link),
      width: linkWidth(link),
      curvature: linkCurvature(link),
      particles: linkParticles(link),
      particleSpeed: linkParticleSpeed(link),
    })),
  };
}

const MAX_LABEL_TEXTURE_CACHE = 256;
const labelTextureCache = new Map<string, CanvasTexture>();

function createTextSprite(node: ForceGraphNode): Object3D {
  const text = node.label.length > 16 ? `${node.label.slice(0, 15)}...` : node.label;
  const cacheKey = `${text};`;
  let texture = labelTextureCache.get(cacheKey);

  if (!texture) {
    if (labelTextureCache.size >= MAX_LABEL_TEXTURE_CACHE) {
      for (const [key, tex] of labelTextureCache) {
        tex.dispose();
        labelTextureCache.delete(key);
        break;
      }
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return new Sprite();
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const fontSize = 30;
    const horizontalPadding = 14;
    const verticalPadding = 8;

    context.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const metrics = context.measureText(text);
    const width = Math.ceil(metrics.width + horizontalPadding * 2);
    const height = fontSize + verticalPadding * 2;
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);

    context.scale(ratio, ratio);
    context.font = `500 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.fillText(text, horizontalPadding, height / 2 + 1);

    texture = new CanvasTexture(canvas);
    texture.minFilter = LinearFilter;
    texture.needsUpdate = true;
    labelTextureCache.set(cacheKey, texture);
  }

  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  }) as SpriteMaterial & { depthTest: boolean };
  material.depthTest = false;
  const sprite = new Sprite(material) as Sprite & { renderOrder: number; raycast: () => void };
  sprite.renderOrder = 1;
  sprite.raycast = () => {};
  const image = texture.image as HTMLCanvasElement;
  const scale = node.role === "operator" ? 10 : 8.6;
  sprite.scale.set((image.width / image.height) * scale, scale, 1);
  sprite.position.y = 0;
  return sprite;
}

function setDagMode(instance: ExpressionGraphInstance, layoutMode: LayoutMode) {
  const setMode = instance.dagMode as unknown as (mode: string | null) => ExpressionGraphInstance;

  if (layoutMode === "radial") {
    setMode("radialout");
    instance.dagLevelDistance(44);
    return;
  }

  if (layoutMode === "layered") {
    setMode("td");
    instance.dagLevelDistance(38);
    return;
  }

  setMode(null);
}

function configureForces(instance: ExpressionGraphInstance, layoutMode: LayoutMode) {
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

function focusNode(instance: ExpressionGraphInstance, node: ForceGraphNode) {
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

export function useForceGraphPreview({
  active,
  canRender,
  graph,
  layoutMode,
  showLabels,
  onSelectNode,
}: {
  active: boolean;
  canRender: boolean;
  graph: SerializedExprGraph | null;
  layoutMode: LayoutMode;
  showLabels: boolean;
  onSelectNode: (nodeId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<ExpressionGraphInstance | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const prevLayoutModeRef = useRef<LayoutMode | null>(null);
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const graphData = useMemo(() => (graph ? toForceGraphData(graph) : null), [graph]);

  const setGraphContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerNode(node);
  }, []);

  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
  }, [onSelectNode]);

  useEffect(() => {
    if (!active || !canRender || !containerNode) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    setRenderError(null);

    const init = async () => {
      try {
        const module = await loadForceGraphRuntime();
        if (cancelled || !containerRef.current) return;

        const config: ConfigOptions = {
          controlType: "trackball",
          rendererConfig: {
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          },
        };
        const ForceGraph3D = module.default as unknown as new (
          element: HTMLElement,
          configOptions?: ConfigOptions,
        ) => ExpressionGraphInstance;
        const instance = new ForceGraph3D(containerRef.current, config);
        instanceRef.current = instance;

        instance
          .backgroundColor("rgba(255,255,255,0)")
          .showNavInfo(false)
          .nodeId("id")
          .linkSource("source")
          .linkTarget("target")
          .nodeRelSize(4.6)
          .nodeOpacity(0.96)
          .nodeResolution(18)
          .nodeLabel(nodeTooltip)
          .nodeColor((node) => node.color)
          .nodeVal((node) => node.val)
          .nodeThreeObject(() => new Sprite())
          .nodeThreeObjectExtend(true)
          .linkLabel(linkTooltip)
          .linkColor((link) => link.color)
          .linkWidth((link) => link.width)
          .linkOpacity(0.54)
          .linkResolution(8)
          .linkCurvature((link) => link.curvature)
          .linkDirectionalArrowLength((link) => (link.argument === "value" ? 3.2 : 5))
          .linkDirectionalArrowColor((link) => link.color)
          .linkDirectionalArrowRelPos(0.94)
          .linkDirectionalArrowResolution(8)
          .linkDirectionalParticles((link) => link.particles)
          .linkDirectionalParticleSpeed((link) => link.particleSpeed)
          .linkDirectionalParticleWidth((link) => (link.argument === "value" ? 0.85 : 1.45))
          .linkDirectionalParticleColor((link) => link.color)
          .forceEngine("d3")
          .numDimensions(3)
          .enableNodeDrag(true)
          .onNodeClick((node) => {
            onSelectNodeRef.current(String(node.id ?? ""));
            focusNode(instance, node);
          })
          .onBackgroundClick(() => {
            onSelectNodeRef.current(null);
          });

        instance.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const applySize = () => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          instance.width(Math.max(320, Math.floor(rect.width)));
          instance.height(Math.max(260, Math.floor(rect.height)));
        };

        applySize();
        resizeObserver = new ResizeObserver(applySize);
        resizeObserver.observe(containerRef.current);
        prevLayoutModeRef.current = null;
        setIsReady(true);
      } catch (error) {
        if (cancelled) return;
        setRenderError(error instanceof Error ? error.message : String(error));
        setIsRendering(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      const inst = instanceRef.current;
      instanceRef.current = null;
      inst?._destructor();
      setIsReady(false);
    };
  }, [active, canRender, containerNode]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !isReady || !active || !canRender || !graphData) return;

    setRenderError(null);
    setIsRendering(true);

    const layoutChanged = prevLayoutModeRef.current !== layoutMode;
    if (layoutChanged || prevLayoutModeRef.current === null) {
      setDagMode(instance, layoutMode);
      configureForces(instance, layoutMode);
    }
    prevLayoutModeRef.current = layoutMode;

    instance
      .onEngineStop(() => {
        instance.zoomToFit(720, 54);
        setIsRendering(false);
      })
      .warmupTicks(layoutMode === "free" ? 24 : 32)
      .cooldownTicks(layoutMode === "free" ? 80 : 110)
      .cooldownTime(2400)
      .graphData(graphData)
      .d3ReheatSimulation();
  }, [active, canRender, graphData, isReady, layoutMode]);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !isReady) return;

    instance.nodeThreeObject(showLabels ? createTextSprite : () => new Sprite()).refresh();
  }, [isReady, showLabels]);

  const resetCamera = useCallback(() => {
    instanceRef.current?.zoomToFit(720, 54);
  }, []);

  return {
    ref: setGraphContainerRef,
    renderError,
    isRendering,
    isReady,
    resetCamera,
  };
}
