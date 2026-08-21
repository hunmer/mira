# 视频剪辑器插件迁移计划

将 `ai-toolbox` 的 VideoEditor（约 1.15 万行）迁移为 mira 客户端插件【视频剪辑器】（`online_client_plugins/plugins/mira-video-editor/`），保留全部功能，UI 使用 shadcn-vue（mira-plugin-ui）。

## 已确认的决策
- **后端能力**：扩展 mira-client Electron 宿主，提供受控 spawn（ffmpeg/ffprobe/scenedetect 白名单）+ 文件原语，不做服务端。
- **场景检测**：仅 PySceneDetect（用户在插件设置中配置 scenedetect 路径）。
- **导出去向**：浏览器下载到本机 + 保存到素材库。
- **数据持久化**：插件窗口 localStorage（原版 localVideoStorage 单通道化，删除 ai-toolbox-server 依赖通道）。

## 一、宿主扩展（packages/mira-client）

### 1. 新增 `src/main/ipc/PluginExecHandlers.ts`
- 白名单命令：`ffmpeg` / `ffprobe` / `scenedetect`；路径解析优先级：`userData/plugin-exec.json` 配置 > 环境变量（FFMPEG_PATH/FFPROBE_PATH/SCENEDETECT_PATH）> 系统 PATH。
- IPC：
  - `exec:run {name, args, jobId, cwd?, timeoutMs?}` → spawn（windowsHide、无 shell、输出上限），流式 `exec:output {jobId, stream, chunk}` 与 `exec:exit {jobId, code}` 事件回插件窗口
  - `exec:abort {jobId}`、`exec:check {name}`（-version 探测）、`exec:setBinaryPath {name, path}`（校验存在且 basename 匹配）、`exec:getBinaryPaths`
  - `plugin-fs:getTempDir {sub?}`（userData/plugin-temp/<pluginId>/，自动创建）、`plugin-fs:readDir`、`plugin-fs:readFile`（上限 500MB，下载用）、`plugin-fs:stat`
- 在 PluginWindowHandlers 注册时实例化，仅响应插件窗口 webContents。

### 2. 扩展 `src/preload/plugin-window-preload.js`
- `window.mira.exec`：run/abort/onOutput/onExit/setBinaryPath/getBinaryPaths/check
- `window.mira.fs`：getPathForFile（webUtils，照抄 floating-ball-preload 先例）/getTempDir/readDir/readFile/stat

### 3. 保存到素材库链路
- 优先 `mira.item.addFromURL('file:///...')`（现有 IPC）；若 file:// 不被主窗口链路支持，兜底走宿主侧 index.js 的 `pluginWindow.onMessage('media:save-to-library')` + `api.media.setLocalFiles`。

## 二、客户端插件（online_client_plugins/plugins/mira-video-editor/）

### 脚手架（照 image-search）
- `plugin.json`：名称"视频剪辑器"、新 UUID、category media、permissions ["ui","window"]
- `index.js`（IIFE）：右侧栏 contribution（material icon `movie`，openPluginWindow 1280×800）+ 媒体右键菜单（视频扩展名过滤，序列化 `{id,name,path:localFile||path,url,metadata,size}` 进 query.media；窗口已开则 `pluginWindow.send` 推 `media:add`）
- `vite.config.ts`：照抄 image-search（alias mira-plugin-ui/src 与 SDK、`base:'./'`、inlineDynamicImports、chrome100）；`tailwind.css`：@source 扫 mira-plugin-ui + oklch tokens + `.dark`

### 前端迁移（从 ai-toolbox 搬运 + 改造）
- `types.ts`：VideoList/VideoData/VideoClip/WatermarkRegion/SceneSegment 等
- `lib/ffmpeg.ts`（新，核心）：把原版主进程 `useVideoEditor.ts`（导出/截图/逐秒缩略图/delogo 预览/质量映射/WebM 转码）与 `useSceneDetect.ts`（scenedetect 命令、CSV 发现与解析、minSceneDuration 过滤、save-images 缩略图匹配）的**命令构建与输出解析逻辑搬到前端**，经 lib/exec 执行
- `lib/exec.ts`：mira.exec 的 Promise 化封装（jobId、输出流订阅、abort）
- `lib/serverBridge.ts`：mira.fs 封装、toFileUrl（Windows 盘符）、下载（readFile→blob→a[download]）、保存到素材库
- `lib/settings.ts` + 设置 UI：ffmpeg/scenedetect 路径（file input + getPathForFile + setBinaryPath）、check 可用性、默认导出格式/质量（localStorage）
- `lib/localVideoStorage.ts`、`lib/toast.ts`（vue-sonner，App.vue 挂 Toaster）：原样搬
- `composables/`：useVideoEditorState/useClipManagement/useSceneSplit/useThumbnails/useWatermark 原样搬，替换调用点：`electronAPI.videoEditor.*`→lib/ffmpeg；`getTempSubDir/readDir`→mira.fs；`invoke('split-video-scenes' 等)`→lib/ffmpeg；`getConfig().videoEditor`→lib/settings；`local-resource://`→`file://`；`isLocalVideoList` 恒为本地通道
- `components/`：VideoPlayer/VideoListSidebar/ClipToolTab/ClipsListTab/SplitTab/ThumbnailsTab/WatermarkTab/WatermarkEditDialog/ExportClipsDialog/SceneContextMenu 原样搬；shadcn 组件 import 换 `mira-plugin-ui/src/components/ui/*`；缺失的 checkbox/switch 从 ai-toolbox 拷 shadcn 封装（reka-ui 原语 + cva）放插件 `src/components/ui/`
- 死代码不迁：ClipToolPanel.vue/.css、composables/useContextMenu.ts、styles/ 目录
- 样式：scoped CSS 原样保留 + `src/styles/variables.css` 桥接层（--color-* → shadcn token，.dark 覆盖），主题跟随宿主（onThemeChanged）
- localStorage keys 统一加 `video-editor:` 前缀；导出目录选择改为"下载/存素材库"按钮（原系统保存对话框不适用）

## 三、构建与索引
- 插件 `pnpm build` 产 dist；根目录跑 `scripts/build-client-plugins-index.mjs` 重建 plugins.json（含 README.md/icon.png）

## 任务顺序
1. 宿主：PluginExecHandlers + preload 扩展 + 入库链路
2. 插件脚手架（plugin.json/index.js/vite/tailwind/main/App）
3. lib 层（types/ffmpeg/exec/serverBridge/toast/settings/localVideoStorage）
4. composables 迁移改造
5. components 迁移改造（10 个）
6. 设置 UI + 下载/入库按钮
7. 构建索引

## 验收标准
1. 客户端安装插件后右侧栏出现"视频剪辑器"，右键视频 →"发送到视频剪辑器"→ 窗口载入并播放
2. 拖放/文件选择导入本地视频（getPathForFile 零拷贝）
3. 片段剪辑：设点/创建/封面生成/批量导出（下载 + 存素材库）
4. 智能分割：配置 scenedetect 后场景网格/合并/取消合并/导出
5. 水印：框选/delogo 预览/预设/导出去水印片段
6. 逐秒缩略图：加载/Ctrl-Alt 快捷切片/滚动续切

## 风险与说明
- `addFromURL(file://)` 兼容性未验证 → setLocalFiles 兜底
- readFile 大文件下载有内存压力（上限 500MB）
- PySceneDetect 需用户自装，设置页提供检测与引导
- 原版"服务器列表"通道（依赖 ai-toolbox-server）按决策不迁移，统一本地存储