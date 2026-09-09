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

## 服务端 HTTP Viewer：HTML 格式实战

`.html`、`.htm` 的实现说明了普通文件格式如何提供由 Mira 服务端托管的预览页。
参考实现：`plugins/plugins/mira_html_format/`。

### 请求链路

```text
服务端 registerFileFormat(viewers)
  -> POST /api/files/getPreviewViewers
  -> ServerPluginManager 校验 web/viewer.html
  -> 返回 /server-plugins/<library>/<plugin>/viewer.html?... 查询参数
  -> viewer 通过后端生成的 /api/files/file/<library>/<id>?token=... 拉取素材
```

这里有两个不同的 HTTP 资源：

- `/server-plugins/.../viewer.html` 是插件代码，由服务端静态托管。
- `/api/files/file/...` 是素材内容，需要鉴权，URL 由宿主生成。

不要把服务端本地路径放进 viewer query，也不要在客户端把 Windows 路径转换为
`file://`。这会绕过服务端权限边界，并且远程客户端无法访问服务端磁盘。

### 服务端注册

服务端格式插件只声明格式和 viewer，不需要为已有能力重复增加 HTTP 路由：

```ts
pluginManager.registerFileFormat('mira_html_format', {
  id: 'mira_html_format',
  extensions: ['html', 'htm'],
  mimeTypes: ['text/html'],
  viewers: [{
    viewerId: 'mira-html',
    title: 'HTML 页面预览',
    entry: 'viewer.html',
    priority: 20,
    getQuery: ({ file, fileId, fileUrl }) => ({
      fileId,
      fileName: file?.name || 'HTML',
      fileUrl,
    }),
  }],
})
```

`fileUrl` 来自宿主的 `getItemFilePath(..., { isUrlFile: true })`，不是本地路径。
`web/plugin.json` 必须存在，且 `viewer.html` 必须位于该插件的 `web/` 内；否则
`ServerPluginManager.getPreviewViewers()` 会跳过该 viewer。

### 为什么 viewer 使用 fetch + srcdoc

主文件下载接口可能返回 `Content-Disposition: attachment`，`.htm` 也可能缺少精确的
Content-Type。直接把素材 URL 设置为 iframe `src` 可能触发下载而不是渲染。

HTML viewer 可以先通过 HTTP `fetch(fileUrl)` 读取文本，再写入内层 iframe 的
`srcdoc`。这样预览入口始终是服务端 HTTP 页面，也不需要修改公共下载接口。

```js
if (!/^https?:\/\//i.test(fileUrl)) throw new Error('HTTP(S) URL required')
const response = await fetch(fileUrl, { credentials: 'same-origin' })
if (!response.ok) throw new Error(`HTTP ${response.status}`)
preview.srcdoc = await response.text()
```

此方案适合单文件 HTML 或引用网络资源的 HTML。素材旁边的相对 CSS、JS、图片不会
自动映射为可访问的服务端路径。若格式本质是多文件站点，应将其设计为容器格式，
通过 `getExtraFileList`、`getExtraFile`、`getExtraFileUrl` 暴露经过白名单校验的资源。

### HTML 预览的安全边界

HTML 素材是不可信代码。素材 URL 的 query 中可能包含 token，不能直接传给素材脚本。
至少执行以下隔离：

```html
<iframe
  sandbox="allow-forms allow-scripts"
  referrerpolicy="no-referrer"
></iframe>
```

- 不添加 `allow-same-origin`，防止素材访问 Mira 页面上下文和存储。
- 使用 `referrerpolicy="no-referrer"`，防止 viewer query 作为 referrer 泄漏。
- 注入 `<base>` 支持相对地址时，先删除 URL 的 `search` 和 `hash`，不能把 token 放入
  素材 DOM。
- 只开放实际需要的 sandbox 权限；不要默认开放弹窗、导航或下载。
- 错误日志和 `postMessage` 只传 `fileId`、错误类型等非敏感信息。

