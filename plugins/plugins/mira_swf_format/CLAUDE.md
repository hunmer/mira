# mira_swf_format

SWF（Flash）格式插件（协议 B）。服务端读 SWF 头部元数据并用 FFmpeg 抽首帧做缩略图，viewer 用本地打包的 Ruffle 模拟器播放。

## 约定

- `registerFileFormat`：extensions `swf`，MIME `application/x-shockwave-flash`、`application/vnd.adobe.flash.movie`，thumbnailExtensions `swf`
- `process`：读文件头 8 字节，返回签名 FWS/CWS/ZWS → compression none/zlib/lzma、version、declaredSize
- `thumbnail`：FFmpeg `-frames:v 1` 抽帧缩到 200x200；ffmpegPath 来源 `FFMPEG_PATH` → server thumbnailService.ffmpegPath → PATH 中的 ffmpeg；失败删产物仅告警
- viewer `mira-swf-player`：entry `viewer.html`、priority 10，query 注入 fileUrl/fileName/fileId
- web/：`ruffle/` 本地打包（ruffle.js + wasm，Apache/MIT 双许可，见 THIRD_PARTY_NOTICES.md）；pluginId `b2389538-…`
- 构建命令：`npm run build`（tsc）；`npm run test` = build + node test.js；无 npm 运行时依赖
- 导出 `testables = { readSwfHeader }` 供测试

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（105 行）：头部解析 + FFmpeg 缩略图 |
| `web/viewer.html` / `viewer.js` | Ruffle 播放页 |
| `THIRD_PARTY_NOTICES.md` | Ruffle 许可声明 |

## 扫描状态

- 版本：1.0.0
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、ruffle 目录清单
- 未扫描：viewer.js、ruffle 版本细节
