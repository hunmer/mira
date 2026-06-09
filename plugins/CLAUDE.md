# plugins

Mira 服务端插件集合。每个插件继承 `ServerPlugin` 基类，在素材库加载时被 `ServerPluginManager` 动态加载。支持注册 HTTP 路由、WebSocket 事件监听、HTTP Hook 拦截、前端路由和缩略图生成器。

当前活跃插件：mira_n8n (n8n 集成)、mira_thumb_imagemagick (ImageMagick 缩略图)、mira_duplicate_scanner (重复文件扫描)。

## 约定

- 插件必须导出 `init(inst): PluginClass` 工厂函数
- 插件配置持久化在 `{pluginDir}/data/` 目录
- 插件注册通过 `plugins/plugins.json` 配置

## 文件索引

| 文件 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 插件系统总览、基类接口 |
| [claude/file-map.md](claude/file-map.md) | 所有插件文件清单 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 |

## 插件文档

| 插件 | 文档 |
|------|------|
| mira_n8n | [plugins/mira_n8n/CLAUDE.md](plugins/mira_n8n/CLAUDE.md) |
| mira_thumb_imagemagick | [plugins/mira_thumb_imagemagick/CLAUDE.md](plugins/mira_thumb_imagemagick/CLAUDE.md) |
| mira_duplicate_scanner | -- (无独立 CLAUDE.md) |
| mira_thumb (旧版) | [old_plugins/mira_thumb/CLAUDE.md](old_plugins/mira_thumb/CLAUDE.md) |

## 扫描状态

- **扫描时间**: 2026-06-09T11:59:31+08:00
- **活跃插件**: 4 个 (含 mira_duplicate_scanner)
- **已移除**: 2 个 (mira_user, upload_statistics)
