declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

interface MiraHostApp {
  theme?: string
  locale?: string
  isDarkColors?: () => boolean
}

interface MiraHostApi {
  app?: MiraHostApp
  onThemeChanged?: (callback: (theme: string) => void) => unknown
  onLocaleChanged?: (callback: (locale: string) => void) => unknown
  [key: string]: any
}

declare global {
  interface Window {
    mira?: MiraHostApi
    /** 宿主别名（plugin-window-preload 同时暴露 eagle = mira） */
    eagle?: MiraHostApi
  }
}
