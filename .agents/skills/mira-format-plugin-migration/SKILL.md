---
name: mira-format-plugin-migration
description: Migrate Eagle format plugins into Mira server and web plugins without using Eagle APIs. Use when a task ports an Eagle plugin that handles a file format, thumbnails, preview URLs, container resources, or a shared viewer into `plugins/plugins`.
---

# Mira Format Plugin Migration

将 Eagle 的格式插件迁移为 Mira 插件。优先复用 Mira 已有的服务端格式处理器、附加文件 URL 和 web viewer 机制，保持改动局部且可部署。

## 1. 调查

1. 先读：
   - `docs/server-plugin-development.md`
   - `docs/client-plugin-architecture.md`
   - 至少一个现有格式插件（`mira_3d_format`、`mira_spine_format` 或 `psd-viewer`）。
2. 按仓库约定先查询 CodeGraph；索引不足时再用 `rg --files`、`rg` 和定向读取。
3. 盘点源插件的 manifest、入口、thumbnail、viewer、第三方库和真实文件流程。把 Eagle API 调用列为待替换项，不复制到 Mira。
4. 记录源格式的真实结构：普通文件、ZIP/容器、配套文件、静态图、视频、音频和 MIME 类型。

## 2. 决定前后端边界

- 纯 UI 工具只写客户端插件。
- 需要识别扩展名、读取本地文件、生成缩略图、解析容器或提供预览资源时，写服务端格式插件。
- 格式插件的共享 viewer 放在插件 `web/`，而不是修改客户端核心预览组件。
- 只有现有 API 确实无法表达需求时才扩展公共 API；先尝试 `registerFileFormat`、`viewers`、`getExtraFileList`、`getExtraFile` 和 `getExtraFileUrl`。

## 3. 服务端实现

在 `plugins/plugins/<plugin>/index.ts` 导出 `init(inst)`，不要导入 `mira-app-server` 或 `mira-storage-sqlite`，通过 `inst` 获取宿主对象并使用 `any` 类型边界。

注册格式时优先提供：

```ts
pluginManager.registerFileFormat(pluginName, {
  id,
  extensions,
  mimeTypes,
  thumbnailExtensions,
  process,
  thumbnail,
  getExtraFileList,
  getExtraFile,
  viewers: [{
    viewerId,
    title,
    entry: 'viewer.html',
    getQuery: (context) => ({
      imageUrl: context.getExtraFileUrl('photo.png'),
      videoUrl: context.getExtraFileUrl('video.mp4'),
    }),
  }],
})
```

`getExtraFile` 返回服务端临时文件的真实路径；宿主会通过鉴权的 `/api/files/extra/...` URL 流式返回，不要把本地路径写入响应、日志或 query。对容器格式，缓存目录放在 `inst.server.backend.dataPath/temp/<format>`，以源文件绝对路径和 `size:mtimeMs` 做 key。

## 4. 安全处理容器格式

使用现有依赖（优先 `yauzl`）以 lazy entries 流式解包；不要用无约束的 `extract-all`。

- 只允许业务所需扩展名。
- 限制条目数、单条目未压缩大小和总未压缩大小。
- 规范化 ZIP entry 名称，拒绝绝对路径、`..` 穿越和 NUL 字符。
- 目标路径必须经过 `path.resolve` 并确认位于缓存根目录内。
- 解包写入临时目录，成功后再写 manifest；失败时递归清理缓存目录。
- 通过 `pending` Map 合并相同源文件的并发解析。
- 对 HEIC/HEIF 使用当前安全版本的 `sharp`（安装后运行 `npm audit`）；将输出统一为浏览器可显示的 PNG。
- 对 MOV/MP4 只在确认格式后暴露为固定白名单名称（例如 `video.mp4`），不得接受任意文件名。

推荐把容器内部资源规范化为少量固定输出，例如 `photo.png` 和 `video.mp4`，让 viewer、缩略图和附加文件 API 使用同一份缓存结果。

## 5. Web viewer 与客户端注册

在 `web/` 放 `plugin.json`、`index.js` 和 viewer 入口。入口必须是浏览器 IIFE：通过 `window.pluginSystem.registerPluginInstance(PLUGIN_ID, factory)` 注册，不能使用 CommonJS `module.exports` 或 ESM `import`。

viewer 应：

- 从 query 读取宿主生成的 URL，不读取本地路径。
- 静态资源先显示；视频 `canplay` 后切换并 `autoplay loop muted playsinline`。
- 视频解码失败时保留静态图，不要把可用降级路径变成整体错误。
- 启动参数不完整或静态图也失败时显示明确错误，并通过 `postMessage` 通知宿主（如实现 hover iframe 回退）。
- 通过 `api.media.getExtraFileList/getExtraFileUrl` 构造客户端 `getPreviewUrl`；注册项的 `pluginId` 必须与 `web/plugin.json` 一致。

服务端 viewer 的 `entry` 必须在插件 `web/` 内存在；宿主从 `/server-plugins/<library>/<plugin>/<entry>` 托管它。不要为已有附加文件能力再添加自定义 HTTP 路由。

## 6. 清单、依赖与构建

1. 在源码清单 `plugins/plugins/plugins.json` 登记插件。
2. 在运行时清单 `packages/mira-app-server/src/plugins/plugins.json` 登记并启用插件；保留其他用户改动。
3. 在 `packages/mira-app-server/src/plugins/package.json` 添加本地 `file:../../../../plugins/plugins/<plugin>` 依赖，让安装流程自动创建 Junction；运行 `npm install` 更新 lockfile。
4. 在插件目录执行 `npm install`、`npm run build`；web 有独立构建时再构建其 web 子目录。
5. 不因单个插件迁移运行全仓修复或 `npm audit fix --force`；区分新插件自身审计结果和容器历史漏洞。

## 7. 验收

留下一个可重复的最小行为检查：构造包含 JPEG/HEIC 与 MOV/MP4 的 ZIP，调用已编译插件 handler 的 `process`、`getExtraFileList`、`getExtraFile` 和 `thumbnail`，断言格式、固定文件名、图片尺寸和缩略图存在。

然后：

1. 用 `procm-mcp` 重启已有 Mira 服务；没有运行中的服务时不要擅自启动常驻进程。
2. 查日志确认 `ThumbnailService` 注册了目标扩展名且插件已加载；同时确认没有 `Failed to load plugin`。
3. 用 `npx ts-node packages/mira-app-server/src/cli.ts --json system health` 检查服务返回 `status: ok`。
4. 导入真实样本，人工确认缩略图、viewer 静态回退、视频循环和容器缺资源时的错误提示。

## 常见错误

- 只更新源码插件目录，忘记运行时 `node_modules` 的本地 file 依赖，导致 `Cannot find module`。
- `plugin.json` 的 `pluginId` 与 IIFE 常量不一致，导致 factory 找不到。
- 把 Eagle 的 `require`, `eagle.item`, `thumbnailURL`, `item.refreshThumbnail` 或本地路径 query 直接带入 Mira。
- 允许任意 ZIP entry 名称或任意附加文件名，造成路径穿越或缓存污染。
- 将视频错误直接作为 viewer 总错误，丢失仍可用的静态照片回退。
- 把 `dist/` 产物提交判断当成接口设计；以插件构建脚本和宿主加载路径为准。
