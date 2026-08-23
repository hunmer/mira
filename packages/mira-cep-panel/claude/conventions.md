# mira-cep-panel — 约定

## Chromium 61 兼容（最重要）

- 禁用现代 CSS：oklch 颜色、`:has()`、`@layer` 需经构建链降级；新增样式要过 `scripts/compat-css.mjs` 验证
- 禁用现代 JS API（Array.at 等）除非进 `src/polyfills.ts`；暗色调色板为手写 sRGB（见 `src/style.css`）
- 依赖引入前先确认能在 Chromium 61 运行（这就是只依赖 `mira-plugin-ui` + `resize-observer-polyfill` 的原因）

## PS 交互

- Vue 组件不直接调 CSInterface；统一走 `src/cep.ts` 桥（类型化的 place/export/prefetch）
- 拖拽置入依赖 `host.jsx` 的临时目录预取流程

## 连接与凭据

- `useMira()`：`MiraClient` 默认 `http://127.0.0.1:8081`，开发默认账号 admin/admin123，token 存 localStorage
- 跨域靠 manifest `--disable-web-security`（无 vite 代理可用）
