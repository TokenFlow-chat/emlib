import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from "react";

import { LazyLoadErrorBoundary } from "@/components/lazy-load-error-boundary";
import { InfoTip } from "@/components/ui/info-tip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaygroundPreviewPanel } from "@/features/eml-playground/playground-preview-panel";
import {
  PlaygroundTabFallback,
  PlaygroundTabLoadError,
  SegmentedTabs,
} from "@/features/eml-playground/playground-shared";
import {
  usePlaygroundStudio,
  type PlaygroundStudioState,
  type WorkspaceTab,
} from "@/features/eml-playground/use-playground-studio";
import { useMessages } from "@/i18n";

type PlaygroundTabLoader = () => Promise<{
  default: ComponentType<{ studio: PlaygroundStudioState }>;
}>;

const tabLoaders: Record<WorkspaceTab, PlaygroundTabLoader> = {
  analyze: () => import("@/features/eml-playground/playground-analyze-tab"),
  compare: () => import("@/features/eml-playground/playground-compare-tab"),
  experiments: () => import("@/features/eml-playground/playground-experiments-tab"),
};

function createLazyTab(load: PlaygroundTabLoader, retryToken: number) {
  void retryToken;
  return lazy(load);
}

export function PlaygroundStudio() {
  const studio = usePlaygroundStudio();
  const { workspaceTab, setWorkspaceTab } = studio;
  const playground = useMessages((messages) => messages.playground);
  const showPreviewPanel = workspaceTab !== "experiments";
  const [tabLoadAttempt, setTabLoadAttempt] = useState(0);
  const ActiveTab = useMemo(
    () => createLazyTab(tabLoaders[workspaceTab], tabLoadAttempt),
    [workspaceTab, tabLoadAttempt],
  );

  useEffect(() => {
    tabLoaders[workspaceTab]().catch(() => {});
  }, [workspaceTab]);

  return (
    <Card className="paper-card border-[color:var(--line-strong)] py-3.5 sm:py-4.5 gap-0">
      <CardHeader className="gap-2 border-b border-[color:var(--line)]/70 px-4 pb-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
            {playground.eyebrow}
          </div>
          <div className="text-[11px] text-[color:var(--ink-soft)]">{playground.badge}</div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-display text-3xl text-[color:var(--ink)]">
            {playground.title}
          </CardTitle>
          <InfoTip label={playground.description} />
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-3.5 sm:px-5">
        <div
          className={[
            "grid items-start gap-3.5",
            showPreviewPanel ? "xl:grid-cols-[minmax(0,0.82fr)_minmax(0,0.98fr)]" : "",
          ].join(" ")}
        >
          <div className="min-w-0 space-y-3.5">
            <SegmentedTabs
              value={workspaceTab}
              onChange={setWorkspaceTab}
              items={[
                {
                  value: "analyze",
                  label: playground.tabs.analyze,
                  shortLabel: playground.tabs.analyzeShort,
                },
                {
                  value: "compare",
                  label: playground.tabs.compare,
                  shortLabel: playground.tabs.compareShort,
                },
                {
                  value: "experiments",
                  label: playground.tabs.experiments,
                  shortLabel: playground.tabs.experimentsShort,
                },
              ]}
            />
            <LazyLoadErrorBoundary
              resetKey={`${workspaceTab}:${tabLoadAttempt}`}
              onRetry={() => setTabLoadAttempt((attempt) => attempt + 1)}
              fallback={(retry) => <PlaygroundTabLoadError onRetry={retry} />}
            >
              <Suspense fallback={<PlaygroundTabFallback />}>
                <ActiveTab studio={studio} />
              </Suspense>
            </LazyLoadErrorBoundary>
          </div>
          {showPreviewPanel ? <PlaygroundPreviewPanel studio={studio} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default PlaygroundStudio;
