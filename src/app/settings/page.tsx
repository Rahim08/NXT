"use client";

import { useRouter } from "next/navigation";
import { LayoutShell } from "@/components/layout/layout-shell";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme-provider";
import { localeNames, type Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/theme-provider";

export default function SettingsPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  const appearanceOptions: { value: Theme; label: string }[] = [
    { value: "system", label: t.settings.system },
    { value: "light", label: t.settings.light },
    { value: "dark", label: t.settings.dark },
  ];

  const handleExport = async (format: "json" | "csv") => {
    try {
      const res = await fetch(`/api/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `next-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  return (
    <LayoutShell>
      <div className="max-w-2xl space-y-8">
        <header>
          <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
            {t.settings.title}
          </h1>
        </header>

        {/* Language */}
        <section className="bg-surface rounded-[var(--radius-lg)] border border-border p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            {t.settings.language}
          </h2>
          <div className="flex gap-2">
            {(Object.keys(localeNames) as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium min-w-[44px] transition-colors ${
                  locale === l
                    ? "bg-accent text-text-inverse"
                    : "border border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {localeNames[l]}
              </button>
            ))}
          </div>
        </section>

        {/* Appearance */}
        <section className="bg-surface rounded-[var(--radius-lg)] border border-border p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            {t.settings.appearance}
          </h2>
          <div className="flex gap-2">
            {appearanceOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium min-w-[44px] transition-colors ${
                  theme === opt.value
                    ? "bg-accent text-text-inverse"
                    : "border border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Data */}
        <section className="bg-surface rounded-[var(--radius-lg)] border border-border p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            {t.settings.data}
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/import")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] border border-border hover:bg-surface-hover transition-colors text-left"
            >
              <span className="text-sm text-text-primary">{t.nav.import}</span>
              <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <button
              onClick={() => handleExport("json")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] border border-border hover:bg-surface-hover transition-colors text-left"
            >
              <span className="text-sm text-text-primary">{t.export.json}</span>
              <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] border border-border hover:bg-surface-hover transition-colors text-left"
            >
              <span className="text-sm text-text-primary">{t.export.csv}</span>
              <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>
          </div>
        </section>

        {/* About */}
        <section className="bg-surface rounded-[var(--radius-lg)] border border-border p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            {t.settings.about}
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">{t.settings.version}</span>
              <span className="text-text-primary font-medium">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Next.js</span>
              <span className="text-text-primary font-medium">16.3.2</span>
            </div>
          </div>
        </section>
      </div>
    </LayoutShell>
  );
}
