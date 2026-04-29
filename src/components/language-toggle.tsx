import { startTransition } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { LuLanguages } from "react-icons/lu";

export function LanguageToggle() {
  const { locale, locales, messages, setLocale } = useI18n();

  if (locales.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] bg-white/68 p-1 shadow-[inset_0_0.0625rem_0_rgba(255,255,255,0.72)]">
      <span className="px-2 font-semibold">
        <LuLanguages aria-label={messages.app.languageLabel} />
      </span>
      {locales.map((option) => {
        const isActive = option === locale;

        return (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={isActive ? "default" : "ghost"}
            lang={option}
            aria-pressed={isActive}
            className={
              isActive
                ? "rounded-full bg-[color:var(--accent-strong)] px-3 text-white shadow-[0_0.5rem_1.125rem_rgba(37,93,96,0.18)] hover:bg-[color:var(--accent-strong)]/92"
                : "rounded-full px-3 text-[color:var(--ink-soft)] hover:bg-white/72"
            }
            onClick={() => {
              if (isActive) return;

              startTransition(() => {
                setLocale(option);
              });
            }}
          >
            <span className="sr-only">{messages.app.localeNames[option]}</span>
            {messages.app.localeShortLabels[option]}
          </Button>
        );
      })}
    </div>
  );
}
