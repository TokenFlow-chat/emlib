import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n";

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-[color:var(--line)] bg-white/72 px-3 py-1 text-[0.625rem] font-semibold tracking-[0.16em] text-[color:var(--ink-soft)] uppercase sm:text-[0.6875rem]">
      {children}
    </span>
  );
}

export default function HeroPanel() {
  const { messages } = useI18n();

  return (
    <Card className="hero-panel overflow-hidden border-[color:var(--line-strong)]">
      <CardContent className="grid items-start gap-5 px-5 py-6 sm:px-6 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] xl:px-8 xl:py-8">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <div className="flex flex-wrap gap-2">
            {messages.hero.pills.map((pill) => (
              <Pill key={pill}>{pill}</Pill>
            ))}
          </div>
          <div className="space-y-4">
            <h1 className="font-display text-[2.7rem] leading-[0.94] text-[color:var(--ink)] sm:text-5xl xl:text-[4.35rem]">
              {messages.hero.titleLead}
              <span className="block text-[color:var(--accent-strong)]">
                {messages.hero.titleAccent}
              </span>
            </h1>
            <p className="max-w-2xl text-[0.9375rem] leading-7 text-[color:var(--ink-soft)] sm:text-lg">
              {messages.hero.description}
            </p>
            <p className="max-w-2xl rounded-[0.9rem] border border-[color:var(--line)] bg-white/66 px-4 py-3 text-sm leading-6 text-[color:var(--ink-soft)]">
              <span className="font-semibold text-[color:var(--ink)]">
                {messages.hero.paperNote.label}:
              </span>{" "}
              <a
                href={messages.hero.paperNote.href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[color:var(--accent-strong)] underline decoration-[color:var(--accent-soft)] underline-offset-3"
              >
                {messages.hero.paperNote.title}
              </a>
              {" · "}
              <a
                href={messages.hero.paperNote.href}
                target="_blank"
                rel="noreferrer"
                className="text-[color:var(--ink-soft)] underline decoration-[color:var(--line)] underline-offset-3"
              >
                {messages.hero.paperNote.linkLabel}
              </a>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {messages.hero.stats.map((item) => (
              <div key={item.label} className="stat-block min-w-0">
                <div className="stat-label">{item.label}</div>
                <div className="font-display text-2xl text-[color:var(--ink)]">{item.value}</div>
                <div className="text-sm leading-6 text-[color:var(--ink-soft)]">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 space-y-4 rounded-[1.2rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 shadow-[inset_0_0.0625rem_0_rgba(255,255,255,0.45)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
                {messages.hero.pipeline.eyebrow}
              </div>
              <div className="mt-1 font-display text-2xl text-[color:var(--ink)]">
                {messages.hero.pipeline.title}
              </div>
            </div>
            <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1 text-xs font-semibold text-[color:var(--accent-strong)]">
              {messages.hero.pipeline.badge}
            </div>
          </div>
          <div className="space-y-3">
            {messages.hero.pipeline.steps.map((step, index) => (
              <div
                key={step.title}
                className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/80 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[color:var(--accent-soft)] font-semibold text-[color:var(--accent-strong)]">
                    {index + 1}
                  </div>
                  <div className="font-semibold text-[color:var(--ink)]">{step.title}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
