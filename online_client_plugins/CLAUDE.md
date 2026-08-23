# online_client_plugins

Mira **客户端插件市场源仓库**：以静态 HTTP 形式对外提供插件内容，客户端（mira-client）拉取根 `plugins.json` 索引后按需下载插件到本地加载。当前收录 **8 个插件**（9 个目录，1 个未入索引），代表性插件：视频剪辑器（受控 ffmpeg）、Spine/3D/PSD 格式预览、以图搜图、自由白板。

索引由仓库根 `scripts/build-client-plugins-index.mjs` 自动生成（含整目录与逐文件 sha256、原子写入），不是手写文件。

## 约定的规则

- 每个插件目录必须含 `plugin.json`（`pluginName`/`pluginId`(UUID)/`version`）+ `index.js`，否则不进索引（如 `mira-pinterest-search-v2` 目前只剩 dist 产物）
- 重新生成索引：`pnpm run build:client-plugins-index`；开发服务：`pnpm run dev:client-plugins`（watch + `--serve` 8080 端口带 CORS 静态服务）
- `--sync <installDir>` 可按整目录 checksum 增量同步到本地安装目录
- 视频剪辑器类插件依赖宿主 `mira-client` 的 `PluginExecHandlers` 受控执行白名单（ffmpeg/ffprobe/scenedetect），不要在插件里自行调用系统命令
- 索引 `generatedAt` 更新时间即上次构建时间；CI 下索引过期会以非零码退出

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 市场机制、与客户端插件体系的关系 | 首次了解 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 8+1 个插件逐个职责 | 定位插件 |
| [claude/entrypoints.md](claude/entrypoints.md) | 索引构建脚本与参数 | 发布/调试索引 |
| [claude/file-map.md](claude/file-map.md) | 目录结构 | 找文件 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 | 看更新历史 |

## 扫描状态

- **更新时间**: 2026-08-23（首建文档）
- **已扫描**: README、plugins.json（索引结构）、9 个插件目录的 plugin.json、构建脚本 scripts/build-client-plugins-index.mjs、08-20 以来 git 变更主题
- **跳过**: 各插件 dist 产物与实现体细节（mira-video-editor 107 文件次改动仅清点）
- **下一步建议**: 深扫 `mira-video-editor`（市场内最大插件）与 `mira-pinterest-search-v2` 的收录状态
