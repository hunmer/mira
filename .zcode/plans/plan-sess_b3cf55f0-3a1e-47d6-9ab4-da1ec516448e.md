# PSD 预览插件接入 Mira 客户端 — 实施计划

## 现状诊断

现有 `online_client_plugins/plugins/psd-viewer/` 是**独立 Vue 应用**，功能完整（拖放上传 + 图层树 + 可见性切换 + canvas 合成），但**缺少 Mira 接入层**：
- 无 `plugin.json`、无 `index.js`（IIFE 注册入口）
- `vite.config.ts` 缺 `base:'./'`（打包后 iframe/file:// 下资源路径错误）
- `App.vue` 不支持从 URL 自动加载 PSD（只支持手动上传）
- 无 postMessage 通知（hovercard 无法感知加载完成/失败用于回退）
- `style.css` 不是深色优先（与宿主视觉不统一）

## 架构设计（对齐 spine-format 范式）

```
index.js (IIFE, 注册 .psd/.psb 格式)
  ├─ renderHoverCard: iframe 加载 dist/index.html?embed=1&psdUrl=<file.path>&fileId=<id>
  │                   超时 30s / 收到 error → 回退显示 thumbnailPath
  └─ open: openPluginWindow(dist/index.html?psdUrl=...&fileName=...)  // 双击打开独立窗口

dist/index.html (App.vue 双模式)
  ├─ 读 URL query: psdUrl → fetch().arrayBuffer() → ag-psd.readPsd → 图层树+合成
  ├─ embed 模式(hovercard): 仅全屏布局(图层树左 + canvas 右)，postMessage 通知父级 loaded/error
  └─ 独立模式(open): 完整布局(顶栏+左右)，支持手动上传 fallback(dev 调试)
```

**URL 选择**：`file.path` 已被 `MiraSDKService` 构建为带 token 的完整可 fetch URL（`MiraSDKService.ts:567/634` + `appendToken`），iframe 内 `fetch(file.path).arrayBuffer()` 直接拿到 PSD 二进制。本地 Electron 模式下可能是 `file://`，同样可 fetch。

## 改动清单（最小改动，复用现有代码）

### 1. 新建 `plugin.json`（仿 spine 的 plugin.json）
字段：`pluginId`（新 UUID）、`pluginName: "PSD 分层预览"`、`version: 1.0.0`、`index: index.js`、`extensions` 不在此（在 index.js 的 registerFileFormat 里）、`permissions: ["ui","dom"]`、`platform: ["win32","darwin","linux"]`、`enable: true`。

### 2. 新建 `index.js`（IIFE 入口，仿 spine/index.js 结构）
- `PLUGIN_ID` 常量 + `registerPluginInstance`
- `resolvePsdUrl(file)`：返回 `file.path || file.localFile || file.url`，规整成可 fetch URL（复用 spine 的 `toPreviewUrl` 逻辑）
- `mountHoverCard(container, file, api)`：创建 iframe（`width:100%;height:100%;border:0;background:#0a0a0a`），src = `dist/index.html?embed=1&psdUrl=...&fileId=...`；监听 `message`（`mira-psd-preview-loaded` 清超时、`mira-psd-preview-error` 退缩略图）；30s 超时退缩略图；cleanup 移除 iframe/listener/timeout
- `open(file)`：`resolvePsdUrl` → `openPluginWindow`（1280×820，query 带 psdUrl/fileName），返回 true
- 注册 `registerFileFormat({ id:'mira-psd', extensions:['psd','psb'], mimeTypes:['image/vnd.adobe.photoshop'], renderHoverCard, open })`

### 3. 改 `vite.config.ts`：加 `base: './'` + `build.target: 'chrome100'`（与 spine 一致，iframe/独立窗口下相对路径加载）

### 4. 改 `index.html`：`<html class="dark">`（深色优先，与宿主统一）

### 5. 改 `src/style.css`：采用 spine 的深色优先 token（`@theme inline` + `.dark`/`:root` 深色定义 + `html,body,#app` 全高 + 棋盘格背景不上 CSS，留到组件内）

### 6. 改 `src/App.vue`（核心改造，双模式）
- 读 query：`psdUrl`、`fileName`、`embed`、`fileId`
- `isEmbed` 时：全屏布局（左图层树 + 右 canvas），无顶栏/上传区；加载完成 postMessage `mira-psd-preview-loaded`，失败 postMessage `mira-psd-preview-error`
- 非 embed（独立窗口）时：保留现有顶栏 + 图层树 + canvas；`psdUrl` 存在则自动 fetch 加载，不存在则显示拖放/上传 fallback（dev 调试用）
- 复用现有 `parsePsdFile`/`compositeLayers`/`LayerTree`，只改数据来源（File → fetch URL）
- `loadFromUrl(psdUrl)`：fetch → arrayBuffer → parsePsdFile → 赋值 layerTree → nextTick → redraw → postMessage loaded；catch → errorMsg + postMessage error

### 7. `usePsd.ts` / `LayerTree.vue` / `types.ts` / UI 组件 / `lib/utils.ts`：**不动**（已满足需求）

### 8. README.md：更新为接入 Mira 的说明（去掉 "最小示例"/demo 语气，仿 spine README 描述功能与构建）

### 9. 构建与索引
```powershell
cd "D:/mira_typescript/online_client_plugins/plugins/psd-viewer"
pnpm install                  # 装已有依赖（lucide 等）
pnpm exec vue-tsc --noEmit -p "tsconfig.json"
pnpm run build                # 产物到 dist/
cd "D:/mira_typescript"
node "scripts/build-client-plugins-index.mjs"   # 把 psd-viewer 加入 plugins.json
```

## 关键决策记录
- **hovercard 内容**：完整图层树+合成预览（用户选定），iframe 填满 480×320 容器
- **上传 fallback**：保留（用户选定），仅非 embed 模式显示，便于 dev 调试
- **二进制加载**：iframe 内 `fetch(file.path).arrayBuffer()`（file.path 已带 token）
- **不实现服务端插件**：后端已支持 psd 缩略图；renderThumbnail 不注册（走宿主默认 thumbnailPath 缩略图，避免重复）
- **超时回退**：30s 未收到 loaded 或收到 error → 显示 thumbnailPath（与 spine 一致）

## 验收标准
1. `vue-tsc --noEmit` + `vite build` 无错误，`dist/index.html` 生成
2. `build-client-plugins-index.mjs` 成功，`plugins.json` 含 psd-viewer 条目
3. Mira 网格中 .psd/.psb 文件悬停 → hovercard 显示图层树+可切换可见性的合成预览
4. 双击 .psd/.psb → 打开独立窗口完整预览
5. hovercard 关闭/切换文件后 iframe 与监听器被清理（无泄漏）