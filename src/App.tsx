import { PlaygroundStudio } from "@/features/eml-playground/playground-studio";
import {
  HeroPanel,
  HighlightsGrid,
  SummaryPanels,
} from "@/features/eml-playground/overview";
import "./index.css";

export function App() {
  return (
    <main className="relative overflow-x-clip">
      <section className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col gap-5 px-3 py-3 sm:px-4 sm:py-4 lg:gap-6 lg:px-6 lg:py-6">
        <HeroPanel />
        <HighlightsGrid />
        <SummaryPanels />
        <PlaygroundStudio />
      </section>
    </main>
  );
}

export default App;
