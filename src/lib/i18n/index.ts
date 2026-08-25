import { en } from "./en";
import { ru } from "./ru";

export type TranslationKeys = typeof en;
export type { Locale } from "./en";

const dictionaries: Record<string, TranslationKeys> = { en, ru };

export function getDictionary(locale: string): TranslationKeys {
  return dictionaries[locale] ?? dictionaries.en;
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`
  );
}

export const localeNames: Record<string, string> = {
  en: "English",
  ru: "Русский",
};

export const locales: string[] = ["en", "ru"];
