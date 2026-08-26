# online_client_plugins — 文件地图

```text
online_client_plugins/
  CLAUDE.md
  README.md          市场机制与插件规范说明
  plugins.json       索引（自动生成，勿手改）：5 插件 + sha256 + files
  plugins/           git 跟踪 5 个插件目录
    mira-video-editor/      视频剪辑器（市场内最大，61 文件；dist gitignore）
    image-search/           以图搜图聚合 v3
    mira-whiteboard/        自由白板 v1.0.0（唯一磁盘有 dist 的插件）
    mira-custom-tab-demo/   Tab 演示
    mira-welcome-demo/      欢迎演示
  （mira-3d-format-preview/ mira-spine-format-preview/ psd-viewer/
    mira-pinterest-search-v2/ 四个目录只剩 node_modules 空壳，git 已移除）
```

本目录是 pnpm workspace 成员（`online_client_plugins/plugins/*`），各插件可声明依赖。
