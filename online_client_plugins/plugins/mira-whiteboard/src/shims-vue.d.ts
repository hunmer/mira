/**
 * 让 TypeScript 识别 .vue 文件的导入。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 静态资源：vite 构建期会把 import 解析为运行时 asset URL（字符串）
declare module '*.woff2' {
  const src: string
  export default src
}
declare module '*.ttf' {
  const src: string
  export default src
}

// @woven-canvas/vue 的样式入口（运行时需要，类型可放宽）
declare module '@woven-canvas/vue/style.css'
