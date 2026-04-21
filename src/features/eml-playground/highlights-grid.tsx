import type { IconType } from "react-icons";

import { paperHighlights } from "@/features/eml-playground/constants";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n";

function SectionCard({ icon: Icon, title, text }: { icon: IconType; title: string; text: string }) {
  return (
    <Card className="paper-card border-[color:var(--line)]">
      <CardHeader className="gap-4">
        <div className="flex gap-2 items-center">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
            <Icon className="size-5" />
          </div>
          <CardTitle className="font-display text-2xl text-[color:var(--ink)]">{title}</CardTitle>
        </div>
        <div className="space-y-2">
          <CardDescription className="leading-6 text-[color:var(--ink-soft)]">
            {text}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function HighlightsGrid() {
  const { messages } = useI18n();

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {messages.highlights.map((highlight, index) => {
        const icon = paperHighlights[index]!.icon;

        return (
          <SectionCard
            key={highlight.title}
            icon={icon}
            title={highlight.title}
            text={highlight.text}
          />
        );
      })}
    </section>
  );
}
