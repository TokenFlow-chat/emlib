import { type LucideIcon } from "lucide-react";

import { paperHighlights } from "@/features/eml-playground/constants";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SectionCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Card className="paper-card border-[color:var(--line)]">
      <CardHeader className="gap-4">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
          <Icon className="size-5" />
        </div>
        <div className="space-y-2">
          <CardTitle className="font-display text-2xl text-[color:var(--ink)]">
            {title}
          </CardTitle>
          <CardDescription className="leading-6 text-[color:var(--ink-soft)]">
            {text}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function HighlightsGrid() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {paperHighlights.map((item) => (
        <SectionCard
          key={item.title}
          icon={item.icon}
          title={item.title}
          text={item.text}
        />
      ))}
    </section>
  );
}
