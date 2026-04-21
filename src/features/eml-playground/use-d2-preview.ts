import type { D2 as D2Runtime } from "@terrastruct/d2";
import { useEffect, useRef, useState } from "react";

import type { DiagramMode, LayoutMode } from "./constants";
import { buildSvgDataUrl, normalizeRenderedSvg } from "./utils";

let d2RuntimePromise: Promise<D2Runtime> | null = null;
const OBJECT_URL_REVOKE_DELAY_MS = 30_000;

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
  const [svgUrl, setSvgUrl] = useState("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const revokeTimersRef = useRef<Map<string, number>>(new Map());

  const clearScheduledRevoke = (url: string) => {
    const timer = revokeTimersRef.current.get(url);
    if (timer === undefined) return;
    window.clearTimeout(timer);
    revokeTimersRef.current.delete(url);
  };

  const revokeObjectUrlNow = (url: string | null) => {
    if (!url || !url.startsWith("blob:")) return;
    clearScheduledRevoke(url);
    URL.revokeObjectURL(url);
    if (objectUrlRef.current === url) {
      objectUrlRef.current = null;
    }
  };

  const scheduleObjectUrlRevoke = (url: string | null) => {
    if (!url || !url.startsWith("blob:")) return;
    clearScheduledRevoke(url);
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      revokeTimersRef.current.delete(url);
      if (objectUrlRef.current === url) {
        objectUrlRef.current = null;
      }
    }, OBJECT_URL_REVOKE_DELAY_MS);
    revokeTimersRef.current.set(url, timer);
  };

  useEffect(() => {
    return () => {
      revokeTimersRef.current.forEach((timer) => window.clearTimeout(timer)); // oxlint-disable-line
      revokeTimersRef.current.clear(); // oxlint-disable-line
      revokeObjectUrlNow(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const clearPreview = () => {
      setSvgMarkup("");
      setSvgUrl("");
      scheduleObjectUrlRevoke(objectUrlRef.current);
    };

    if (!active || !canRender) {
      clearPreview();
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
        scheduleObjectUrlRevoke(objectUrlRef.current);

        let nextUrl = "";
        try {
          const blob = new Blob([normalizedSvg], {
            type: "image/svg+xml;charset=utf-8",
          });
          nextUrl = URL.createObjectURL(blob);
          clearScheduledRevoke(nextUrl);
          objectUrlRef.current = nextUrl;
        } catch {
          nextUrl = buildSvgDataUrl(normalizedSvg);
        }

        setSvgMarkup(normalizedSvg);
        setSvgUrl(nextUrl);
        setRenderError(null);
      } catch (error) {
        if (cancelled) return;

        clearPreview();
        setRenderError(error instanceof Error ? error.message : String(error));
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

  const handleImageError = () => {
    if (svgMarkup && svgUrl.startsWith("blob:")) {
      revokeObjectUrlNow(svgUrl);
      setSvgUrl(buildSvgDataUrl(svgMarkup));
      return;
    }

    revokeObjectUrlNow(objectUrlRef.current);
    setSvgUrl("");
    setRenderError("SVG preview could not be loaded");
  };

  return { svgMarkup, svgUrl, renderError, isRendering, handleImageError };
}
