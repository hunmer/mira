# mira_pag_format

PAG（Portable Animated Graphics）格式插件（协议 B）。特色：服务端零 npm 依赖，缩略图与元数据均靠**无头 Chrome/Edge** 渲染 web/ 内置页面完成；播放器为本地 libpag WASM。

## 约定

- `registerFileFormat`：extensions `pag`，MIME `application/x-pag`，thumbnailExtensions `pag`
- `process`：无头浏览器加载 `metadata.html`，从 `<title>MIRA_PAG:base64</title>` 提取 width/height/duration
- `thumbnail`：无头浏览器 `--screenshot` 渲染 `thumbnail.html`（512x512，virtual-time-budget 5000，30s 超时）
- 浏览器探测顺序：`PAG_BROWSER_PATH` → `CHROME_PATH` → `PUPPETEER_EXECUTABLE_PATH` → Win Chrome/Edge → macOS Chrome → /usr/bin/google-chrome 等；找不到报错并提示设置 PAG_BROWSER_PATH
- viewer `mira-pag`：entry `viewer.html`，query 注入 fileUrl/fileName/v=1.0.1
- web/：`pag.wasm`（libpag WASM）+ core.js/core-loader.js + 三个页面（viewer/metadata/thumbnail）；pluginId `2c6f4ed1-…`
- 构建命令：`npm run build`（tsc）；无 test 脚本；无运行时依赖
- 导出 `testables = { loadMetadata, renderThumbnail }` 供测试

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（87 行）：无头浏览器调度 + 格式注册 |
| `web/viewer.html` | PAG 播放页 |
| `web/metadata.html` / `web/thumbnail.html` | 供无头浏览器渲染用的页面 |

## 扫描状态

- 版本：1.0.0（viewer query 自标 v=1.0.1）
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、web/index.js 头部、目录结构
- 未扫描：core.js/core-loader.js、三个 html 页面内部实现
