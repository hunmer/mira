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
      // 输出文件名不带 .vue 后缀(Masonry.vue -> Masonry.d.ts 而非 Masonry.vue.d.ts)
      cleanVueFileName: true,
      tsconfigPath: "./tsconfig.json"
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "VueMasonry",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "vue-masonry.js" : "vue-masonry.cjs")
    },
    rollupOptions: {
      // vue / motion-v 作为 peerDependencies,不打包进产物
      external: ["vue", "motion-v"],
      output: {
        globals: {
          vue: "Vue",
          "motion-v": "MotionV"
        },
        // CSS 产物统一输出为 style.css
        assetFileNames: "style.[ext]"
      }
    }
  }
})
