import { emlibCapabilities } from "@/features/eml-playground/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n";

export default function SummaryPanels() {
  const { messages } = useI18n();

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.5fr)_minmax(0,0.5fr)]">
      <Card className="paper-card border-[color:var(--line)]">
        <CardHeader className="gap-3">
          <CardTitle className="font-display text-3xl text-[color:var(--ink)]">
            {messages.summary.paper.title}
          </CardTitle>
          <CardDescription className="max-w-xl leading-7 text-[color:var(--ink-soft)]">
            {messages.summary.paper.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-5">
            <div className="text-xs font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
              {messages.summary.paper.formulaLabel}
            </div>
            <div className="mt-3 font-display text-3xl text-[color:var(--ink)]">
              eml(x, y) = exp(x) - ln(y)
            </div>
            <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
              {messages.summary.paper.formulaDescription}
            </p>
          </div>
          <div className="space-y-3">
            {messages.summary.paper.points.map((point) => (
              <div
                key={point.title}
                className="rounded-[0.95rem] border border-[color:var(--line)] bg-white/72 p-4"
              >
                <div className="font-semibold text-[color:var(--ink)]">{point.title}</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{point.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="paper-card border-[color:var(--line)]">
        <CardHeader className="gap-3">
          <CardTitle className="font-display text-3xl text-[color:var(--ink)]">
            {messages.summary.emlib.title}
          </CardTitle>
          <CardDescription className="leading-7 text-[color:var(--ink-soft)]">
            {messages.summary.emlib.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {messages.summary.emlib.capabilities.map((capability, index) => {
            const Icon = emlibCapabilities[index]!.icon;

            return (
              <div
                key={capability.title}
                className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-5"
              >
                <div className="flex gap-2 items-center font-semibold text-[color:var(--ink)]">
                  <div className="flex size-10 items-center justify-center rounded-[0.8rem] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                    <Icon className="size-5" />
                  </div>
                  {capability.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {capability.text}
                </p>
                <div className="mt-3 text-xs leading-5 text-[color:var(--ink-soft)]/80">
                  {capability.detail}
                </div>
                <div className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]/70">
                  {capability.useCase}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
