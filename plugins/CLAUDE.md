# plugins

Mira 服务端插件集合(当前 **13 个**)。插件由 `ServerPluginManager`(`packages/mira-app-server/src/ServerPluginManager.ts`)在素材库加载时动态加载。支持两套并行协议:旧版 `extends ServerPlugin`(深度介入服务端)与新版 `registerFileFormat(ServerFileFormatHandler)`(声明格式扩展与缩略图)。注册表:`plugins/plugins/plugins.json`。

## 约定

- 必须导出 `init(inst)` 工厂函数
- **协议 A(旧)**:返回 `extends ServerPlugin` 的实例;构造函数接收 `{ pluginManager, server, dbService, miraClient? }`
- **协议 B(格式)**:`init(inst)` 内 `inst.pluginManager.registerFileFormat(pluginName, handler)` 声明 `extensions`/`thumbnailExtensions`/`thumbnail(src,dest)`/`viewers[]`
- 配置持久化在 `{pluginDir}/data/`
- 通过 `plugins/plugins.json` 启停(`enabled` 字段)
- 含 `web/` 子目录的插件同时提供客户端预览 UI(经 `plugin.json` 注册)

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 双协议总览、基类/Handler 接口、13 插件清单 | 首次了解插件体系 |
| [claude/file-map.md](claude/file-map.md) | 全部插件文件清单 | 找某插件文件 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 | 看更新历史 |

## 插件清单

### 协议 A — `extends ServerPlugin`(3 个,默认全部 disabled)

| 插件 | 版本 | 职责 |
|------|------|------|
| mira_n8n | 1.0.7 | n8n Webhook/WS 集成,独立 WS 服务器转发文件事件 |
| mira_eagle_extension | 1.0.0 | 复刻 Eagle 本地 HTTP 协议,让 Eagle 浏览器扩展无改接入 |

### 协议 B — `registerFileFormat`(10 个格式插件,默认 enabled)

| 插件 | 版本 | 格式 | 缩略图依赖 | +web |
|------|------|------|-----------|------|
| mira_3d_format | 1.0.1 | glb/gltf | render-glb + @gltf-transform | ✓ |
| mira_spine_format | 1.1.0 | skel/spine | 内置解析 | ✓ |
| mira_epub_format | 1.0.0 | epub | 内置封面提取 | ✓ |
| mira_livp_format | 1.0.0 | livp | Live Photo 解包 | ✓ |
| mira_lottie_format | 1.0.0 | lottie | dotLottie 渲染 | ✓ |
| mira_pag_format | 1.0.0 | pag | Chrome(`PAG_BROWSER_PATH`) | ✓ |
| mira_swf_format | 1.0.0 | swf | FFmpeg + Ruffle | ✓ |
| mira_zipper_format | 1.0.0 | zip | 内置归档解析 | ✓ |
| pdf-viewer | 1.0.0 | pdf | 浏览器内置 PDF | ✓ |
| psd-viewer | 1.0.0 | psd/psb | 浏览器本地解析 | ✓ |

## 已有独立文档的插件

| 插件 | 文档 |
|------|------|
| mira_n8n | [plugins/mira_n8n/CLAUDE.md](plugins/mira_n8n/CLAUDE.md) |
| psd-viewer | [plugins/psd-viewer/CLAUDE.md](plugins/psd-viewer/CLAUDE.md) |
| old mira_thumb | [old_plugins/mira_thumb/CLAUDE.md](old_plugins/mira_thumb/CLAUDE.md) |

> 其余 11 个插件暂无独立 `CLAUDE.md`,可参考各自 `index.ts` 顶部声明与 `README.md`。

## 扫描状态

- **更新时间**: 2026-08-11
- **已扫描**: `plugins/plugins/` 全部 13 个目录(基于 `index.ts` + `package.json` + `plugins.json` 抽样);验证 `ServerPluginManager.ts` 双协议实现
- **本次更新要点**: 从旧版"3 插件"清单扩到 13 个;识别并文档化**双协议**(`ServerPlugin` vs `registerFileFormat`);标注 `mira_thumb_imagemagick` 已移除
- **下一步建议**: 为 10 个格式插件补独立 `CLAUDE.md`(统一模板:扩展名/缩略图策略/viewer entry/依赖);核对 `web/` 子目录与 `online_client_plugins/` 的发布关系
