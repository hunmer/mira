# 文件清单

## 配置文件

| 文件 | 说明 |
|------|------|
| `plugins/plugins.json` | 插件注册配置 (7 个条目) |
| `plugins/librarys.json` | 库配置 |

## 活跃插件

### mira_n8n (v1.0.7)

| 文件 | 说明 |
|------|------|
| `plugins/mira_n8n/index.ts` | 插件主实现 (290 行) |
| `plugins/mira_n8n/package.json` | 包配置 |
| `plugins/mira_n8n/tsconfig.json` | TypeScript 配置 |

HTTP 路由: GET/POST `/n8n/list`, DELETE `/n8n/list/:id`
WebSocket 端口: 7457

### psd-viewer (v1.0.0)

| 文件 | 说明 |
|------|------|
| `plugins/psd-viewer/index.ts` | PSD/PSB 文件格式注册 |
| `plugins/psd-viewer/package.json` | 包配置 |
| `plugins/psd-viewer/tsconfig.json` | TypeScript 配置 |
| `plugins/psd-viewer/web/` | PSD 分层查看器前端 |

实现 ThumbnailGenerator 接口，支持格式: psd, ai, eps, svg, tiff, dng, heic 等

## 旧版插件

### mira_thumb (v1.0.19) -- old_plugins/

| 文件 | 说明 |
|------|------|
| `old_plugins/mira_thumb/index.ts` | 插件主实现 (331 行) |
| `old_plugins/mira_thumb/package.json` | 包配置 |

ffmpeg 缩略图生成。可能被服务端内置 ThumbnailService 替代。

## 已移除插件

- `mira_user/` -- 源码已移除
- `upload_statistics/` -- 源码已移除
