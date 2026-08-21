/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface MiraHostApp {
  theme?: string
  isDarkColors?: () => boolean
}

interface MiraHostApi {
  app?: MiraHostApp
  onThemeChanged?: (callback: (theme: string) => void) => unknown
  item?: { getSelected?: () => Promise<unknown[]> }
  log?: Record<'debug' | 'info' | 'warn' | 'error', ((...args: any[]) => void) | undefined>
  [key: string]: any
}

interface Window {
  mira?: MiraHostApi
  /** 宿主别名（plugin-window-preload 同时暴露 eagle = mira） */
  eagle?: MiraHostApi
}
