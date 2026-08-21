# HANDOFF — 视频剪辑器插件（mira-video-editor）迁移

> 交接文档：供新会话/新 agent 继续本项目。生成于 2026-08-21。
> 注意：本文件位于插件目录内，会被市场索引（`online_client_plugins/plugins.json`）打包分发；正式发布前可删除并重跑索引脚本。

## 1. 任务背景

将 `D:/programming/ai_tool_boxs/ai-toolbox` 中的 `src/components/tools/VideoEditor`（约 1.15 万行 Vue 视频编辑器）迁移为 Mira 的客户端插件【视频剪辑器】，保留全部功能，UI 使用 shadcn-vue。依据 `D:\mira_typescript\docs\client-plugin-architecture.md`。

## 2. 用户确认的关键决策（勿推翻）

| 决策点 | 结论 |
|--------|------|
| 后端能力归属 | **扩展 Electron 宿主**（受控 spawn + 文件原语），**不做服务端插件** |
| 场景检测 | **仅 PySceneDetect**（用户自装，插件设置里配路径） |
| 导出去向 | **浏览器下载 + 保存到素材库**（多选） |
| 数据持久化 | 插件窗口 localStorage 单通道；原版 ai-toolbox-server 的"服务器列表"通道删除 |
| 死代码 | ClipToolPanel.vue/.css、composables/useContextMenu.ts、styles/ 目录不迁移 |

## 3. 已完成（全部已落地并通过构建）

- **宿主扩展（packages/mira-client）**
  - 新增 `src/main/ipc/PluginExecHandlers.ts`：白名单 spawn（ffmpeg/ffprobe/scenedetect）、二进制路径解析（`userData/plugin-exec.json` > env `FFMPEG_PATH/FFPROBE_PATH/SCENEDETECT_PATH` > PATH）、流式输出 `plugin-exec:output/exit` 事件、`plugin-fs:get-temp-dir/read-dir/read-file/stat/remove`（remove 限定 `userData/plugin-temp` 树内）
  - `src/preload/plugin-window-preload.js`：暴露 `window.mira.exec`（run/abort/check/setBinaryPath/getBinaryPaths/onOutput/onExit）与 `mira.fs`（getPathForFile 用 webUtils/getTempDir/readDir/readFile/stat/remove）
  - `src/main/ipc/handlers.ts`：实例化、registerHandlers、cleanup 均已接线
- **插件（online_client_plugins/plugins/mira-video-editor/）**
  - pluginId `8de28d11-49d2-455e-ae21-bb77edab23a6`；`pnpm build` 成功（vite，inlineDynamicImports、base './'）
  - 市场索引已重建（`node scripts/build-client-plugins-index.mjs`，根目录 `online_client_plugins/plugins.json`，共 8 个插件）

详细功能清单、工具前置要求、架构说明见本目录 `README.md`（勿在此重复）。

## 4. 代码地图（改造后的调用链）

```
宿主 index.js            右键菜单/贡献 → openPluginWindow(query.media) / pluginWindow.send('media:add')
src/App.vue              主题跟随、?media= 导入、media:add 增量导入、Toaster、设置入口(⚙)
src/components/index.vue 原版入口组件（拖放/面板布局/六 Tab）
src/lib/
  host.ts                getHost()/isHostAvailable()/resolveVideoSrc()，window.mira 访问桥
  exec.ts                runCommand(Promise 化+输出订阅+AbortSignal)、getTempDir/readDir/readTextFile/removeTempPath
  ffmpeg.ts              全部 ffmpeg/scenedetect 命令构建与解析（迁移自原主进程 useVideoEditor.ts + useSceneDetect.ts）
  videoEditorApi.ts      原版 API 的本地化替身（列表/片段→localStorage；场景/导出→lib/ffmpeg）
  download.ts            downloadToLocalFile（readFile→blob→a[download]）、saveToLibrary（addFromURL(file://)）
  settings.ts            localStorage 配置 + 二进制路径透传
  path.ts                浏览器版 path 工具（pathJoin/toFileUrl/fromFileUrl/sanitizeFileName）
  localVideoStorage.ts   列表存储（key 前缀 mira-video-editor:）
src/components/ui/       本地补齐：checkbox、switch、alert-dialog（Cancel/Action 从 ai-toolbox 拷，其余 re-export mira-plugin-ui）
```

关键替换模式（后续改动的同志按此对齐）：
- `electronAPI.videoEditor.*` → `lib/ffmpeg.ts` 对应函数
- `local-resource://` → `file://`（经 `toFileUrl`/`fromFileUrl`/`resolveVideoSrc`）
- `electronAPI.file.getTempSubDir/readDir` → `lib/exec.ts` 的 `getTempDir/readDir`
- `electronAPI.getConfig().videoEditor` → `lib/settings.ts` 的 `loadSettings()`
- localStorage key 一律 `mira-video-editor:` 前缀

## 5. 遗留风险 / 未验证项（优先处理）

1. **未做真机验收**：所有功能仅通过静态构建，未在 Electron 客户端里实际运行过。验收清单见 `README.md` 与下方第 7 节。
2. **saveToLibrary 走 `mira.item.addFromURL('file:///...')`**：主窗口链路对 file:// 的兼容性未验证；若失败改用宿主 index.js 侧 `pluginWindow.onMessage('media:save-to-library')` + `api.media.setLocalFiles` 兜底（链路已存在于宿主 preload 的 send/onMessage）。
3. **mira-client `pnpm build:main` 失败是既存环境问题**（`@hunmer/procm-mcp-sdk` 未安装，tsc 同报缺失），与本次改动无关；`electron:dev` 不受影响。勿误判为回归。
4. `icon.png` 是 image-search 的占位图标。
5. 场景检测灵敏度参数当前沿用 PySceneDetect 默认阈值（与原版一致），未接 `-t` 阈值映射。
6. `readFile` 下载上限 500MB（宿主侧限制），超大导出文件下载会失败。

## 6. 构建与索引命令

```powershell
cd D:/mira_typescript/online_client_plugins/plugins/mira-video-editor
pnpm install; pnpm build            # 产物 dist/
cd D:/mira_typescript
node scripts/build-client-plugins-index.mjs    # 重建市场索引（含 sha256 清单）
# 带静态服务调试市场安装：node scripts/build-client-plugins-index.mjs --serve（8080，CORS）
```

宿主类型检查：`cd packages/mira-client && npx tsc --noEmit -p tsconfig.json`（项目存在既存错误，只需关注自己文件的报错）。

## 7. 下一步建议

1. 真机验收：安装插件 → 右键视频发送 → 播放/剪辑/封面/逐秒缩略图/场景分割/水印/导出（下载与素材库两种去向）
2. 验证并修复 saveToLibrary 的 file:// 链路（如需）
3. 替换 icon.png 后重跑索引
4. 可选：灵敏度阈值映射、readFile 分块下载

## 8. Suggested skills

- `superpowers:verification-before-completion` — 声称功能可用前先跑验收清单
- `superpowers:systematic-debugging` — 真机验收发现问题时按流程定位（宿主 IPC ↔ 插件窗口两层日志：主进程 logger + F12 DevTools console）
- `mira-cli` — 操作 Mira 服务端/素材库（验证"保存到素材库"产物时用）
- `procm-mcp` — 需要启动/重启本地 mira-app-server 时使用
