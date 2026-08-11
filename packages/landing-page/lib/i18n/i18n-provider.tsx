"use client";

import * as React from "react";
import {
  DEFAULT_LOCALE,
  type Locale,
  LOCALES,
  translations,
  type Translation,
} from "./translations";

const STORAGE_KEY = "mira-locale";

type I18nContextValue = {
  locale: Locale;
  t: Translation;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

function isLocale(value: unknown): value is Locale {
  return value === "zh" || value === "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // 初始用默认语言，避免 SSR/CSR 不一致；挂载后从 localStorage 读取
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored) && stored !== locale) {
        setLocaleState(stored);
      }
    } catch {
      // localStorage 不可用时忽略，保持默认语言
    }
    // 仅挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 忽略写入失败
    }
  }, []);

  const toggleLocale = React.useCallback(() => {
    setLocaleState((cur) => {
      const next: Locale = cur === "zh" ? "en" : "zh";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 忽略写入失败
      }
      return next;
    });
  }, []);

  const value = React.useMemo<I18nContextValue>(
    () => ({
      locale,
      t: translations[locale],
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n 必须在 I18nProvider 内部使用");
  }
  return ctx;
}

export { LOCALES };
