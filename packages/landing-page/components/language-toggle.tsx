"use client";

import { LanguagesIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, toggleLocale } = useI18n();
  const nextLabel = locale === "zh" ? "EN" : "中";

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label="Switch language"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-accent",
        className
      )}
    >
      <LanguagesIcon className="size-4" />
      <span className="font-mono text-xs tracking-wide">{nextLabel}</span>
    </button>
  );
}
