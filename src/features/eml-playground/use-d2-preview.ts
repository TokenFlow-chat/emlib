import type { D2 as D2Runtime } from "@terrastruct/d2";
import { useEffect, useRef, useState } from "react";

import type { DiagramMode, LayoutMode } from "./constants";
import { normalizeRenderedSvg } from "./utils";

let d2RuntimePromise: Promise<D2Runtime> | null = null;

async function loadD2Runtime() {
  if (!d2RuntimePromise) {
    d2RuntimePromise = import("@terrastruct/d2").then((module) => new module.D2());
  }

  return d2RuntimePromise;
}

export function usePreviewActivation<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    if (isActivated || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsActivated(true);
        observer.disconnect();
      },
      { rootMargin: "280px 0px" },
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isActivated]);

  return { ref, isActivated };
}

export function useD2Preview({
  active,
  canRender,
  d2Source,
  diagramMode,
  layoutMode,
}: {
  active: boolean;
  canRender: boolean;
  d2Source: string;
  diagramMode: DiagramMode;
  layoutMode: LayoutMode;
}) {
  const [svgMarkup, setSvgMarkup] = useState("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!active || !canRender) {
      setSvgMarkup("");
      setRenderError(null);
      setIsRendering(false);
      return;
    }

    let cancelled = false;
    setIsRendering(true);
    setRenderError(null);

    const renderSvg = async () => {
      try {
        const d2 = await loadD2Runtime();
        const compiled = await d2.compile(d2Source, {
          options: {
            layout: layoutMode,
            noXMLTag: true,
            pad: 28,
            themeID: 103,
          },
        });
        const svg = await d2.render(compiled.diagram, {
          ...compiled.renderOptions,
          center: true,
          noXMLTag: true,
          pad: 28,
          salt: `${diagramMode}-${layoutMode}`,
          themeID: 103,
        });
        const normalizedSvg = normalizeRenderedSvg(svg);

        if (!normalizedSvg) {
          throw new Error("D2 returned invalid SVG output");
        }

        if (cancelled) return;
        setSvgMarkup(normalizedSvg);
        setRenderError(null);
      } catch (error) {
        if (cancelled) return;

        setSvgMarkup("");
        setRenderError(
          error instanceof Error ? error.message : "D2 render failed",
        );
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    };

    void renderSvg();

    return () => {
      cancelled = true;
    };
  }, [active, canRender, d2Source, diagramMode, layoutMode]);

  return { svgMarkup, renderError, isRendering };
}
