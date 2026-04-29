import { useEffect, useRef, useState } from "react";
import { LuCheck, LuCopy } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { LoadingMark } from "@/components/ui/loading-mark";
import { Textarea } from "@/components/ui/textarea";
import { getTransformCopy } from "@/features/eml-playground/playground-i18n";
import { AsyncMessage, SegmentedTabs } from "@/features/eml-playground/playground-shared";
import type { PlaygroundStudioState } from "@/features/eml-playground/use-playground-studio";
import { useMessages } from "@/i18n";

export function PlaygroundPreviewPanel({ studio }: { studio: PlaygroundStudioState }) {
  const {
    diagramSource,
    setDiagramSource,
    layoutMode,
    previewActivation,
    diagramPayload,
    d2Preview,
    copyState,
    handleCopyD2,
    expressionViews,
  } = studio;
  const playground = useMessages((messages) => messages.playground);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    if (!d2Preview.svgUrl) {
      setIsImageLoading(false);
      return;
    }

    setIsImageLoading(true);
  }, [d2Preview.svgUrl]);

  useEffect(() => {
    if (!d2Preview.svgUrl || !imageRef.current?.complete) return;
    setIsImageLoading(false);
  }, [d2Preview.svgUrl]);

  const showPreviewViewport = d2Preview.isRendering || d2Preview.svgUrl;
  const showPreviewLoading = d2Preview.isRendering || isImageLoading;

  return (
    <div ref={previewActivation.ref} className="min-w-0 space-y-2.5 xl:sticky xl:top-5">
      <div className="diagram-shell overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--line)] px-3.5 py-3">
          <div>
            <div className="text-[0.625rem] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
              {playground.diagram.eyebrow}
            </div>
          </div>
          <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1 text-xs font-semibold text-[color:var(--ink-soft)]">
            {playground.diagram.layoutBadge({ layout: layoutMode })}
          </div>
        </div>

        <div className="border-b border-[color:var(--line)] px-3.5 py-2.5">
          <SegmentedTabs
            value={diagramSource}
            onChange={setDiagramSource}
            items={expressionViews.map((view) => ({
              value: view.key,
              label: getTransformCopy(playground, view.key).title,
              shortLabel: getTransformCopy(playground, view.key).shortLabel,
            }))}
          />
        </div>

        <div className="diagram-canvas px-3.5 py-3.5">
          {!previewActivation.isActivated && diagramPayload.canRender ? (
            <AsyncMessage>{playground.diagram.deferredHint}</AsyncMessage>
          ) : diagramPayload.reason ? (
            <AsyncMessage>{diagramPayload.reason}</AsyncMessage>
          ) : d2Preview.renderError ? (
            <AsyncMessage tone="warning">
              {playground.diagram.renderError({
                detail: d2Preview.renderError,
              })}
            </AsyncMessage>
          ) : showPreviewViewport ? (
            <div
              className={[
                "d2-viewport rounded-[0.9rem] border border-[color:var(--line)]",
                showPreviewLoading ? "d2-viewport-loading" : "",
              ].join(" ")}
            >
              {d2Preview.svgUrl ? (
                <img
                  ref={imageRef}
                  src={d2Preview.svgUrl}
                  alt={playground.diagram.previewAriaLabel({
                    mode: playground.diagram.eyebrow,
                  })}
                  className={[
                    "d2-preview-image transition-opacity duration-200",
                    showPreviewLoading ? "opacity-0" : "opacity-100",
                  ].join(" ")}
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => {
                    setIsImageLoading(false);
                    d2Preview.handleImageError();
                  }}
                />
              ) : null}
              {showPreviewLoading ? (
                <div className="d2-preview-overlay">
                  <LoadingMark />
                </div>
              ) : null}
              {d2Preview.isRendering ? (
                <div className="sr-only">{playground.diagram.loading}</div>
              ) : null}
            </div>
          ) : (
            <AsyncMessage>{playground.diagram.empty}</AsyncMessage>
          )}
        </div>
      </div>

      <div className="min-w-0 rounded-[1rem] border border-[color:var(--line)] bg-white/78 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
            {playground.d2Source.title}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-[color:var(--line)] bg-[color:var(--paper-strong)]"
            onClick={() => {
              void handleCopyD2();
            }}
          >
            {copyState === "copied" ? (
              <LuCheck className="size-4" />
            ) : (
              <LuCopy className="size-4" />
            )}
            {copyState === "copied"
              ? playground.d2Source.copySuccess
              : copyState === "failed"
                ? playground.d2Source.copyFailed
                : playground.d2Source.copyIdle}
          </Button>
        </div>
        <Textarea
          readOnly
          value={diagramPayload.d2Source}
          className="mt-2.5 h-12 min-h-0 rounded-[0.85rem] border-[color:var(--line)] bg-[color:var(--paper-strong)] font-mono text-xs leading-5"
        />
      </div>
    </div>
  );
}
