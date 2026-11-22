# mira_font_format

字体格式插件(v1.0.0,2026-10 落库,协议 B)。支持 TTF/OTF/WOFF/WOFF2/TTC 的元数据解析、缩略图生成与交互式预览;带 runtime npm 依赖 `fontkit` + `sharp`。

## 约定

- 协议 B:`init(inst)` 调 `registerFileFormat('mira_font_format', handler)`,`extensions`/`thumbnailExtensions` 均为 `['ttf','otf','woff','woff2','ttc']`
- `process(filePath)` 返回元数据:`format`/`size`/`familyName`/`subfamilyName`/`postscriptName`/`fullName`/`glyphCount`/`unitsPerEm`/`variationAxes`(fontkit 解析,TTC 集合取第一个字型)
- `thumbnail(src,dest)`:fontkit `layout` 排版样本字符(偏好 `Aa`/`字体`/`12`/`!?`,按 `hasGlyphForCodePoint` 回退 characterSet)→ 拼成 SVG glyph path(512×512,自适应缩放居中,底部标注 familyName)→ `sharp` 转 PNG
- viewers:`mira-font-preview`(entry `viewer.html`,priority 20,getQuery 传 `fileId/fileName/format/fileUrl`)
- `web/index.js` 是客户端注册脚本(IIFE):`context.api.media.registerFileFormat({ getPreviewUrl })` 把文件拼成 `viewer.html?fileUrl=…` 跳转预览,服务端 origin 从 `<script src>` 地址解析(仅支持 http(s) fileUrl)
- 依赖:`fontkit ^2.0.4`(CJS require)、`sharp ^0.35.4`;`main: dist/index.js`(tsc 构建);`npm test` = build + `test.js`
- server 运行时注册表默认 enabled=true,path 回指仓库 `../../../../plugins/plugins/mira_font_format`

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口,145 行:注册/元数据/缩略图 |
| `web/viewer.html` | 交互式字体预览页(135 行) |
| `web/index.js` + `web/plugin.json` | 客户端格式注册脚本与 manifest(pluginId `39e18010-…`,permissions `["media"]`) |
| `test.js` / `README.md` | 自测脚本与说明 |
| `package.json` | 依赖与 mira meta |

## 扫描状态

- **更新时间**: 2026-11-21(首建文档,基线 bc638a73 后新增)
- **已扫描**: index.ts 全文、web/index.js 全文、双注册表条目
- **未深扫**: web/viewer.html 渲染细节
