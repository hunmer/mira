# mira_format_converter 交接文档

格式转换插件：调用服务器本地 ImageMagick / FFmpeg，批量转换图片/视频/音频格式，产物作为新文件入库（copy，原文件不动，可选继承文件夹与标签），支持转换完成后删除源文件（回收站语义）。

接口契约、格式矩阵、二进制定位顺序见 [README.md](./README.md)，此处只记录 README 未覆盖的实现约束与操作流程。

## 目录结构与构建

```
mira_format_converter/
  index.ts            # 服务端入口（tsc → dist/index.js）
  web/                # 客户端插件（plugin.json + index.js + dist SPA + src 源码）
```

构建流程（两层依赖，**安装方式不同**，这是最容易踩的坑）：

```bash
# 服务端：插件根目录不是 pnpm workspace 包（workspace 只含 plugins/plugins/*/web），必须隔离安装
cd plugins/plugins/mira_format_converter
pnpm install --ignore-workspace
pnpm build                                  # tsc → dist/

# 客户端 SPA：web/ 是 workspace 包
cd web
pnpm install
pnpm build                                  # vite → web/dist/
```

SPA 消费 mira-plugin-ui 遵循源码消费约定（alias + `@source` + token），详见 `docs/plugin-ui-source-consumption.md`；vite/tailwind/tsconfig 配置直接参照 `plugins/plugins/mira_image_cropper/web/`（本插件已复制同款配置）。

## 注册位置（两处，缺一不生效）

| 文件 | 作用 |
|------|------|
| `plugins/plugins/plugins.json` | 仓库源插件注册表（配置了 `pluginsDir` 的库用） |
| `packages/mira-app-server/src/plugins/plugins.json` | **开发服务器实际运行时注册表**，条目以相对路径 `"path": "../../../../plugins/plugins/mira_format_converter"` 指回仓库插件目录 |

改服务端代码后：`pnpm build` + 重启服务器（procm-mcp，进程 id 见 `pnpm run dev:server` 对应条目，group=mira_typescript）。SPA 构建产物由 server 直接托管磁盘文件，**改 SPA 无需重启**，重开插件窗口即可。

## 服务端关键实现约束（不可省略，省略即坏）

1. **事件双通道广播**：入库/删除后必须同时调 `wsServer.broadcastPluginEvent` 和 `wsServer.broadcastLibraryEvent`（`pluginManager.server` 即 MiraWebsocketServer）：
   - `broadcastPluginEvent('file::created', { message: {type:'file',action:'create'}, result: 文件记录, libraryId })` → 触发服务端 eventManager（缩略图生成挂在这里）；
   - `broadcastLibraryEvent(libraryId, 'file::created', 记录)` → WebSocket 推客户端刷新列表。
   只调后者会跳过缩略图生成。hash 去重命中（duplicate）时不广播。
2. **便携版 ImageMagick**：Mira runtime-deps 的 magick 无注册表项，执行时必须注入 `MAGICK_CODER_MODULE_PATH=<exe目录>/modules/coders`（`magickEnv()` 已实现，勿删）。
3. **ffmpeg 滤镜图逗号转义**：`min(320,iw)` 中的逗号必须写成 `min(320\,iw)`，否则被滤镜图解析器当分隔符（`ffmpegScaleFilter()`）。
4. **文件信息以库记录为准**：客户端可只传 `fileId`，执行时经 `dbService.getFile()` 取 `name/title` 推导扩展名/类别，不得信任请求体里的 name 做分类。
5. **路由按 libraryId 匹配**：所有接口调用必须带 libraryId（GET query / POST body），SPA 侧 `apiGet/apiPost` 已自动附加；libraryId 兜底链 = 窗口 query → 右键菜单序列化的 media 首项。
6. **缩略图 URL**：`FileInfo.thumbnailPath` 是服务器本地路径，盘符会被 `new URL()` 解析成 scheme → 浏览器映射 file:// 被拦截。SPA 一律用 `/api/files/thumb/<lib>/<id>?token=` 直链。
7. 入库用 `dbService.createFileFromPath(temp, { folder_id }, { importType: 'copy' })`；删除用 `deleteFile(id, { moveToRecycleBin: true })`，事件 payload 对齐 `packages/mira-app-server/src/routes/FileRoutes.ts` 的格式。

## 任务模型

- 内存 Map + 串行 Promise 队列；单文件失败继续下一个；完成 30 分钟后 GC。
- ffmpeg 用 `-progress pipe:1` 解析实时百分比（时长取 stderr 的 Duration 行）；图片无中间进度。
- 转换执行流：`getFile` → 补全 name/ext/category → 校验目标格式合法（图片→图片格式；视频→视频+gif；音频→音频）→ `getItemFilePath`（URL 引用素材报错）→ 执行转换 → copy 入库 → 继承标签（`setFileTags`）→ 双广播。

## 验证方式（CLI 已封装鉴权）

```bash
cd packages/mira-app-server
npx ts-node src/cli.ts login -u admin -p admin123 -s http://127.0.0.1:8081   # 刷新 ~/.mira/credentials.json 的 token
npx ts-node src/cli.ts --json files list <libraryId>                          # 查文件/产物
npx ts-node src/cli.ts files delete <lib> <id> --permanent                    # 清理测试产物
# 接口 curl：token 取 credentials.json profiles.default.token，query 带 libraryId
```

开发库 id：`1786154864241`（默认素材库，路径 `C:/Users/Administrator/AppData/Roaming/mira-web/mira-app-server/default-library`）；game 库 `1786449614842`。缩略图验证：查 `library_data.db` 的 `thumb` 列 + `thumbs/<id>.png`。

## Suggested skills

- **procm-mcp**：服务端代码变更后重启 dev server、读日志确认插件注册（grep `format-converter`）。
- **mira-cli**：登录刷 token、查库文件、清理测试产物，避免手写 curl。
- **mira-format-plugin-migration**：涉及宿主路由行为对齐（事件 payload、删除语义）时参考现有格式插件的实现约定。
- **mira-sdk-coverage-audit**：若后续要把本插件接口纳入 SDK 覆盖审计时使用。

## 已知边界 / 后续方向

- 超短视频（<2s）转码进度可能直接从 0 跳 100（时长解析与完成竞速），仅展示层观感问题。
- 目标格式未按服务器编码器实际能力置灰（如缺 libvpx 时 webm 转换中才报错）。
- 无「彻底删除（不进回收站）」选项；删除接口当前固定回收站语义。
- `mira_image_cropper` 的入库未做双通道广播（缩略图同样缺失），如需修复用同一修法。
