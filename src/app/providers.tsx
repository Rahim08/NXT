"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "@/lib/theme-provider";
import { I18nProvider } from "@/lib/i18n/provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import type { Locale } from "@/lib/i18n";

function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("next-locale");
    if (saved === "en" || saved === "ru") return saved;
  }
  return "en";
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocale(getInitialLocale());
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render children without providers during SSR/initial hydration
    // to avoid hydration mismatch from localStorage
    return <>{children}</>;
  }

  return (
    <ThemeProvider>
      <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
