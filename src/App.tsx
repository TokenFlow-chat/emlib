import { lazy } from "react";

import { AppNav } from "@/components/app-nav";
import {
  HeroPanelFallback,
  HighlightsGridFallback,
  PlaygroundStudioFallback,
  SummaryPanelsFallback,
} from "@/components/section-fallbacks";
import { LazySection } from "@/components/lazy-section";
import "./index.css";

const HeroPanel = lazy(() => import("@/features/eml-playground/hero-panel"));
const HighlightsGrid = lazy(() => import("@/features/eml-playground/highlights-grid"));
const SummaryPanels = lazy(() => import("@/features/eml-playground/summary-panels"));
const PlaygroundStudio = lazy(() => import("@/features/eml-playground/playground-studio"));

export function App() {
  return (
    <main className="relative overflow-x-clip">
      <AppNav />
      <section className="mx-auto flex min-h-screen w-full max-w-370 flex-col gap-5 px-3 pb-6 pt-4 sm:px-4 sm:pb-8 sm:pt-5 lg:gap-6 lg:px-6 lg:pb-10 lg:pt-6">
        <section id="overview" className="scroll-mt-28">
          <LazySection component={HeroPanel} eager fallback={<HeroPanelFallback />} />
        </section>
        <section id="highlights" className="scroll-mt-28">
          <LazySection component={HighlightsGrid} fallback={<HighlightsGridFallback />} />
        </section>
        <section id="summary" className="scroll-mt-28">
          <LazySection component={SummaryPanels} fallback={<SummaryPanelsFallback />} />
        </section>
        <section id="playground" className="scroll-mt-28">
          <LazySection component={PlaygroundStudio} fallback={<PlaygroundStudioFallback />} />
        </section>
      </section>
    </main>
  );
}

export default App;
