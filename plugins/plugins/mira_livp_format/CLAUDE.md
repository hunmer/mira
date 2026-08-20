# mira_livp_format

LIVP（iPhone Live Photo）格式插件（协议 B）。把 .livp（实为 zip：JPEG+MOV）解包为 photo.png/video.mp4 提供缩略图与 extraFiles，viewer 同屏循环播放图+视频。

## 约定

- `registerFileFormat`：extensions `livp`，MIME `application/x-livp`，thumbnailExtensions `livp`
- `LivpBundleCache`（livpBundle.ts）解包并缓存到 server 数据目录 `temp/livp`；process 返回宽高/图片视频格式/extraFiles
- `thumbnail`：photo.png → sharp 400 PNG
- `getExtraFileList`/`getExtraFile`：暴露 photo.png、video.mp4 等解包产物
- viewer `mira-livp`：entry `viewer.html`、priority 20，query 注入 imageUrl/videoUrl/fileName/fileId
- web/index.js 客户端注册同名格式，getPreviewUrl 经 `api.media.getExtraFileList/Url` 取解包资源；pluginId `8fbfb659-…`
- 构建命令：`npm run build`（tsc，无 test 脚本）；依赖 sharp、yauzl

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（78 行） |
| `livpBundle.ts` | LIVP 解包与缓存 |
| `web/viewer.html` | Live Photo 播放页 |
| `web/plugin.json` | 客户端 manifest（priority 20） |

## 扫描状态

- 版本：1.0.0
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、web/index.js 头部
- 未扫描：livpBundle.ts、viewer.html 播放细节
