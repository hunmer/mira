# 插件开发指南

## 插件结构

```
plugins/plugins/my_plugin/
  index.ts              # 入口，导出 init(inst) 工厂函数
  components/           # 前端组件（编译后的 .js 文件）
  web/                  # 可选：随服务端插件分发的客户端插件
    plugin.json         # 客户端插件清单
    index.js            # 客户端插件入口
    dist/               # 可选：独立页面等前端构建产物
  package.json
  tsconfig.json
```

### web 目录：随服务端插件分发客户端插件

服务端插件可以在 `web/` 目录中放置一个完整的前端插件。当前素材库启用该服务端插件后，服务端会读取 `web/plugin.json`；Mira 客户端连接并同步素材库时，会将它作为 `source: 'server'` 的客户端插件发现、加载和管理。

`web/plugin.json` 至少需要提供 `pluginId`、`pluginName`，并通过 `index` 指定入口文件（默认 `index.js`）。入口文件必须存在于 `web/` 内，且遵循客户端本地插件的浏览器脚本契约，例如注册与 `pluginId` 一致的实例工厂。完整的清单字段、生命周期、UI Contribution、独立窗口和脚本模板请阅读 [客户端本地插件系统架构](./client-plugin-architecture.md)。

`web/` 下的入口脚本和其他静态资源由服务端通过 `/server-plugins/:libraryId/:pluginName/*` 提供。前端构建产物应使用相对路径引用资源；这些代码资源可公开访问，但插件调用 `/api` 接口时仍必须携带认证 token。

> `web/` 客户端插件与下文的 `components/` Dashboard 组件是两种不同的前端扩展方式：前者运行在 Mira 客户端插件系统中，后者通过服务端 Dashboard 的 `window.MiraPluginComponents` 注册。

## 入口文件

不继承任何基类，不引用 `mira-app-server` / `mira-storage-sqlite` 等包。所有依赖通过 `inst` 参数获取，类型用 `any`。

```typescript
class MyPlugin {
  constructor(inst: any) {
    const { pluginManager } = inst;
    const dbService = inst.dbService;
    const backend = pluginManager.server.backend;
    const httpRouter = backend.getHttpServer().httpRouter;
    const libraryId = dbService.getLibraryId();

    // 注册 HTTP 路由
    httpRouter.registerRounter(
      libraryId, '/my-plugin/action', 'post',
      async (req: any, res: any) => {
        res.json({ success: true });
      }
    );

    // 注册前端路由
    this.routes.push({
      name: 'MyPluginPage',
      group: '工具',
      path: '/tools/my-plugin',
      component: 'components/MyPlugin.js',
      pluginName: 'my_plugin',
      meta: { title: '我的插件', roles: ['super', 'admin', 'user'] },
    });
  }

  private routes: any[] = [];

  getRoutes() {
    return [...this.routes];
  }
}

export function init(inst: any) {
  return new MyPlugin(inst);
}
```

### inst 参数

| 属性 | 说明 |
|------|------|
| `pluginManager` | 插件管理器，获取插件目录、注册 HTTP Hook |
| `pluginManager.server` | WebSocket 服务器 |
| `pluginManager.server.backend` | 后端实例（httpServer、thumbnailService 等） |
| `dbService` | 当前素材库的数据库服务 |

## 自定义文件格式处理

插件可以注册格式处理器。宿主按扩展名或 MIME 类型匹配，并把服务端本地文件路径传给 `process`；路径只在回调期间使用，不应写入响应或日志。

```typescript
const unregister = pluginManager.registerFileFormat('my_plugin', {
  id: 'glb',
  extensions: ['glb', 'gltf'],
  mimeTypes: ['model/gltf-binary'],
  thumbnailExtensions: ['glb'],
  async process(filePath, context) {
    // 在 Node 中读取/解析 filePath，返回可序列化结果
    return { filePath, size: (await fs.promises.stat(filePath)).size, ...context };
  },
  async thumbnail(srcPath, destPath) {
    // 可选：使用 render-glb、three 的 Node 渲染器或其他无头方案生成 destPath
  },
});

// 插件 cleanup 中调用；卸载时宿主也会自动清理
unregister();
```

需要主动处理文件时调用 `pluginManager.processFile(filePath, { mimeType, ... })`。缩略图回调会自动接入现有 `ThumbnailService` 的文件创建和待处理扫描流程；`thumbnailExtensions` 可限制哪些格式真正进入缩略图生成器。

使用 `render-glb` 时，插件安装后必须执行原生依赖构建（`npm rebuild gl --build-from-source`）。Windows 需要可用的 C++ 编译工具链；Linux 无显示环境还需要 Mesa/Xvfb。

## package.json

不依赖 mira 包：

```json
{
  "name": "my_plugin",
  "version": "1.0.0",
  "main": "index.ts",
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

## 前端组件

前端组件是独立的 JS 文件，通过 `window.MiraPluginComponents` 注册，可使用 `window.MiraDashboardUI` 中的 shadcn-vue 组件。

> 若插件前端是独立的 Vite SPA（放在插件 `web/` 目录、经 `/server-plugins/...` 托管），并希望复用 `mira-plugin-ui` 的 shadcn-vue 组件（Button/Dialog/批量上传/素材选择器等），须按[源码消费 mira-plugin-ui 组件指南](./plugin-ui-source-consumption.md)配置依赖、alias、Tailwind `@source` 与 shadcn token——否则组件样式（尤其 Portal 弹窗）会静默缺失。参考实现：`plugins/plugins/mira_image_cropper/web/`。

### 关键：fetch 请求必须携带 token

所有 API 请求必须带 `Authorization` header，否则返回 401。

```javascript
authHeaders: function () {
  var token = localStorage.getItem('token');
  var h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
},

// 用法
fetch('/api/my-plugin/action', {
  method: 'POST',
  headers: this.authHeaders(),
  body: JSON.stringify({ ... }),
})
```

### 组件注册格式

```javascript
(function () {
  var ui = window.MiraDashboardUI || {};

  var MyComponent = {
    name: 'MyPluginPage',
    components: {
      MiraButton: ui.Button,
      MiraCard: ui.Card,
      // ... 按需引入
    },
    template: '<div>...</div>',
    data: function () { return { ... }; },
    methods: { ... },
  };

  window.MiraPluginComponents['my_plugin_components_MyPlugin_js'] = MyComponent;
})();
```

组件 key 格式：`{pluginName}_components_{FileName}_js`（文件路径中的 `/` 和 `.` 替换为 `_`）。

## 可用 UI 组件

通过 `window.MiraDashboardUI` 访问：

Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, ScrollArea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator, Badge, Input

## 工具函数

通过 `window.MiraDashboard` 访问：

| 方法 | 说明 |
|------|------|
| `getLibraries()` | 获取素材库列表 |
| `getApiBase()` | 获取 API 基础路径 |
