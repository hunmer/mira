# Mira Eagle 浏览器扩展支持

在 Mira 服务端复刻 **Eagle 本地 HTTP 协议**，让 Eagle 浏览器扩展无需任何改动，即可把网页图片 / 截图 / 链接保存到 **Mira 素材库**。

> 移植自 `scripts/eagle浏览器扩展支持/server.js`。原版把请求转发给本机 Eagle（`127.0.0.1:41597`），本插件直接操作 `dbService`，把图片真正落库到 Mira。

## ⭐ 架构：全局单例 + 库选择器

`ServerPluginManager` 是 **per-library** 的——每个素材库都会各 `new` 一个、各调一次插件 `init(inst)`。若每个实例都 `listen()`，第二个库必然 `EADDRINUSE`。

本插件采用 **模块级单例**：
- 借助 Node `require` 缓存（`ServerPluginManager` 仅在 reload 时清缓存），模块级变量 `globalServer` 跨库共享
- 端口 41595 / 41593 **只在首个库加载时 bind 一次**，后续库直接返回同一实例
- 入库时不绑定 `init` 时的库，而是按 **配置页选择的 `targetLibraryId`** 在请求时解析对应库的 `dbService`

因此多库场景下也只有一个 HTTP 服务实例，所有库共用，数据统一进入用户在配置页选定的库。


## 🎯 功能

- 在 **41595** 端口提供 Eagle API 协议（`/api/item/addFromURLs`、`/api/folder/create`、`/api/folder/listRecent`、`GET /`）
- 在 **41593** 端口接收 Eagle 扩展的图片 / 截图 / save-url 推送（`POST /`、`GET /exit`、`GET /`）
- 两个端口的 `GET /` 均返回 Eagle 风格服务信息（含 `apiToken`），扩展据此识别"Eagle 正在运行"
- 所有响应自带 CORS 头，浏览器扩展可直接跨域访问

## 📡 Eagle 协议 → Mira 落库映射

| Eagle 端口/路径 | 方法 | Mira 行为 |
|---|---|---|
| `:41595 GET /` | GET | 返回 Eagle 服务信息（伪装） |
| `:41595 POST /api/item/addFromURLs` | POST | body `{folderId, items:[{name,url,website,modificationTime}]}` → 每条作为 **URL 引用文件** 写入当前库，归入 `folderId`，来源 `url` 存入 `custom_fields` |
| `:41595 POST /api/folder/create` | POST | body `{name,parentId,color,icon}` → `dbService.createFolder(...)`，返回 `{id}` |
| `:41595 GET /api/folder/listRecent` | GET | `dbService.getAllFolders()` 取最近 N 条（默认 10） |
| `:41593 GET /` | GET | 返回 Eagle 服务信息 |
| `:41593 GET /exit` | GET | `process.exit(0)`（保持原版行为） |
| `:41593 POST /` | POST | body `type` ∈ `image` / `screen capture` / `save-url`：`base64` 优先，否则下载 `src`，用 `createFileFromPath(..., {importType:'move'})` 落盘入库，归类 `folderID`，写入 `metaTags`/`metaDescription`/`url` |

落库后会广播 `file::created` / `folder::created` WebSocket 事件，前端网格实时刷新（用 `targetLibraryId`）。

## 🖥️ 配置页（选择接收库）

访问 **`http://127.0.0.1:5173/#/tools/eagle-extension`**（5173 为 dashboard dev 端口；生产环境用对应端口）。

页面提供：
- **素材库选择器**——下拉选择 Eagle 数据要进入的库（来自 `Dashboard.getLibraries()` / `GET /api/libraries`）
- **保存**——写入 `data/config.json` 的 `targetLibraryId`
- 服务运行状态、端口、当前目标库、可用库数量

> ⚠️ **未选择目标库时，所有 Eagle 请求会返回 `{ status:'failed', code:'no target library' }`**，启动日志也会提示去配置页选择。

