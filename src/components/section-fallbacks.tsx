import { Card, CardContent } from "@/components/ui/card";

export function HeroPanelFallback() {
  return (
    <Card className="hero-panel overflow-hidden border-[color:var(--line-strong)]">
      <CardContent className="grid items-start gap-5 px-5 py-6 sm:px-6 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:px-8 xl:py-8">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="h-7 w-44 rounded-full bg-white/70" />
            <div className="h-7 w-36 rounded-full bg-white/55" />
          </div>
          <div className="space-y-3">
            <div className="h-14 max-w-[30rem] rounded-3xl bg-white/72" />
            <div className="h-6 max-w-[20rem] rounded-full bg-white/55" />
            <div className="h-6 max-w-[18rem] rounded-full bg-white/45" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="stat-block min-h-32 animate-pulse bg-white/62"
              />
            ))}
          </div>
        </div>
        <div className="min-h-88 rounded-[1.2rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)]/85 p-4 sm:p-5" />
      </CardContent>
    </Card>
  );
}

export function HighlightsGridFallback() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={index}
          className="paper-card min-h-52 border-[color:var(--line)]"
        />
      ))}
    </section>
  );
}

export function SummaryPanelsFallback() {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.5fr)_minmax(0,0.5fr)]">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card
          key={index}
          className="paper-card min-h-[31rem] border-[color:var(--line)]"
        />
      ))}
    </section>
  );
}

export function PlaygroundStudioFallback() {
  return (
    <Card className="paper-card border-[color:var(--line-strong)] py-5 sm:py-6">
      <CardContent className="min-h-[45rem] animate-pulse px-5 sm:px-6" />
    </Card>
  );
}
