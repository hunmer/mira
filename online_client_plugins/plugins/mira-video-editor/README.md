# 视频剪辑器（mira-video-editor）

迁移自 ai-toolbox VideoEditor 的视频剪辑插件，UI 使用 shadcn-vue（mira-plugin-ui）。

## 功能

- 视频列表管理（localStorage 持久化）、拖放 / 文件选择导入、素材库右键「发送到视频剪辑器」
- plyr 播放器：快捷键（Alt+1/2/4 设点/创建、i/o 标记、滚轮 seek）、片段预览循环
- 片段剪辑：设点 / 创建 / 编辑 / 删除 / 自动封面（ffmpeg 截图）
- 智能场景分割：PySceneDetect 检测、场景合并 / 取消合并、右键导出、场景转片段
- 逐秒缩略图时间轴：Ctrl 点击设起点、Alt 点击设终点并连续切片
- 水印去除：截图框选（归一化区域）、delogo 预览、预设管理、导出自动应用
- 批量导出：命名模板、进度与剩余时间、取消；产物可**下载到本机**或**保存到素材库**

## 前置要求

| 工具 | 用途 | 提供方式 |
|------|------|----------|
| ffmpeg | 导出 / 截图 / 缩略图 | 系统 PATH、环境变量 `FFMPEG_PATH` 或插件设置中选择可执行文件 |
| ffprobe | 元数据 / 视频尺寸 | 同上（`FFPROBE_PATH`） |
| scenedetect | 场景分割 | `pip install scenedetect[opencv]` 后在插件设置中配置路径（`SCENEDETECT_PATH`） |

插件窗口右上角 ⚙ 打开设置，可检测工具可用性并配置路径。

## 架构

```
index.js          宿主侧脚本：右侧栏贡献 + 媒体右键菜单（视频过滤）→ 打开窗口 / 增量推送 media:add
src/              Vue SPA（vite 构建，插件窗口 loadFile 加载）
  lib/exec.ts     宿主受控命令执行（白名单 ffmpeg/ffprobe/scenedetect，流式输出 + abort）
  lib/ffmpeg.ts   ffmpeg/scenedetect 命令构建与结果解析（迁移自原 Electron 主进程模块）
  lib/...         host 桥、路径工具、设置、下载/入库、本地存储、toast
  composables/    useVideoEditorState / useClipManagement / useSceneSplit / useThumbnails / useWatermark
  components/     播放器、侧栏、六个功能 Tab、水印编辑/导出对话框、设置对话框
```

- 宿主能力：`packages/mira-client` 的 `PluginExecHandlers`（`plugin-exec:*` / `plugin-fs:*` IPC）+ `plugin-window-preload.js` 暴露的 `mira.exec` / `mira.fs`
- 数据持久化：插件窗口 localStorage（列表 / 片段 / 水印 / 合并状态 / 导出偏好）
- 产物目录：`userData/plugin-temp/mira-video-editor/`（缩略图、场景缓存、导出文件）

## 开发

```bash
pnpm install
pnpm build          # 产物 dist/，由插件窗口加载
pnpm build:watch    # 监听重建
pnpm dev            # 浏览器调试 UI（本机能力不可用，功能降级）
```

市场索引由仓库根 `scripts/build-client-plugins-index.mjs` 生成。