### 配置端点（非库级，自动带 token 鉴权）

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/eagle/config` | GET | 返回 `{ targetLibraryId, port, portCapture, running, libraries:[{id,name,active}] }` |
| `/api/eagle/config` | POST | body `{ targetLibraryId }` → 写入 `data/config.json` |

挂在 `MiraHttpServer.app` 上（在 `/api` 下，自动走 token 中间件；前端调 `authHeaders()` 带 Bearer token）。用 `app._eagleConfigRegistered` 标志位守卫，只注册一次。

## ⚙️ 配置文件

`data/config.json`：

```json
{
  "port": 41595,
  "portCapture": 41593,
  "apiToken": "3f0b58a7-a8a6-4652-8e12-5a6ad45bc77d",
  "recentFoldersLimit": 10,
  "tempDir": "data/temp",
  "allowedPushTypes": ["image", "screen capture", "save-url"],
  "targetLibraryId": ""
}
```

| 字段 | 说明 |
|---|---|
| `port` | Eagle API 协议端口（默认 41595，Eagle 扩展固定访问） |
| `portCapture` | 截图 / 图片推送端口（默认 41593） |
| `apiToken` | Eagle 服务信息里返回的 `developer.apiToken` |
| `recentFoldersLimit` | `listRecent` 返回的最大条数 |
| `tempDir` | 下载 / base64 解码的临时目录（相对插件 data 目录） |
| `allowedPushTypes` | 允许处理的推送 `type` 白名单 |
| `targetLibraryId` | **接收 Eagle 数据的库 ID**（配置页选择，留空则拒绝数据） |


## 🚀 安装与启用

本插件是 **服务端插件**（运行在 `mira-app-server` 主进程，完整 Node 环境），由 `ServerPluginManager` 加载。

1. 插件目录已位于 `plugins/plugins/mira_eagle_extension/`
2. 在 `plugins/plugins/plugins.json` 中添加：
   ```json
   { "name": "mira_eagle_extension", "enabled": true, "path": "mira_eagle_extension" }
   ```
3. （可选）编译：`npm run build`（产物到 `dist/`）。加载器 `require()` 解析 `path`，TS 也能直接被加载（需 ts-node 或与现有插件一致的加载链）
4. 重启 Mira 服务端，启动日志会打印 `[mira_eagle_extension] 已为库 xxx 启动，端口 41595 / 41593`

## 🔌 让 Eagle 浏览器扩展对接 Mira

Eagle 扩展会探测本地 `41595` / `41593` 端口。只要本插件在运行，扩展就会认为"Eagle 已启动"，保存图片时请求会被本插件接收并写入 Mira 当前库——**扩展端无需任何改动**。

## 🛠️ 技术实现

- **零第三方运行时依赖**：用 Node 内置 `http` 模块创建服务器（原版用 express/request），`https.get` 下载远端图
- **完整 Node 环境**：服务端插件无沙箱，可直接 `require('http'/'fs'/'path'/'crypto')`
- **dbService 落库**：URL 类用 `createFile` + `reference`/`path` 存为 URL 引用文件；二进制类用 `createFileFromPath` 落盘去重
- **实时刷新**：导入后广播 `file::created`，前端监听该事件刷新

## ⚠️ 与原版 server.js 的差异

| 项 | 原版 server.js | 本插件 |
|---|---|---|
| 下游目标 | 转发本机 Eagle `:41597` | 直接写入 Mira 当前库 |
| 依赖 | express + body-parser + request | 仅 Node 内置模块 |
| 端口/路径 | 41595 / 41593 | **完全一致** |
| `GET /` 信息结构 | Eagle 风格 | **完全一致** |

## 🐛 故障排除

- **端口被占用**：日志会警告 `EADDRINUSE`——确认没有同时运行 Eagle，或修改 `config.json` 端口（注意 Eagle 扩展固定探测 41595/41593）
- **扩展保存后库里看不到**：确认保存的库就是当前激活库（`dbService.getLibraryId()`）；检查服务端控制台是否有 `addUrlItem` / `importFileFromSource` 报错
- **跨域被拒**：本插件所有响应已加 CORS 头，若仍失败检查是否有反向代理覆盖了响应头
