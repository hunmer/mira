# 文件格式扩展插件指南（AI）

目标：为 Mira 增加一种文件格式的识别、缩略图、hovercard 预览、详情打开或服务端处理能力。

## 先判断范围

- 只需客户端识别/打开：实现客户端插件。
- 需要服务端生成缩略图或解析本地文件：再实现服务端插件。
- 交互式内容（WebGL、视频播放器、iframe）只能放在 `renderHoverCard`，不要放进 `renderThumbnail`。

## 客户端插件

目录：`online_client_plugins/plugins/<plugin-name>/`

必须完成：

1. 创建 `plugin.json`，填写唯一 `pluginId`、`version`、`index`、`enable` 等字段。
2. 创建 IIFE 入口 `index.js`，等待 `window.pluginSystem` 后注册工厂：
   `window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)`。
3. 在 `initialize(context)` 中调用 `api.media.registerFileFormat`。
4. 在 `cleanup()` 中调用所有注销函数。

格式注册最小模板：

```js
const unregister = api.media.registerFileFormat({
  id: 'my-format',
  extensions: ['abc'],
  mimeTypes: ['application/x-abc'],
  // 可选：静态缩略图或普通 DOM。返回 cleanup。
  renderThumbnail(container, file) {},
  // 可选：只在 hovercard 打开时创建交互内容。返回 cleanup。
  renderHoverCard(container, file) {},
  // 可选：接管双击详情打开；返回 true 才算已处理。
  open(file) { return false },
})
```

约定：

- 扩展名可带或不带 `.`，匹配不区分大小写。
- `file` 是完整 `FileInfo`，优先使用 `file.url`、`file.thumbnailPath` 和 `file.mimeType`。
- 清理函数必须移除 DOM、事件监听器、定时器和 iframe `postMessage` 监听。
- 需要独立窗口时，使用 `api.window.openPluginWindow`，入口通常为 `dist/index.html`。
- 不要持久化或打印包含认证 token 的文件 URL。

## 服务端插件（可选）

目录：`plugins/plugins/<plugin-name>/`

在 `init({ pluginManager, ... })` 中注册：

```ts
pluginManager.registerFileFormat('my_plugin', {
  id: 'my-format',
  extensions: ['abc'],
  mimeTypes: ['application/x-abc'],
  thumbnailExtensions: ['abc'],
  process: async (filePath, context) => ({ /* 可序列化结果 */ }),
  thumbnail: async (srcPath, destPath) => { /* 写入 PNG/JPEG */ },
})
```

- `thumbnail` 接收本地源路径和目标路径；只为实际支持渲染的扩展填写 `thumbnailExtensions`。
- `process` 用于解析元数据或执行格式专属处理，返回值必须可序列化。
- 插件卸载时由管理器清理注册项；自有资源仍需自行释放。

## 构建、索引与验证

```powershell
cd "D:/mira_typescript/online_client_plugins/plugins/<plugin-name>"
pnpm install
pnpm exec vue-tsc --noEmit -p "tsconfig.json"
pnpm run build

cd "D:/mira_typescript"
node "scripts/build-client-plugins-index.mjs"
pnpm --filter mira-web build
```

服务端插件额外执行：

```powershell
cd "D:/mira_typescript/plugins/plugins/<plugin-name>"
pnpm install --ignore-workspace
pnpm run build
cd "D:/mira_typescript"
pnpm --filter mira-app-server exec tsc --noEmit
```

验收重点：普通缩略图不创建 iframe/WebGL；hovercard 打开后才创建交互内容；关闭或切换文件后资源被清理；详情打开未接管时仍走宿主默认路由。

## 关键文件

- 客户端 API 类型：`packages/mira-client/src/shared/types.ts`
- 运行时格式注册：`packages/mira-client/src/renderer/plugins/types.ts`、`instanceManager.ts`
- 缩略图宿主：`packages/mira-client/src/renderer/components/common/MediaThumbnail.vue`
- 通用 hovercard：`packages/mira-client/src/renderer/components/common/MediaPreviewHoverCard.vue`、`MediaPreviewContent.vue`
- 服务端格式注册：`packages/mira-app-server/src/ServerPluginManager.ts`
- 市场索引：`online_client_plugins/plugins.json`
