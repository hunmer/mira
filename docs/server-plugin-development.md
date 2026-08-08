# 插件开发指南

## 插件结构

```
plugins/plugins/my_plugin/
  index.ts              # 入口，导出 init(inst) 工厂函数
  components/           # 前端组件（编译后的 .js 文件）
  package.json
  tsconfig.json
```

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

需要主动处理文件时调用 `pluginManager.processFile(filePath, { mimeType, ... })`。缩略图回调会自动接入现有 `ThumbnailService` 的文件创建和待处理扫描流程。

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
