# mira_format_converter

图片/视频/音频批量格式转换深度插件(v1.0.0,2026-08-21 新增,默认 enabled)。形态为「服务端异步任务路由 + `web/` SPA」:转换由服务端 `child_process` 调 **ImageMagick(magick/convert)** 与 **FFmpeg** 完成,前端 SPA 展示能力/任务/设置。

## 约定

- 协议 A 深度插件(不 `extends ServerPlugin`),`init(inst)` 经 httpRouter `registerRounter` 注册,`cleanup()` 注销;ROUTE_BASE `/format-converter`
- 4 条路由:`GET /capabilities`(源/目标格式矩阵)、`POST /convert`(异步任务,返回 taskId)、`GET /status?taskId=`、`POST /delete`(删源文件)
- 二进制定位顺序:`FFMPEG_PATH` / `IMAGEMAGICK_PATH` 环境变量 → 宿主 `thumbnailService.ffmpegPath` → PATH
- 任务在**内存中串行**执行;完成产物保留 30 分钟,GC 每 10 分钟回收
- 产物经 `createFileFromPath` 以 **copy** 模式入库;无 runtime npm 依赖
- `web/` SPA 仅依赖 `mira-plugin-ui` + vue(pluginId `f3a9c2e7-...`)

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口,583 行:路由、SOURCE_EXTS/IMAGE_TARGETS/VIDEO_TARGETS 分类、任务队列与 GC、二进制定位 |
| `web/src/App.vue` | SPA 根 |
| `web/src/components/{FileList,HeaderBar,SettingsPanel,TaskPanel}.vue` | 文件列表/顶栏/设置/任务面板 |
| `web/src/lib/{host,i18n,server}.ts` | 宿主桥接/国际化/服务端调用 |
| `web/src/types.ts` | 前端类型 |
| `web/plugin.json` | 客户端插件元数据 |

## 扫描状态

- **更新时间**: 2026-08-25(首建文档)
- **已扫描**: index.ts 全文、web/ 目录结构、package.json、注册表(均 enabled)
- **未深扫**: web/ 各组件实现体、convert 各目标格式的参数细节
