import { lazy } from "react";

import { HeroPanelFallback, HighlightsGridFallback, PlaygroundStudioFallback, SummaryPanelsFallback } from "@/components/section-fallbacks";
import { LazySection } from "@/components/lazy-section";
import "./index.css";

const HeroPanel = lazy(() => import("@/features/eml-playground/hero-panel"));
const HighlightsGrid = lazy(
  () => import("@/features/eml-playground/highlights-grid"),
);
const SummaryPanels = lazy(
  () => import("@/features/eml-playground/summary-panels"),
);
const PlaygroundStudio = lazy(
  () => import("@/features/eml-playground/playground-studio"),
);

export function App() {
  return (
    <main className="relative overflow-x-clip">
      <section className="mx-auto flex min-h-screen w-full max-w-370 flex-col gap-5 px-3 py-3 sm:px-4 sm:py-4 lg:gap-6 lg:px-6 lg:py-6">
        <LazySection
          component={HeroPanel}
          eager
          fallback={<HeroPanelFallback />}
        />
        <LazySection
          component={HighlightsGrid}
          fallback={<HighlightsGridFallback />}
        />
        <LazySection
          component={SummaryPanels}
          fallback={<SummaryPanelsFallback />}
        />
        <LazySection
          component={PlaygroundStudio}
          fallback={<PlaygroundStudioFallback />}
        />
      </section>
    </main>
  );
}

export default App;
