[根目录](../../../CLAUDE.md) > [plugins](../../CLAUDE.md) > [plugins](..) > **mira_thumb**

# mira_thumb

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 初始化 | 深度扫描后生成模块文档 |

## 模块职责

缩略图生成插件。使用 ffmpeg 为图片和视频自动生成缩略图，提供批量扫描和管理功能。

核心功能：
- 文件创建时自动生成缩略图
- 文件删除时自动清理缩略图
- 支持图片格式：jpg/jpeg/png/gif/bmp/webp
- 支持视频格式：mp4/mov/avi/mkv/flv/webm
- Queue 并发控制（concurrency: 5）
- 批量扫描待处理文件

## 入口与启动

- **入口文件**: `index.ts` -- 导出 `init(inst): ThumbPlugin` 工厂函数
- 由 `ServerPluginManager` 在素材库加载时自动实例化
- 初始化时检查 ffmpeg 是否可用（`FFMPEG_PATH` 环境变量或 PATH）

## 对外接口

### HTTP 路由

| 路径 | 方法 | 说明 |
|------|------|------|
| `/thumb/scan` | GET | 开始扫描并生成缺失缩略图 |
| `/thumb/progress` | GET | 查询当前处理进度 |
| `/thumb/cancel` | GET | 取消正在进行的缩略图生成任务 |
| `/thumb/stats` | GET | 获取缩略图统计信息 |

### 事件监听

| 事件 | 说明 |
|------|------|
| `file::created` | 新文件创建时自动生成缩略图 |
| `file::deleted` | 文件删除时清理缩略图 |

### 事件广播

| 事件 | 说明 |
|------|------|
| `thumbnail::generated` | 缩略图生成完成 |

### 前端路由

| 路径 | 组件 | 权限 |
|------|------|------|
| `/media/thumbnails` | ThumbnailManager | super, admin, user |

## 关键依赖与配置

- `fluent-ffmpeg`: ffmpeg Node.js 绑定
- `queue`: 任务队列管理
- `which`: 查找 ffmpeg 可执行文件
- 环境变量：`FFMPEG_PATH` 可指定 ffmpeg 路径

## 常见问题 (FAQ)

**Q: 缩略图生成失败怎么办？**
A: 检查 ffmpeg 是否已安装并在 PATH 中，或设置 `FFMPEG_PATH` 环境变量。

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `index.ts` | 插件主实现 (331 行) |
| `package.json` | 包配置 (v1.0.19) |
