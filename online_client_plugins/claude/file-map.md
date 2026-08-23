# online_client_plugins — 文件地图

```text
online_client_plugins/
  CLAUDE.md
  README.md          市场机制与插件规范说明
  plugins.json       索引（自动生成，勿手改）：8 插件 + sha256 + files
  plugins/           9 个插件目录
    mira-video-editor/       视频剪辑器（市场内最大）
    image-search/            以图搜图聚合 v3
    mira-3d-format-preview/  GLB/GLTF 预览 v1.2.1
    mira-spine-format-preview/ Spine 预览 v1.0.0
    psd-viewer/              PSD 分层预览 v1.0.0
    mira-whiteboard/         自由白板 v1.0.0
    mira-custom-tab-demo/    Tab 演示
    mira-welcome-demo/       欢迎演示
    mira-pinterest-search-v2/ 未收录（无 plugin.json，仅 dist）
```

本目录是 pnpm workspace 成员（`online_client_plugins/plugins/*`），各插件可声明依赖。
