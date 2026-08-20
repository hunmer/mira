# mira_lottie_format

dotLottie 格式插件（协议 B）。服务端用 @lottiefiles/dotlottie-web + @napi-rs/canvas 离屏渲染动画第 50% 帧生成缩略图，viewer 用本地 dotlottie-player web component 循环播放。

## 约定

- `registerFileFormat`：extensions `lottie`，MIME `application/zip+dotlottie`、`application/x-lottie`，thumbnailExtensions `lottie`
- `process`：读 manifest.json + 首个动画 JSON，返回 version/author/animationCount/width/height/frameRate/duration
- `thumbnail`：包内图片资源 inline 成 data: URI 后离屏渲染 PNG；WASM 以 base64 data URL 注入（`DotLottie.setWasmUrl`，仅一次）
- ZIP 安全限制：500 条 / 单条 64MB / 总量 512MB / 捕获资源 128MB，条目名防逃逸
- viewer `mira-lottie`：entry `viewer.html`、priority 20，query 注入 fileUrl/fileName/fileId
- web/：viewer.html + vendor/dotlottie-player.js；pluginId `45b1903a-…`，priority 20
- 构建命令：`npm run build`（tsc）；`npm run test` = build + node test/smoke-test.js（devDep yazl 用于测试造包）
- 依赖：@lottiefiles/dotlottie-web、@napi-rs/canvas、yauzl

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（297 行）：ZIP 读取、元数据、离屏渲染 |
| `web/viewer.html` | dotlottie-player 播放页 |
| `test/smoke-test.js` | 冒烟测试 |

## 扫描状态

- 版本：1.0.0
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、viewer.html 引用
- 未扫描：test/ 实现、vendor 播放器版本
