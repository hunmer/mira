# overview

mira_tiptap_format 为 Mira 增加 `.tiptap` 富文本文档格式：服务端负责格式识别与查看器解析，客户端提供完整编辑器。2026-08 新增（约在 2026-08-15 至 08-19 间落地，git 记录约 124 个文件变更）。

## 服务端（index.ts，51 行）

协议 B 格式插件，`init(inst)` 返回持有反注册句柄的类实例：

```ts
inst.pluginManager.registerFileFormat('mira_tiptap_format', {
  id: 'mira-tiptap',
  extensions: ['tiptap'],
  mimeTypes: ['application/vnd.mira.tiptap+json', 'application/json'],
  process: async (filePath) => {
    // 读取 + JSON.parse，校验 type === 'doc' 且 content 为数组
    return { format: 'tiptap', type, nodeCount };
  },
  viewers: [{
    viewerId: 'mira-tiptap-editor',
    entry: 'dist/index.html',   // 解析到插件 web/ 目录
    priority: 20,
    getQuery: ({ libraryId, fileId, fileUrl, file }) => ({
      libraryId, fileId, fileUrl, fileName, apiBaseUrl: new URL(fileUrl).origin,
      token: new URL(fileUrl).searchParams.get('token') || '',
    }),
  }],
});
```

- `cleanup()` 调用反注册句柄。
- ServerPluginManager 会把 viewer 解析为 iframeUrl `/server-plugins/{libraryId}/mira_tiptap_format/dist/index.html?...`。

## 客户端（web/，Vue 3 + Tiptap，85 个文件）

### 入口与注册

- `web/index.js`：向 `window.pluginSystem` 注册实例；contribution `mira-tiptap:open-editor`（behavior: window，`api.window.openPluginWindow` 打开 1100x820 独立窗口，query `new=1`）。
- `web/plugin.json`：manifest，pluginId `f4a8c6d2-7b91-4e2f-9c35-1d6a8b0e3f72`，priority 20，permissions `ui/dom/storage`。
- 构建：vite（`pnpm run build` 于 web/ 内），产物 `dist/index.html` 等。

### 编辑器（web/src/App.vue）

- 从 URL 参数初始化：`libraryId / fileId / fileUrl / fileName / apiBaseUrl / token`，`new MiraClient(apiBaseUrl).setToken(token)` 直连后端。
- 功能：标题（同步为默认文件名）、文档图标（DocumentIconPicker）、封面横幅（CoverBanner）、宽窄模式切换、防抖自动保存、另存为（SaveLocationDialog，选库/文件夹/标签）、打开已有 `.tiptap` 文档（OpenFileDialog）、大纲面板（OutlinePanel）。
- Tiptap 扩展：StarterKit、Placeholder、Underline、Link、TextStyle、Color、Highlight、TextAlign、TaskList/TaskItem、Typography，另有自定义 `NotionKeyboard` / `TrailingNode`（extensions/notion-behaviors.ts）。
- 交互组件：SlashCommandMenu（斜杠命令）、TextBubbleMenu、LinkEditorMenu、DragHandle、block-options（Turn into 块类型转换）。

### 依赖（web/package.json，name=mira-tiptap-editor）

`@tiptap/*`（vue-3 + 12 个扩展）、`mira-app-core`（MiraClient）、`mira-plugin-ui`（SaveLocationDialog 等）、`reka-ui`、`lucide-vue-next`、`class-variance-authority`、`clsx`、`tailwind-merge`、`vue`。

## 与 server 的关系

- 运行时安装状态见 `packages/mira-app-server/src/plugins/plugins.json`（enabled: true，status: active）。
- 源码侧推荐清单 `plugins/plugins/plugins.recommend.json` 暂未收录本插件。
