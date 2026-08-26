# online_client_plugins — 插件清单

## 在册插件（5 个）

| 目录 | 名称/版本 | 职责 |
|---|---|---|
| mira-video-editor | 视频剪辑器 v1.0.0 | 片段剪辑、PySceneDetect 场景分割、delogo 去水印、批量导出（市场内最大插件，详见下节） |
| image-search | 图片搜索 v3.0.0 | 以图搜图聚合：Pinterest + Google/Bing/Yandex/TinEye/SauceNAO/搜狗，webview 内嵌 |
| mira-whiteboard | 自由白板 v1.0.0 | @woven-canvas/vue 无限画板，工程管理 + 独立窗口 + 本地持久化 |
| mira-custom-tab-demo | 自定义 Tab Demo v1.0.0 | 演示注册自定义 Tab + DOM 回调渲染 |
| mira-welcome-demo | 欢迎示例插件 v1.0.0 | 演示配置/事件/UI/日志基本能力 |

## mira-video-editor 深扫（2026-08-25）

- **规模**: 61 文件、约 13249 行（src 约 9802 行），市场内最大；dist 被 gitignore（磁盘当前无构建产物）
- **技术栈**: Vue 3 + Vite 6 + TS + Tailwind 4 + shadcn 风格组件（依赖 `mira-plugin-ui workspace:*`）+ plyr 播放器；@vueuse/core、uuid
- **宿主侧入口 `index.js`**: 注册「window 行为」右侧栏贡献 + 媒体右键菜单「发送到视频剪辑器」（13 种视频扩展名过滤）→ `openPluginWindow`（1360x860，entry `dist/index.html`，视频序列化进 `query.media`）；窗口已开时经 `pluginWindow.send('media:add')` 增量推送
- **六个功能 Tab**: ClipToolTab（片段剪辑：设点/创建/自动封面）、SplitTab（PySceneDetect 场景分割：合并/取消/转片段）、ThumbnailsTab（逐秒缩略图时间轴，Ctrl/Alt 点击设起终点连续切片）、WatermarkTab（delogo 去水印：截图框选归一化区域/预设）、ClipsListTab、ExportClipsDialog（批量导出：命名模板/进度/取消，下载到本机或经 `mira.item.addFromURL('file://...')` 存回素材库）
- **composables**: useVideoEditorState / useClipManagement / useSceneSplit / useThumbnails / useWatermark；lib/: exec、ffmpeg、host、videoEditorApi、download、settings、path、localVideoStorage、toast
- **运行时依赖**: 完全依赖宿主 `PluginExecHandlers`（`plugin-exec:*` 白名单 spawn ffmpeg/ffprobe/scenedetect + `plugin-fs:*` 文件原子操作）与 `plugin-window-preload.js` 暴露的 `window.mira.exec`/`mira.fs`；**不做服务端插件**
- **数据**: 插件窗口 localStorage（key 前缀 `mira-video-editor:`）；产物目录 `userData/plugin-temp/mira-video-editor/`
- **遗留风险**（HANDOFF.md 2026-08-21）: 未真机验收、readFile 500MB 下载上限、icon 为占位图标
- 08-23 以来源码零变更

## 已撤下插件（历史脚注）

| 目录 | 撤下时间 | 说明 |
|---|---|---|
| mira-3d-format-preview | 2026-08-24（6407b4ff） | TresJS + three GLB/GLTF 预览 v1.2.1，48 文件；能力由服务端 mira_3d_format 的 web/ 承接 |
| mira-spine-format-preview | 同上 | Spine 4.2 骨骼动画预览 v1.0.0，49 文件 |
| psd-viewer | 同上 | PSD/PSB 分层预览 v1.0.0，31 文件 |
| mira-pinterest-search-v2 | 2026-08-21 源码删除 / 08-24 dist 清除 | Pinterest 搜索 v2；重写自已删除的 v1 |
