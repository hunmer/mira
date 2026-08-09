declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// PIXI / Spine 4.2 由 index.html 的 UMD <script> 注入到 window
declare global {
  interface Window {
    PIXI: any
  }
}
