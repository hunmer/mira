import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import dts from "vite-plugin-dts"
import { resolve } from "node:path"

// 库模式构建:产出 ESM + CJS + 类型声明 + 单独的 style.css
export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ["src"],
      cleanVueFileName: true,
      tsconfigPath: "./tsconfig.json"
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "VueSelectionBox",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "vue-selection-box.js" : "vue-selection-box.cjs")
    },
    rollupOptions: {
      // vue 作为 peerDependency,不打包进产物
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue"
        },
        // CSS 产物统一输出为 style.css
        assetFileNames: "style.[ext]"
      }
    }
  }
})
