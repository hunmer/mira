# psd-viewer 总览

## 职责

- 注册 `.psd` / `.psb` 文件格式和分层查看器
- 使用 `ag-psd` 在浏览器本地解析 PSD 数据
- 提供图层树、图层显隐和合成画布

缩略图由 `mira-app-server` 的 `ThumbnailService` 统一生成，本插件不注册缩略图生成器，也不依赖 ImageMagick。

## 入口

- `index.ts`: 服务端文件格式注册
- `web/index.js`: 客户端插件入口
- `web/src/App.vue`: PSD 查看界面
