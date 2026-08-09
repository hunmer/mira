# Server Web Plugins Handoff

## 当前状态

- 实现代码已提交；当前 `main` HEAD：`afe68d3`，本 handoff 文档尚未提交。
- 服务端 Web 插件由后端托管，客户端无需安装即可加载。
- 客户端插件管理已有“服务器插件”页签：默认启用、可切换、不可卸载。
- 后续 Phase 12 已补齐 3D/Spine 后端插件的本地安装和模块解析。

## 已实现架构

### 服务端

- `GET /api/plugins/web?libraryId=<id>`：返回该素材库已启用且含 `web/plugin.json` 的服务端插件。
- `/server-plugins/:libraryId/:pluginName/*`：公开只读托管插件 `web` 资源，支持 JS/CSS/图片/wasm 等二进制文件。
- 清单来源：`ServerPluginManager` 的已加载插件，不单独维护第二份启用列表。
- npm 发布清单已包含 `web/**/*`。

关键文件：

- `packages/mira-app-server/src/ServerPluginManager.ts`
- `packages/mira-app-server/src/routes/PluginRoutes.ts`
- `packages/mira-app-server/src/HttpServer.ts`
- `packages/mira-app-core/src/shared/sdk/modules/PluginModule.ts`

### 客户端

- 选定素材库后同步服务器插件，并复用现有远程脚本注入和插件实例生命周期。
- 客户端仅持久化禁用 ID，存储键为 `mira-disabled-server-plugins`，所以新增插件默认启用。
- 刷新会先清理旧实例和脚本，避免重复注册格式处理器。

关键文件：

- `packages/mira-client/src/renderer/services/PluginService.ts`
- `packages/mira-client/src/renderer/stores/plugin.ts`
- `packages/mira-client/src/renderer/services/InitializationService.ts`
- `packages/mira-client/src/renderer/components/business/PluginsDialog.vue`

## 插件迁移映射

| 前端插件 | 后端目录 |
|---|---|
| 3D 格式预览 | `plugins/plugins/mira_3d_format/web` |
| Spine 格式预览 | `plugins/plugins/mira_spine_format/web` |
| PSD 分层预览 | `plugins/plugins/mira_thumb_imagemagick/web` |

`mira-welcome-demo` 和 `mira-whiteboard` 仍是纯客户端市场插件；`online_client_plugins/plugins.json` 当前只包含这两项。

## 验证基线

已通过：

- 服务端 `tsc --noEmit`
- 客户端 Vite 生产构建
- 3D、Spine、PSD Web 插件类型检查和生产构建
- Core SDK ESM 构建
- 三个后端插件 `npm pack --dry-run`，均包含 `web/plugin.json`
- Mira CLI `system health`

已知无关阻塞：

- 客户端完整 type-check 仍有既存错误：`ServerEditDialog.vue:110`、`main.ts:51`。
- Core 完整 build 会被既存 SDK `.test.ts` 的 top-level await/Mock 类型错误阻断。

## 下个 Agent 直接执行

1. 用 procm-mcp 重启 `mira-app-server-dev`，不要用普通 shell 代替持久进程管理。
2. 用 Mira CLI 登录后确认目标素材库的服务端插件启用状态，再请求 `/api/plugins/web?libraryId=<id>`。
3. 打开客户端“插件管理 → 服务器插件”，验证默认启用、切换持久化、无卸载按钮，并实际预览 3D/Spine/PSD 文件。

注意：PSD 只有在后端 `mira_thumb_imagemagick` 已启用时才会出现在服务器插件列表中。
