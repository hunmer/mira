# mira_epub_format

EPUB 电子书格式插件（协议 B）。yauzl 只读解析 OPF 元数据与封面生成缩略图（无封面时生成书名 SVG 兜底），viewer 用本地打包的 epub.js 提供阅读器。

## 约定

- `registerFileFormat`：extensions `epub`，MIME `application/epub+zip`，thumbnailExtensions `epub`
- `process`：解析 META-INF/container.xml → OPF，返回 title/author/hasCover
- `thumbnail`：封面图（properties=cover-image 或 meta[name=cover]）→ sharp 512 PNG；失败回退 SVG（书名+作者）
- 唯一 extra file：`book.epub`（原文件透传给阅读器）
- ZIP 安全限制：5000 条 / 单条 64MB / 总量 512MB，条目名防路径逃逸（safeEntryName）
- viewer `mira-epub-reader`：entry `viewer.html`、priority 10，query 注入 path=getExtraFileUrl('book.epub')
- web/：viewer.html 依赖本地 vendor（`epub/js/epub.js`、jszip、sanitize-html）；pluginId `f6a7b8c9-…`，permissions ui/dom
- 构建命令：`npm run build`（tsc）；`npm run test` = build + node test.js + node test-browser-bundle.js
- 依赖：sharp、yauzl

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（206 行）：ZIP 安全读取、OPF 解析、缩略图 |
| `web/viewer.html` | epub.js 阅读器页 |
| `test.js` / `test-browser-bundle.js` | 测试脚本 |

## 扫描状态

- 版本：1.0.0
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、viewer.html 引用脚本
- 未扫描：web/epub 与 web/assets 静态资源、test 实现
