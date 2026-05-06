import type { ConfigOptions } from "3d-force-graph";
import type { SerializedExprGraph } from "emlib";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sprite } from "three";

import type { LayoutMode } from "./constants";
import { focusNode, seedInertiaRotation } from "./force-graph-camera";
import { toForceGraphData } from "./force-graph-data";
import type { ExpressionGraphInstance } from "./force-graph-types";
import { getCreateTextSprite } from "./force-graph-labels";
import { configureForces, setDagMode } from "./force-graph-layout";

type ForceGraphModule = typeof import("3d-force-graph");

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
  const hasInitialRotationRef = useRef(false);
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
            onSelectNodeRef.current(String(node.id ?? ""));
            focusNode(instance, node);
          })
          .onBackgroundClick(() => {
            onSelectNodeRef.current(null);
          });

        instance.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const controls = instance.controls() as { dynamicDampingFactor: number };
        controls.dynamicDampingFactor = 0;
        hasInitialRotationRef.current = false;

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
        instance.zoomToFit(500, 0);
        setIsRendering(false);

        if (!hasInitialRotationRef.current) {
          seedInertiaRotation(instance);
          hasInitialRotationRef.current = true;
        }
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
