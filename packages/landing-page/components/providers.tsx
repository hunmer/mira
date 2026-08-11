"use client";

import { ThemeProvider, type ThemeProviderProps } from "next-themes";
import type * as React from "react";
import { I18nProvider } from "@/lib/i18n/i18n-provider";

export type ProvidersProps = {
  children: React.ReactNode;
  themeProps?: Omit<ThemeProviderProps, "children">;
};

export function RootProviders({ children, themeProps }: ProvidersProps) {
  return (
    <ThemeProvider {...themeProps}>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}
