# 依赖与配置

## 运行时依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `mira-app-core` | `workspace:*` | 后端 SDK(`MiraClient` / auth/libraries/folders/files 模块),workspace 包 |
| `vue` | `^3.4.0` | UI 框架(popup + side panel) |

## devDependencies(关键)

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@crxjs/vite-plugin` | `^2.0.0-beta.28`(实际解析 2.7.1) | MV3 扩展构建:从 manifest 推导入口、HMR、产物改名带 hash |
| `@vitejs/plugin-vue` | `^5.0.0` | Vue SFC 编译 |
| `@types/chrome` | `^0.0.260` | Chrome 扩展 API 类型(`chrome.offscreen.Reason.BLOBS` 枚举等) |
| `vite` | `^5.4.0` | 构建 |
| `vitest` | `^1.6.0` | 单测(node 环境) |
| `vue-tsc` | `^2.0.0` | Vue 类型检查 |
| `jsdom` | `^24.0.0` | 测试 DOM 环境(当前用 node) |
| `typescript` | `^5.3.3` | — |
| `@vitest/coverage-v8` | `^1.6.0` | 覆盖率 |

## 配置文件

### `manifest.ts`(→ dist/manifest.json)
MV3 配置。关键:`permissions`(含 scripting/offscreen/contextMenus/sidePanel)、`host_permissions:<all_urls>`、`background.service_worker`(module)、`content_scripts`(`<all_urls>`)、`side_panel`、`web_accessible_resources`(maxurl.user.js)、`commands`(三截图快捷键)。详见 [entrypoints.md](entrypoints.md)。

### `vite.config.ts`
- 插件:`vue()` + `crx({ manifest })`
- 别名:`@ → ./src`
- **关键**:`build.rollupOptions.input.offscreen = 'src/offscreen/index.html'`(否则 offscreen 不进 dist)
- target es2022,outDir dist,emptyOutDir

### `tsconfig.json`
- strict,`moduleResolution: bundler`,`types: ["chrome","vite/client"]`(后者声明 `*?raw`)
- 别名 `@/* → src/*`
- lib: ES2022 + DOM + DOM.Iterable

### `vitest.config.ts`
- environment: `node`(纯逻辑测试)
- 别名 `@ → ./src`(与 vite 一致)
- include `src/**/*.test.ts`

## 环境变量 / 外部依赖

- **Mira 后端**:默认 `http://localhost:8081`(`DEFAULT_SERVER_URL`),UI 可配;扩展通过 SDK 访问。
- **Chrome 116+**:offscreen API 要求。
- 无 `.env` 文件;无 CI 配置(本仓库根可能有,本包内无)。

## 框架版本差异 / 兼容性提醒

- **@crxjs 2.7.1** vs beta:content_scripts.js 产物带 hash(如 `assets/index.ts-loader-RHrjSKoS.js`),`inject.ts` 必须**动态读 manifest** 取文件名,写死会 `Could not load file`。
- **@crxjs 不自动构建非 manifest 入口**:offscreen HTML 必须显式 rollup input。
- **`chrome.offscreen.Reason`**:`Reason` 是 **enum**,字符串字面量(`'BLOBS'`)不直接兼容,须用 `chrome.offscreen.Reason.BLOBS`;`IMAGE_PROCESSING` 在 Chrome 不存在(是 Firefox/Edge 的)。
- **`vite/client` 的 `?raw`**:声明 `*?raw → string`;imu.ts 曾用动态 import,现已改 MAIN world 注入(public/maxurl.user.js)。

## maxurl 资源

- `public/maxurl.user.js`(7.2MB,141K 行):来自 `plugins/plugins/mira_eagle_extension/maxurl.user.js` 的拷贝,Image Max URL userscript。web_accessible_resources 声明,运行时注入页面 MAIN world。
