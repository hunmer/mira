# pdf-viewer

PDF 文档预览插件（协议 B，最简格式插件）。只注册格式与 viewer，无缩略图；预览用浏览器内置 PDF 渲染器（iframe 加载带 token 的文件 URL），前端零 PDF 依赖，悬停时回退缩略图。

## 约定

- `registerFileFormat`：id `mira-pdf`，extensions `pdf`，MIME `application/pdf`；不声明 thumbnailExtensions/thumbnail
- viewer `mira-pdf`：entry `viewer.html`、priority 10，query 注入 fileId/pdfUrl/fileName
- `web/index.js`（IIFE）：客户端注册同名格式，getPreviewUrl 把路径规整为 http/https/file/blob URL 交给宿主 IframePreview；renderHoverCard 提供悬停缩略图回退
- 构建命令：`npm run build`（tsc）；`npm run test` = build + node test.js；无运行时依赖

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（57 行）：纯注册 |
| `web/index.js` | 客户端格式注册 + hovercard 回退 |
| `web/viewer.html` | iframe 预览壳 |
| `web/plugin.json` | 客户端 manifest（pluginId b7c1f9a2-…） |

## 扫描状态

- 版本：1.0.0
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、web/index.js 头部
- 未扫描：viewer.html、test.js
