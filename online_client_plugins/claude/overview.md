# online_client_plugins — 架构总览

## 机制

- 本目录是**客户端插件市场的源**：静态 HTTP 提供内容（开发期用 `--serve` 起本地 8080 服务，生产可挂任意静态托管）
- 客户端（mira-client 插件系统）拉取 `plugins.json` → 用户选择安装 → 按索引下载整目录到本地插件安装目录 → 经 plugin.json 元数据加载
- `plugins.json` 由 `scripts/build-client-plugins-index.mjs` 扫描 `plugins/` 生成：每插件含 pluginId(UUID)、size、整目录 sha256、逐文件 sha256、files 列表、generatedAt

## 与服务端插件体系的关系

- **服务端插件**在 `plugins/plugins/`（ServerPluginManager 加载，双协议），部分含 `web/` 客户端预览
- **本仓库是纯客户端插件**：运行在 mira-client 的插件运行时里（Tab、窗口、UI、事件），不占服务端
- 两者在 `mira_image_cropper` 等形态上开始融合：服务端插件 + `web/` SPA + 市场分发
- 原 3D/Spine/PSD 三个「格式预览」在线插件与 `plugins/plugins/` 下同名服务端插件的 `web/` 预览能力重叠，2026-08-24 已从市场撤下（服务端 `web/` 仍在）

## 规模

- git 跟踪 5 个插件目录，索引收录 **5 个**（generatedAt 2026-08-24T11:21:06Z）
- 磁盘另有 4 个仅剩 node_modules 的空壳目录（3d/spine/psd/pinterest-v2，git 已移除）
