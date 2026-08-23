# mira-cep-panel — 依赖与配置

## 运行依赖（仅 2 个）

- `mira-plugin-ui`（`workspace:*`）——MediaLibraryView 三栏组件
- `resize-observer-polyfill`

## 关键依赖（dev/build）

- vite 6、vue 3.5.13、tailwind 4
- `postcss-preset-env` + `@csstools/postcss-cascade-layers`：CSS 降级链

## 配置要点

- 服务端地址/凭据在 `src/services.ts`（默认 `http://127.0.0.1:8081`）
- 同步目录：`MIRA_CEP_EXTENSION_DIR` 环境变量覆盖 `scripts/sync.mjs` 默认路径
- 调试端口 8899（public/.debug）
