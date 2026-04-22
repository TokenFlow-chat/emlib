import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { zhCN } from "@/i18n/locales/zh-CN";
import { baseMessages, LOCALES, type Locale, type MessageDictionary } from "@/i18n/schema";

const STORAGE_KEY = "eml.locale";
const DEFAULT_LOCALE: Locale = "zh-CN";

const dictionaries = {
  "zh-CN": zhCN,
  "en-US": baseMessages,
} satisfies Record<Locale, MessageDictionary>;

function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

function resolveLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;

  const normalized = value.toLowerCase();
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("en")) return "en-US";

  return null;
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isLocale(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access issues and fall back to browser preferences.
  }

  const browserLocale = [...(window.navigator.languages ?? []), window.navigator.language]
    .map(resolveLocale)
    .find((locale): locale is Locale => locale !== null);

  return browserLocale ?? DEFAULT_LOCALE;
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  locales: readonly Locale[];
  messages: MessageDictionary;
  formatNumber: (value: number) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const messages = dictionaries[locale];

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Ignore storage access issues and keep the in-memory preference.
    }

    document.documentElement.lang = locale;
    document.title = messages.app.title;

    const descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descriptionTag) {
      descriptionTag.content = messages.app.metaDescription;
    }
  }, [locale, messages]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      locales: LOCALES,
      messages,
      formatNumber: (value) => numberFormatter.format(value),
    }),
    [locale, messages, numberFormatter],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}

export function useMessages<T>(selector: (messages: MessageDictionary) => T): T {
  const { messages } = useI18n();
  return selector(messages);
}
