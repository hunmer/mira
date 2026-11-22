# online_client_plugins

Mira **客户端插件市场源仓库**：以静态 HTTP 形式对外提供插件内容，客户端（mira-client）拉取根 `plugins.json` 索引后按需下载插件到本地加载。当前索引收录 **6 个插件**（2026-09-09 新增字体操作；视频剪辑器、以图搜图、自由白板、字体操作 + 两个 Demo；3D/Spine/PSD 格式预览与 Pinterest v2 已于 08-24 撤下）。

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
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 6 个插件逐个职责 + video-editor 深扫 | 定位插件 |
| [claude/entrypoints.md](claude/entrypoints.md) | 索引构建脚本与参数 | 发布/调试索引 |
| [claude/file-map.md](claude/file-map.md) | 目录结构 | 找文件 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 | 看更新历史 |

## 扫描状态

- **更新时间**: 2026-11-21（增量，上次 2026-08-25）
- **已扫描**: plugins.json 索引全文、mira-font-actions 全部 4 文件、08-25 以来 git 变更聚合（3 commits）
- **重大变化**: 09-09 提交 e0545f7e 新增 `mira-font-actions`（字体操作 v1.0.0，minAppVersion **3.0.2**），索引 5→**6**（generatedAt 2026-09-09）；08-29 提交 54672480 移除 image-search/mira-video-editor `index.js` 的 `已初始化` 噪音日志
- **下一步建议**: image-search 与 mira-whiteboard 仅清点未深扫；mira-font-actions 的 dist/index.html 为自包含单文件 UI（未深扫实现细节）
