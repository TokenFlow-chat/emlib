import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  LuCheck,
  LuCopy,
  LuEye,
  LuEyeOff,
  LuFocus,
  LuMaximize2,
  LuMinimize2,
} from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { LoadingMark } from "@/components/ui/loading-mark";
import { Textarea } from "@/components/ui/textarea";
import { getTransformCopy } from "@/features/eml-playground/playground-i18n";
import { AsyncMessage, SegmentedTabs } from "@/features/eml-playground/playground-shared";
import type { PlaygroundStudioState } from "@/features/eml-playground/use-playground-studio";
import { useMessages } from "@/i18n";

function useStableGraphRoot() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  if (!rootRef.current) {
    rootRef.current = document.createElement("div");
  }
  return rootRef.current;
}

export function PlaygroundPreviewPanel({ studio }: { studio: PlaygroundStudioState }) {
  const {
    diagramSource,
    setDiagramSource,
    layoutMode,
    previewActivation,
    diagramPayload,
    graphPreview,
    selectedGraphNode,
    showLabels,
    setShowLabels,
    copyState,
    handleCopyGraphJson,
    expressionViews,
  } = studio;
  const playground = useMessages((messages) => messages.playground);
  const graphStats = diagramPayload.graph?.stats ?? null;
  const showPreviewLoading = graphPreview.isRendering || !graphPreview.isReady;
  const [isExpanded, setIsExpanded] = useState(false);

  const graphRoot = useStableGraphRoot();
  const inPageSlotRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const collapse = useCallback(() => setIsExpanded(false), []);

  useEffect(() => {
    if (diagramPayload.graph) return;
    setIsExpanded(false);
  }, [diagramPayload.graph]);

  useLayoutEffect(() => {
    const slot = inPageSlotRef.current;
    const dialog = dialogRef.current;
    if (!slot || !dialog) return;

    if (isExpanded) {
      if (graphRoot.parentElement === dialog) return;
      if (graphRoot.parentElement === slot) {
        dialog.appendChild(graphRoot);
      }

      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    } else {
      if (graphRoot.parentElement === dialog) {
        dialog.close();
        slot.appendChild(graphRoot);
      } else if (!graphRoot.parentElement) {
        slot.appendChild(graphRoot);
      }
    }
  });

  useEffect(() => {
    if (!isExpanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  const renderGraphViewport = () => (
    <div
      className={["force-graph-viewport", isExpanded ? "force-graph-viewport-expanded" : ""].join(
        " ",
      )}
    >
      <div
        ref={graphPreview.ref}
        className="force-graph-canvas"
        aria-label={playground.diagram.previewAriaLabel({
          mode: playground.diagram.eyebrow,
        })}
      />
      {showPreviewLoading ? (
        <div className="force-graph-preview-overlay">
          <LoadingMark />
        </div>
      ) : null}
      <div className="force-graph-toolbar">
        <div className="force-graph-toolbar-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-full border-[color:var(--line)] bg-white/82 px-2 text-[0.72rem]"
            onClick={() => setIsExpanded((current) => !current)}
            aria-label={
              isExpanded ? playground.diagram.collapseButton : playground.diagram.expandButton
            }
          >
            {isExpanded ? <LuMinimize2 className="size-3.5" /> : <LuMaximize2 className="size-3.5" />}
            {isExpanded ? playground.diagram.collapseButton : playground.diagram.expandButton}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-full border-[color:var(--line)] bg-white/82 px-2 text-[0.72rem]"
            onClick={graphPreview.resetCamera}
          >
            <LuFocus className="size-3.5" />
            {playground.diagram.fitButton}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-full border-[color:var(--line)] bg-white/82 px-2 text-[0.72rem]"
            onClick={() => setShowLabels((v) => !v)}
          >
            {showLabels ? <LuEye className="size-3.5" /> : <LuEyeOff className="size-3.5" />}
            {showLabels ? playground.diagram.labelsOn : playground.diagram.labelsOff}
          </Button>
        </div>
        <div className="force-graph-toolbar-stats">
          {graphStats ? (
            <>
              <span>{playground.diagram.stats.nodes({ value: graphStats.graphNodes })}</span>
              <span>{playground.diagram.stats.links({ value: graphStats.graphLinks })}</span>
              <span>{playground.diagram.stats.depth({ value: graphStats.maxDepth })}</span>
            </>
          ) : null}
        </div>
      </div>
      {selectedGraphNode ? (
        <div className="force-graph-node-panel">
          <div className="text-[0.68rem] font-semibold tracking-[0.15em] text-[color:var(--ink-soft)] uppercase">
            {playground.diagram.selectedNodeTitle}
          </div>
          <div className="mt-1 truncate font-mono text-sm font-semibold text-[color:var(--ink)]">
            {selectedGraphNode.label}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.72rem] text-[color:var(--ink-soft)]">
            <span>{playground.diagram.nodeFields.kind}</span>
            <span className="truncate text-right">{selectedGraphNode.kind}</span>
            <span>{playground.diagram.nodeFields.depth}</span>
            <span className="text-right">{selectedGraphNode.depth}</span>
            <span>{playground.diagram.nodeFields.occurrences}</span>
            <span className="text-right">{selectedGraphNode.occurrenceCount}</span>
          </div>
        </div>
      ) : (
        <div className="force-graph-legend">
          {playground.diagram.nodeLegend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className={`force-graph-legend-dot ${item.tone}`} />
              {item.label}
            </span>
          ))}
          <span className="force-graph-legend-divider" />
          {playground.diagram.edgeLegend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className={`force-graph-legend-edge ${item.tone}`} />
              {item.label}
            </span>
          ))}
        </div>
      )}
      {graphPreview.isRendering ? (
        <div className="sr-only">{playground.diagram.loading}</div>
      ) : null}
    </div>
  );

  return (
    <>
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

          <div className="diagram-canvas">
            {!previewActivation.isActivated && diagramPayload.canRender ? (
              <div className="p-3.5">
                <AsyncMessage>{playground.diagram.deferredHint}</AsyncMessage>
              </div>
            ) : diagramPayload.reason ? (
              <div className="p-3.5">
                <AsyncMessage>{diagramPayload.reason}</AsyncMessage>
              </div>
            ) : graphPreview.renderError ? (
              <div className="p-3.5">
                <AsyncMessage tone="warning">
                  {playground.diagram.renderError({
                    detail: graphPreview.renderError,
                  })}
                </AsyncMessage>
              </div>
            ) : diagramPayload.graph ? (
              <div ref={inPageSlotRef} className="force-graph-expand-slot" />
            ) : (
              <div className="p-3.5">
                <AsyncMessage>{playground.diagram.empty}</AsyncMessage>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-[1rem] border border-[color:var(--line)] bg-white/78 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
              {playground.graphJson.title}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-[color:var(--line)] bg-[color:var(--paper-strong)]"
              onClick={() => {
                void handleCopyGraphJson();
              }}
            >
              {copyState === "copied" ? (
                <LuCheck className="size-4" />
              ) : (
                <LuCopy className="size-4" />
              )}
              {copyState === "copied"
                ? playground.graphJson.copySuccess
                : copyState === "failed"
                  ? playground.graphJson.copyFailed
                  : playground.graphJson.copyIdle}
            </Button>
          </div>
          <Textarea
            readOnly
            value={diagramPayload.jsonSource}
            className="mt-2.5 h-20 min-h-0 rounded-[0.85rem] border-[color:var(--line)] bg-[color:var(--paper-strong)] font-mono text-xs leading-5"
          />
        </div>
      </div>

      <dialog ref={dialogRef} className="force-graph-dialog" onCancel={collapse} onClose={collapse}>
        {/* graphRoot is appended here imperatively when expanded */}
      </dialog>

      {createPortal(renderGraphViewport(), graphRoot)}
    </>
  );
}
