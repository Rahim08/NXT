"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme-provider";

interface MobileProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileProfileMenu({ isOpen, onClose }: MobileProfileMenuProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const menuItems = [
    {
      label: t.settings.language,
      children: [
        { label: "English", active: locale === "en", onClick: () => setLocale("en") },
        { label: "Русский", active: locale === "ru", onClick: () => setLocale("ru") },
      ],
    },
    {
      label: t.settings.appearance,
      children: [
        { label: t.settings.light, active: theme === "light", onClick: () => setTheme("light") },
        { label: t.settings.dark, active: theme === "dark", onClick: () => setTheme("dark") },
        { label: t.settings.system, active: theme === "system", onClick: () => setTheme("system") },
      ],
    },
  ];

  const links = [
    { label: t.nav.import, href: "/import" },
    { label: t.export.json, action: () => handleExport("json") },
    { label: t.export.csv, action: () => handleExport("csv") },
    { label: t.settings.about, href: "/settings" },
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
    onClose();
  };

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-surface rounded-t-[var(--radius-lg)] overflow-hidden safe-area-bottom">
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* Menu content */}
        <div className="px-4 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {menuItems.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-1">
                {section.label}
              </p>
              <div className="flex gap-2 flex-wrap">
                {section.children.map((child) => (
                  <button
                    key={child.label}
                    onClick={() => {
                      child.onClick();
                      onClose();
                    }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium min-h-[44px] min-w-[44px] transition-colors ${
                      child.active
                        ? "bg-accent text-text-inverse"
                        : "bg-elevated border border-border text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Separator */}
          <div className="border-t border-border" />

          {/* Links */}
          <div className="space-y-1">
            {links.map((link) =>
              link.href ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-surface-hover transition-colors"
                >
                  <span className="text-[15px] text-text-primary">{link.label}</span>
                  <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <button
                  key={link.label}
                  onClick={() => {
                    link.action?.();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-surface-hover transition-colors text-left"
                >
                  <span className="text-[15px] text-text-primary">{link.label}</span>
                  <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
