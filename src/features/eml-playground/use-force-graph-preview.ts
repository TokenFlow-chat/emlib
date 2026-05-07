import type { ConfigOptions } from "3d-force-graph";
import type { SerializedExprGraph } from "emlib";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mesh, Sprite } from "three";

import type { LayoutMode } from "./constants";
import { toForceGraphData } from "./force-graph-data";
import { loadForceGraphRuntime } from "./force-graph-runtime";
import { clearNodeHighlight, highlightSelectedNode } from "./force-graph-selection";
import type { ExpressionGraphInstance, ForceGraphNode } from "./force-graph-types";
import { getCreateTextSprite } from "./force-graph-labels";
import { configureForces, setDagMode } from "./force-graph-layout";

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

const INSTANCE_CONFIG: ConfigOptions = {
  controlType: "trackball",
  rendererConfig: {
    antialias: true,
    alpha: true,
    powerPreference: "default",
  },
};

const DAMPING_NORMAL = 0.05;
const DAMPING_INERTIAL = 0;

type DampingControls = { dynamicDampingFactor: number };

function isRootNode(n: ForceGraphNode): boolean {
  return n.depth === 0 && Number.isFinite(n.x);
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
  const controlsRef = useRef<DampingControls | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const prevLayoutModeRef = useRef<LayoutMode | null>(null);
  const selectedNodeIdRef = useRef<string | null>(null);
  const selectedRingRef = useRef<Mesh | null>(null);
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

  const selectNode = useCallback((inst: ExpressionGraphInstance, nodeId: string) => {
    const prevId = selectedNodeIdRef.current;
    if (prevId && prevId !== nodeId) {
      clearNodeHighlight(inst, prevId);
    }
    selectedNodeIdRef.current = nodeId;
    onSelectNodeRef.current(nodeId);
    selectedRingRef.current = highlightSelectedNode(inst, nodeId);
  }, []);

  const deselectNode = useCallback((inst: ExpressionGraphInstance) => {
    const prevId = selectedNodeIdRef.current;
    if (prevId) {
      clearNodeHighlight(inst, prevId);
    }
    selectedNodeIdRef.current = null;
    selectedRingRef.current = null;
    onSelectNodeRef.current(null);
  }, []);

  // === init instance ===

  useEffect(() => {
    if (!active || !canRender || !containerNode) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    setRenderError(null);

    const init = async () => {
      try {
        const module = await loadForceGraphRuntime();
        if (cancelled || !containerRef.current) return;

        const ForceGraph3D = module.default as unknown as new (
          element: HTMLElement,
          configOptions?: ConfigOptions,
        ) => ExpressionGraphInstance;
        const instance = new ForceGraph3D(containerRef.current, INSTANCE_CONFIG);
        instanceRef.current = instance;

        instance
          .backgroundColor("rgba(255,255,255,0)")
          .showNavInfo(false)
          .nodeId("id")
          .linkSource("source")
          .linkTarget("target")
          .nodeRelSize(4.6)
          .nodeOpacity(0.96)
          .nodeResolution(32)
          .nodeLabel((node) => node.name)
          .nodeColor((node) => node.color)
          .nodeVal((node) => node.val)
          .nodeThreeObject(() => new Sprite())
          .nodeThreeObjectExtend(true)
          .linkLabel((link) => link.name)
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
            selectNode(instance, String(node.id ?? ""));
          })
          .onBackgroundClick(() => {
            deselectNode(instance);
          });

        instance.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const controls = instance.controls() as DampingControls;
        controls.dynamicDampingFactor = DAMPING_NORMAL;
        controlsRef.current = controls;

        const applySize = () => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          instance.width(Math.max(320, Math.floor(rect.width)));
          instance.height(Math.max(260, Math.floor(rect.height)));
        };

        applySize();
        resizeObserver = new ResizeObserver(applySize);
        resizeObserver.observe(containerRef.current);

        containerRef.current.addEventListener("pointerenter", () => {
          if (controlsRef.current) controlsRef.current.dynamicDampingFactor = DAMPING_NORMAL;
        });
        containerRef.current.addEventListener("pointerleave", () => {
          if (controlsRef.current) controlsRef.current.dynamicDampingFactor = DAMPING_INERTIAL;
        });

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
      controlsRef.current = null;
      setIsReady(false);
    };
  }, [active, canRender, containerNode, selectNode, deselectNode]);

  // === graph data ===

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
        instance.zoomToFit(300, 0);
        setIsRendering(false);
      })
      .warmupTicks(layoutMode === "free" ? 24 : 32)
      .cooldownTicks(layoutMode === "free" ? 80 : 110)
      .cooldownTime(2400)
      .graphData(graphData);
  }, [active, canRender, graphData, isReady, layoutMode]);

  // === labels ===

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !isReady) return;

    if (showLabels) {
      getCreateTextSprite().then((createTextSprite) => {
        if (instanceRef.current) {
          instanceRef.current.nodeThreeObject(createTextSprite).refresh();
        }
      });
    } else {
      instance.nodeThreeObject(() => new Sprite()).refresh();
    }
  }, [isReady, showLabels]);

  // === ring spin ===

  useEffect(() => {
    let rafId = 0;

    const step = () => {
      rafId = requestAnimationFrame(step);
      selectedRingRef.current?.rotateX(0.03);
    };

    rafId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafId);
  }, [isReady]);

  // === actions ===

  const resetCamera = useCallback(() => {
    instanceRef.current?.zoomToFit(500, 0);
  }, []);

  const focusRootNode = useCallback(() => {
    const inst = instanceRef.current;
    if (!inst) return;

    const nodes = inst.graphData().nodes;
    const rootNode = nodes.find(isRootNode);
    if (!rootNode) return;

    selectNode(inst, String(rootNode.id ?? ""));
  }, [selectNode]);

  return {
    ref: setGraphContainerRef,
    renderError,
    isRendering,
    isReady,
    resetCamera,
    focusRootNode,
  };
}
