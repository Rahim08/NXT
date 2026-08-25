"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { getDictionary, type Locale, type TranslationKeys } from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function persistLanguage(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem("next-locale", locale);
  document.documentElement.lang = locale;
  // Persist to server DB (fire and forget)
  fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: locale }),
  }).catch(() => {});
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const t = getDictionary(locale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    persistLanguage(newLocale);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Return fallback during SSR or when provider is missing
    return {
      locale: "en",
      t: getDictionary("en"),
      setLocale: () => {},
    };
  }
  return ctx;
}