安全的 base URL 处理示例：

```js
const safeBaseUrl = new URL(fileUrl)
safeBaseUrl.search = ''
safeBaseUrl.hash = ''
base.href = safeBaseUrl.toString()
```

### 客户端降级注册

详情预览优先使用服务端 `/api/files/getPreviewViewers` 返回的 `iframeUrl`。客户端
`web/index.js` 仍可注册同名格式作为降级，但必须同时验证插件入口和素材地址都是
HTTP(S)：

```js
const scriptUrl = document.currentScript?.src || ''
const pluginBaseUrl = /^https?:\/\//i.test(scriptUrl) ? new URL('.', scriptUrl) : null

function getPreviewUrl(file) {
  const fileUrl = file?.url || file?.path || ''
  if (!pluginBaseUrl || !/^https?:\/\//i.test(fileUrl)) return ''
  const viewerUrl = new URL('viewer.html', pluginBaseUrl)
  viewerUrl.searchParams.set('fileUrl', fileUrl)
  return viewerUrl.toString()
}
```

不要回退到 `file.localFile`，也不要实现“检测到盘符就补 `file:///`”的逻辑。

### 清单与本地依赖

新增服务端格式插件需要同步三个位置：

1. `plugins/plugins/plugins.json`：源码插件清单。
2. `packages/mira-app-server/src/plugins/plugins.json`：运行时启用清单。
3. `packages/mira-app-server/src/plugins/package.json`：本地插件依赖。

本仓库运行时依赖当前使用 `link:` 协议。注意两个实际限制：

- 在 `packages/mira-app-server/src/plugins` 执行 `npm install` 会报
  `EUNSUPPORTEDPROTOCOL`，因为 npm 不支持 `link:`。
- 该目录不在根 `pnpm-workspace.yaml` 中；直接执行 `pnpm install` 会提升到根 workspace，
  不一定创建该目录下预期的插件 Junction。

本地开发时，运行时清单可直接指向 `../../../../plugins/plugins/<plugin>`。部署或模拟
`node_modules` 安装时应使用项目既有安装流程，并检查最终链接目标，不要只看安装命令
是否返回成功。

### 最小验收顺序

1. 插件目录执行 `npm test` 或 `pnpm test`，覆盖扩展名、MIME、viewer query 和 cleanup。
2. 对 `web/index.js` 执行 `node --check`，并扫描是否残留 `file://`。
3. 用 procm-mcp 重启已有 `mira-app-server-dev`；没有已有服务时不要擅自启动常驻进程。
4. 用 Mira CLI 执行 `system health`，确认 `status: ok`。
5. 请求实际 `/server-plugins/<library>/<plugin>/viewer.html`，确认返回 `200 text/html`。
6. 导入真实 `.html` 和 `.htm` 样本，确认详情页使用 HTTP viewer 且错误状态可见。

仅检查磁盘文件不够。实际静态 URL 返回 200 同时证明目标素材库已加载该服务端插件，
因为 `/server-plugins` 路由会先调用 `isPluginLoaded(pluginName)`。

### 本次踩坑结论

- 不要因下载接口的 attachment 行为直接修改公共接口；viewer 内 fetch 通常改动更小。
- `.html` 与 `.htm` 必须都按扩展名注册，不能只依赖 `text/html` MIME。
- viewer query 中的鉴权 URL 只应由可信 viewer 读取，不能原样注入不可信 HTML。
- 服务端 viewer 依赖 `web/plugin.json`；只有 `index.ts` 和 `viewer.html` 仍无法被解析。
- `pluginId`、IIFE 注册 ID、客户端格式 ID、服务端 viewer ID 分属不同契约，命名要稳定，
  其中 `pluginId` 与 IIFE 注册 ID 必须完全一致。
- 安装成功不代表运行时链接存在；重启前检查插件最终解析路径。

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
