# mira_html_format

HTML 格式插件(v1.0.0,2026-10 落库,协议 B)。通过服务端 HTTP 页面预览 `.html`/`.htm` 文件——服务端零依赖、无缩略图,仅声明 viewer + 客户端注册脚本。

## 约定

- 协议 B:`init(inst)` 调 `registerFileFormat('mira_html_format', handler)`,`extensions: ['html','htm']`、`mimeTypes: ['text/html']`,**不声明 thumbnailExtensions/thumbnail**(无缩略图)
- viewers:`mira-html`(entry `viewer.html`,priority 20,getQuery 传 `fileId/fileName/fileUrl`)
- `web/index.js` 是客户端注册脚本(IIFE):`context.api.media.registerFileFormat({ getPreviewUrl })` 拼跳 `viewer.html?fileUrl=…&fileName=…&fileId=…`(pluginBaseUrl 从 `<script src>` 解析,仅支持 http(s) fileUrl,否则返回空串不启用)
- 服务端零依赖(devDependencies 仅 @types/node + typescript);`main: dist/index.js`(tsc 构建);`npm test` = build + `test.js`
- server 运行时注册表默认 enabled=true,path 回指仓库 `../../../../plugins/plugins/mira_html_format`

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口,51 行:纯 viewer 声明 |
| `web/viewer.html` | HTML 预览页(72 行,iframe 渲染 fileUrl) |
| `web/index.js` + `web/plugin.json` | 客户端格式注册脚本与 manifest(pluginId `7436113a-…`,permissions `["ui","dom"]`,含 `serverPluginName` 关联字段) |
| `test.js` / `README.md` | 自测脚本与说明 |

## 扫描状态

- **更新时间**: 2026-11-21(首建文档,基线 bc638a73 后新增)
- **已扫描**: index.ts 全文、web/index.js 全文、双注册表条目
- **未深扫**: web/viewer.html 内部实现
