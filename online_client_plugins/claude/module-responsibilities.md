# online_client_plugins — 插件清单

| 目录 | 名称/版本 | 职责 |
|---|---|---|
| mira-video-editor | 视频剪辑器 v1.0.0 | 片段剪辑、PySceneDetect 场景分割、delogo 去水印、批量导出；基于宿主 PluginExecHandlers 受控 ffmpeg/scenedetect（市场内最大插件） |
| image-search | 图片搜索 v3.0.0 | 以图搜图聚合：Pinterest + Google/Bing/Yandex/TinEye/SauceNAO/搜狗，webview 内嵌 |
| mira-3d-format-preview | 3D 格式预览 v1.2.1 | GLB/GLTF 可交互 3D 线框缩略图与详情 |
| mira-spine-format-preview | Spine 格式预览 v1.0.0 | Spine 4.2 骨骼动画预览/皮肤/动画切换 |
| psd-viewer | PSD 分层预览 v1.0.0 | .psd/.psb 浏览器本地分层预览 |
| mira-whiteboard | 自由白板 v1.0.0 | @woven-canvas/vue 无限画板，工程管理 + 独立窗口 + 本地持久化 |
| mira-custom-tab-demo | 自定义 Tab Demo v1.0.0 | 演示注册自定义 Tab + DOM 回调渲染 |
| mira-welcome-demo | 欢迎示例插件 v1.0.0 | 演示配置/事件/UI/日志基本能力 |
| mira-pinterest-search-v2 | （未收录） | Pinterest 搜索 v2，重写自 v1；目前无 plugin.json，仅 dist 产物被跟踪，未进索引 |

> 前 8 个收录于 `plugins.json` 索引；格式预览类插件与 `plugins/plugins/` 下同名服务端格式插件的 `web/` 预览存在能力重叠但分发渠道不同。
