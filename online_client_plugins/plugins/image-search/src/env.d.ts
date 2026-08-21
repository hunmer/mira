/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  mira?: import('./types').MiraHostApi
  /** 宿主别名（plugin-window-preload 同时暴露 eagle = mira） */
  eagle?: import('./types').MiraHostApi
}
