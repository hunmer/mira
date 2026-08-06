/**
 * 让 TypeScript 识别 .vue 文件的导入。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// @woven-canvas/vue 的样式入口（运行时需要，类型可放宽）
declare module '@woven-canvas/vue/style.css'
