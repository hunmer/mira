import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// 库构建：vue 由宿主提供（CDN/外部），其余依赖全部打进 bundle，
// 产物 dist/mira-plugin-ui.{es,umd}.js + dist/mira-plugin-ui.css 自包含可独立引用。
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'umd'],
      name: 'MiraPluginUI',
      fileName: format => `mira-plugin-ui.${format}.js`,
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: { vue: 'Vue' },
        assetFileNames: 'mira-plugin-ui.[ext]',
      },
    },
  },
})
