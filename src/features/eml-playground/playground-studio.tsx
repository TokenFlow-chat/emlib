import { lazy, Suspense, useEffect } from "react";

import { InfoTip } from "@/components/ui/info-tip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaygroundPreviewPanel } from "@/features/eml-playground/playground-preview-panel";
import { PlaygroundTabFallback, SegmentedTabs } from "@/features/eml-playground/playground-shared";
import { usePlaygroundStudio } from "@/features/eml-playground/use-playground-studio";
import { useMessages } from "@/i18n";

const AnalyzeTab = lazy(() => import("@/features/eml-playground/playground-analyze-tab"));
const CompareTab = lazy(() => import("@/features/eml-playground/playground-compare-tab"));
const ExperimentsTab = lazy(() => import("@/features/eml-playground/playground-experiments-tab"));

const tabLoaders = {
  analyze: () => import("@/features/eml-playground/playground-analyze-tab"),
  compare: () => import("@/features/eml-playground/playground-compare-tab"),
  experiments: () => import("@/features/eml-playground/playground-experiments-tab"),
} as const;

export function PlaygroundStudio() {
  const studio = usePlaygroundStudio();
  const { workspaceTab, setWorkspaceTab } = studio;
  const playground = useMessages((messages) => messages.playground);
  const showPreviewPanel = workspaceTab !== "experiments";

  useEffect(() => {
    void tabLoaders[workspaceTab]();
  }, [workspaceTab]);

  const ActiveTab =
    workspaceTab === "analyze"
      ? AnalyzeTab
      : workspaceTab === "compare"
        ? CompareTab
        : ExperimentsTab;

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
            <Suspense fallback={<PlaygroundTabFallback />}>
              <ActiveTab studio={studio} />
            </Suspense>
          </div>
          {showPreviewPanel ? <PlaygroundPreviewPanel studio={studio} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default PlaygroundStudio;
