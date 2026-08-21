# mira_format_converter 格式转换

调用服务器本地 **ImageMagick / FFmpeg** 批量转换图片、视频、音频格式，转换结果作为新文件保存回素材库（原文件不动，可选继承原文件夹与标签）。

## 结构

```
mira_format_converter/
  index.ts            # 服务端：能力探测 + 异步转换任务 + 轮询接口（tsc 编译到 dist/）
  web/                # 客户端插件（服务端启用后自动分发给 Mira 客户端）
    index.js          # 宿主脚本：右键菜单「格式转换」+ 右侧栏入口 → 打开插件窗口
    dist/             # SPA 构建产物（vite build）
    src/              # SPA 源码（mira-plugin-ui 源码消费，见 docs/plugin-ui-source-consumption.md）
```

## 服务端 HTTP 接口（均需 Authorization Bearer token）

| 接口 | 说明 |
|------|------|
| `GET /api/format-converter/capabilities` | 探测 ffmpeg/imagemagick 可用性与版本，返回各类支持的目标格式 |
| `POST /api/format-converter/convert` | `{ files: [{fileId}], target, quality?, scale?, inheritMeta? }` → `{ taskId }` |
| `GET /api/format-converter/status?taskId=` | 任务进度：每文件状态（pending/running/importing/done/error）与百分比 |

- `quality`: `high / medium / low`（图片 → -quality 95/80/60；H.264 → crf 18/23/28；音频 → 256k/192k/128k）
- `scale`: `'none' | {percent: 50} | {width: 1920}`（只缩不放）
- 任务在服务端内存中**串行执行**，完成 30 分钟后回收；单文件失败不影响其余文件。

## 二进制定位

1. 环境变量 `FFMPEG_PATH` / `IMAGEMAGICK_PATH`
2. ffmpeg 回退宿主 `thumbnailService.ffmpegPath`
3. 最后尝试 PATH 中的 `magick` / `convert` / `ffmpeg`

缺失时插件可用但对应类别转换报错（窗口头部有红绿徽章提示）。

## 格式矩阵

| 源类别 | 目标格式 | 引擎 |
|--------|----------|------|
| 图片 | png jpg webp gif bmp tiff avif heic | ImageMagick |
| 视频 | mp4 webm mov avi mkv gif | FFmpeg（gif 为 palettegen/paletteuse 单遍） |
| 音频 | mp3 wav flac aac m4a ogg | FFmpeg |

## 开发

```bash
# 服务端：编译 index.ts → dist/
pnpm build
# 客户端 SPA：安装 + 构建（产物 web/dist/，服务端 /server-plugins/... 直接托管磁盘文件）
cd web && pnpm install && pnpm build
```
