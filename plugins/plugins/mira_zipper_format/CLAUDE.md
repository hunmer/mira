# mira_zipper_format

ZIP 归档只读浏览插件（协议 B）。把 zip 整包解压到缓存目录并生成 `__index.json` 索引，viewer 提供条目树浏览与图片/文本/音视频内联预览；缩略图取包内首张图片（否则 SVG 兜底）。

## 约定

- `registerFileFormat`：extensions `zip`，MIME `application/zip`、`application/x-zip-compressed`，thumbnailExtensions `zip`
- `ArchiveCache`：解压到 server `temp/zipper/{路径 sha256 前 32 位}`，以 size:mtime 指纹判缓存失效；索引条目含 previewType（image/text/video/audio/other）
- `process` 返回 entryCount 与 topDirs（前 50 个）
- `thumbnail`：包内首张 image 条目 → sharp 512 PNG，无图用内嵌 SVG "ZIP" 兜底
- `getExtraFileList` = `__index.json` + 全部条目；`getExtraFile` 做路径逃逸二次校验
- ZIP 安全限制：5000 条 / 单条 64MB / 总量 1GB
- viewer `mira-zipper`：entry `viewer.html`、priority 10，query 注入 indexUrl=getExtraFileUrl('__index.json')
- web/：viewer.html 单文件内联脚本；pluginId `c3e7a1f2-…`
- 构建命令：`npm run build`（tsc）；`npm run test` = build + node test.js + node test-browser-bundle.js；依赖 sharp、yauzl

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（290 行）：解压/缓存/索引/缩略图 |
| `web/viewer.html` | 归档浏览页（条目树 + 内联预览） |

## 扫描状态

- 版本：1.0.0
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、viewer.html 结构
- 未扫描：viewer.html 内联脚本细节、test 实现
