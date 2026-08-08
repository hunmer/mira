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
  // 可选：返回详情页 IframePreview 使用的完整 URL，可异步。
  getPreviewUrl(file) { return 'https://example.test/viewer?file=...' },
  // 可选：接管双击详情打开；返回 true 才算已处理。
  open(file) { return false },
})
```

约定：

- 扩展名可带或不带 `.`，匹配不区分大小写。
- `file` 是完整 `FileInfo`，优先使用 `file.url`、`file.thumbnailPath` 和 `file.mimeType`。
- iframe 详情预览应实现 `getPreviewUrl`，插件负责构造完整 viewer URL，宿主只展示返回的地址，不解析格式资源。
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
  // 可选：容器格式的附属文件能力
  getExtraFileList: async (filePath, context) => ['data.json', 'texture.png'],
  getExtraFile: async (filePath, fileName, context) => resolveValidatedTempFile(filePath, fileName),
})
```

- `thumbnail` 接收本地源路径和目标路径；只为实际支持渲染的扩展填写 `thumbnailExtensions`。
- `process` 用于解析元数据或执行格式专属处理，返回值必须可序列化。
- `getExtraFileList` 返回容器内的相对文件名数组，不得返回服务器绝对路径。
- `getExtraFile` 接收客户端指定的相对文件名，必须由插件校验后返回已解压的文件路径；核心路由只负责流式输出，不把该路径放入响应。
- 容器解压目录应放在服务端 `dataPath/temp` 下，不能写入素材库目录；应限制条目数量、单文件大小、总解压大小，并拒绝绝对路径和 `..` 目录穿越。
- 核心 HTTP 路由为：
  - `GET /api/files/extra/:libraryId/:fileId`：返回文件名列表。
  - `GET /api/files/extra/:libraryId/:fileId/:fileName`：返回单个附属文件。
- `fileId` 是素材库内 ID，不能省略 `libraryId`。文件名包含子目录时，客户端应按路径段编码。
- 插件卸载时由管理器清理注册项；自有资源仍需自行释放。

### `.spine` ZIP 容器示例

`.spine` 本质是 ZIP，典型内容如下：

```text
hero.spine
├── hero.atlas
├── hero.json        # 也可以是 hero.skel
└── hero.png
```

服务端插件流程：

1. `extensions: ['spine']` 声明格式，`thumbnailExtensions: ['spine']` 声明缩略图入口。
2. 首次处理时将 ZIP 解压到 `data/temp/spine/<cache-key>/`。
3. 从解压目录选择 `.json`/`.skel`、`.atlas` 和贴图，调用 Spine headless runtime 生成 PNG 缩略图。
4. `getExtraFileList` 返回例如 `['hero.atlas', 'hero.json', 'hero.png']`。
5. `getExtraFile` 只允许访问列表中的文件名，并返回经过校验的临时文件路径。

客户端插件不要拼接解压目录。宿主 SDK 已提供：

```ts
const files = await client.files().getExtraFileList(libraryId, fileId)
const json = await client.files().getExtraFile(libraryId, fileId, 'hero.json')
const jsonUrl = client.files().getExtraFileUrl(libraryId, fileId, 'hero.json')
```

`getExtraFileUrl` 生成带认证参数的 HTTP 地址，适合 iframe、`<img>` 等无法自定义请求头的场景；不要把 token 写入日志或持久化。
Spine 客户端插件应在 `getPreviewUrl(file)` 内选择骨架、atlas 和贴图并返回完整 viewer URL，宿主不得拼接这些参数。

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

验收重点：普通缩略图不创建 iframe/WebGL；hovercard 打开后才创建交互内容；关闭或切换文件后资源被清理；实现 `getPreviewUrl` 的格式在详情页使用 `IframePreview`；详情打开未接管时仍走宿主默认路由。

## 关键文件

- 客户端 API 类型：`packages/mira-client/src/shared/types.ts`
- 运行时格式注册：`packages/mira-client/src/renderer/plugins/types.ts`、`instanceManager.ts`
- 缩略图宿主：`packages/mira-client/src/renderer/components/common/MediaThumbnail.vue`
- 通用 hovercard：`packages/mira-client/src/renderer/components/common/MediaPreviewHoverCard.vue`、`MediaPreviewContent.vue`
- 服务端格式注册：`packages/mira-app-server/src/ServerPluginManager.ts`
- 服务端附属文件路由：`packages/mira-app-server/src/routes/FileRoutes.ts`
- Core SDK 文件模块：`packages/mira-app-core/src/shared/sdk/modules/FileModule.ts`
- 市场索引：`online_client_plugins/plugins.json`
