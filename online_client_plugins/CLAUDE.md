# online_client_plugins

Mira **客户端插件市场源仓库**：以静态 HTTP 形式对外提供插件内容，客户端（mira-client）拉取根 `plugins.json` 索引后按需下载插件到本地加载。当前索引收录 **5 个插件**（2026-08-24 起代表性插件：视频剪辑器、以图搜图、自由白板、两个 Demo；3D/Spine/PSD 格式预览与 Pinterest v2 已于 08-24 撤下）。

索引由仓库根 `scripts/build-client-plugins-index.mjs` 自动生成（含整目录与逐文件 sha256、原子写入），不是手写文件。

## 约定的规则

- 每个插件目录必须含 `plugin.json`（`pluginName`/`pluginId`(UUID)/`version`）+ `index.js`，否则不进索引
- 重新生成索引：`pnpm run build:client-plugins-index`；开发服务：`pnpm run dev:client-plugins`（watch + `--serve` 8080 端口带 CORS 静态服务）
- `--sync <installDir>` 可按整目录 checksum 增量同步到本地安装目录
- 视频剪辑器类插件依赖宿主 `mira-client` 的 `PluginExecHandlers` 受控执行白名单（ffmpeg/ffprobe/scenedetect），不要在插件里自行调用系统命令
- 索引 `generatedAt` 更新时间即上次构建时间；CI 下索引过期会以非零码退出
- 磁盘上 `mira-3d-format-preview`/`mira-spine-format-preview`/`psd-viewer`/`mira-pinterest-search-v2` 四个目录只剩 node_modules 空壳（git 已不跟踪），勿当成有效插件

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 市场机制、与客户端插件体系的关系 | 首次了解 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 5 个插件逐个职责 + video-editor 深扫 | 定位插件 |
| [claude/entrypoints.md](claude/entrypoints.md) | 索引构建脚本与参数 | 发布/调试索引 |
| [claude/file-map.md](claude/file-map.md) | 目录结构 | 找文件 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 | 看更新历史 |

## 扫描状态

- **更新时间**: 2026-08-25（增量，上次 2026-08-23 首建）
- **已扫描**: plugins.json 索引全文、5 个在册插件 plugin.json/package.json、mira-video-editor 全目录深扫（61 文件约 1.3 万行）、08-23 以来 git 变更聚合
- **重大变化**: 08-24 提交 6407b4ff 整体删除 mira-3d-format-preview（48 文件）/mira-spine-format-preview（49）/psd-viewer（31）/pinterest-v2 dist，索引 8→5；其余 5 个插件零变更
- **下一步建议**: image-search 与 mira-whiteboard 仅清点未深扫；索引中 video-editor/image-search 的 dist/assets 尚未构建（磁盘无产物），发布前需重跑构建与索引
