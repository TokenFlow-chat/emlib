import { useRef } from "react";

import { AppFooter } from "@/components/app-footer";
import { AppNav } from "@/components/app-nav";
import {
  HeroPanelFallback,
  HeroPanelLoadError,
  HighlightsGridFallback,
  HighlightsGridLoadError,
  PlaygroundStudioFallback,
  PlaygroundStudioLoadError,
  SummaryPanelsFallback,
  SummaryPanelsLoadError,
} from "@/components/section-fallbacks";
import { LazySection } from "@/components/lazy-section";
import { getTrackedHashId, useInitialHashScroll } from "@/hooks/use-initial-hash-scroll";
import "./index.css";

const loadHeroPanel = () => import("@/features/eml-playground/hero-panel");
const loadHighlightsGrid = () => import("@/features/eml-playground/highlights-grid");
const loadSummaryPanels = () => import("@/features/eml-playground/summary-panels");
const loadPlaygroundStudio = () => import("@/features/eml-playground/playground-studio");
const sectionIds = ["overview", "highlights", "summary", "playground"] as const;

export function App() {
  const initialHashId = useRef(getTrackedHashId(sectionIds)).current;
  const initialHashIndex = initialHashId ? sectionIds.indexOf(initialHashId) : -1;
  const { isRestoring } = useInitialHashScroll(sectionIds);

  return (
    <main className="relative overflow-x-clip">
      <AppNav hashSyncEnabled={!isRestoring} autoHideEnabled={!isRestoring} />
      <section className="mx-auto flex min-h-screen w-full max-w-370 flex-col gap-5 px-3 pb-6 pt-4 sm:px-4 sm:pb-8 sm:pt-5 lg:gap-6 lg:px-6 lg:pb-10 lg:pt-6">
        <section id="overview" className="scroll-mt-28">
          <LazySection
            load={loadHeroPanel}
            eager
            fallback={<HeroPanelFallback />}
            errorFallback={(retry) => <HeroPanelLoadError onRetry={retry} />}
          />
        </section>
        <section id="highlights" className="scroll-mt-28">
          <LazySection
            load={loadHighlightsGrid}
            eager={initialHashIndex >= 1}
            fallback={<HighlightsGridFallback />}
            errorFallback={(retry) => <HighlightsGridLoadError onRetry={retry} />}
          />
        </section>
        <section id="summary" className="scroll-mt-28">
          <LazySection
            load={loadSummaryPanels}
            eager={initialHashIndex >= 2}
            fallback={<SummaryPanelsFallback />}
            errorFallback={(retry) => <SummaryPanelsLoadError onRetry={retry} />}
          />
        </section>
        <section id="playground" className="scroll-mt-28">
          <LazySection
            load={loadPlaygroundStudio}
            eager={initialHashIndex >= 3}
            fallback={<PlaygroundStudioFallback />}
            errorFallback={(retry) => <PlaygroundStudioLoadError onRetry={retry} />}
          />
        </section>
      </section>
      <AppFooter />
    </main>
  );
}

export default App;
