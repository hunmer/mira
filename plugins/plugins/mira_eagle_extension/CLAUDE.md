# mira_eagle_extension

Eagle 浏览器扩展支持（协议 A 类深度插件，单文件 1157 行）。在服务端复刻 Eagle 本地 HTTP 协议（端口 41595 API + 41593 屏幕捕获），让 Eagle 浏览器扩展无需改动即可把网页图片/截图/链接保存进 Mira。模块级全局单例：ServerPluginManager 按库加载、init 会被每个库调用一次，端口只在首个库 bind，入库目标由配置 targetLibraryId 决定。

## 约定

- `main` 为 `index.ts`（不经 tsc 预构建）；`init(inst)` 返回自定义类实例（非 extends ServerPlugin），经 `getRoutes()` 暴露 dashboard 路由
- 复刻的 Eagle API（41595）：`POST /api/item/addFromURLs`、`POST /api/folder/create`、`GET /api/folder/listRecent`，Token 校验
- dashboard 路由 `/tools/eagle-extension`（components/EagleConfig.js，组"工具"）；Mira 侧配置 API `GET/POST /api/eagle/config` 挂在 httpServer.app（走 /api token 中间件）
- 配置 `data/config.json` 默认值：port 41595、portCapture 41593、apiToken `3f0b58a7-…`、targetLibraryId 空（未选库则拒绝并提示）、proxy{enabled,url,sites}、imu{enabled,timeout 15000,iterations 200}、verbose
- 可选能力：网络代理下载远端图片（绕防盗链，sites 支持通配符/!排除）；IMU 原图升级（懒加载插件目录 `maxurl.user.js`，把缩略图 URL 升级为原图，启动时打印探测状态）
- 导入进度经 WebSocket `broadcastLibraryEvent('eagle::import-notification')` 推送；图片下载失败降级保存 URL 引用
- 构建命令：`npm run build`（tsc）；无运行时依赖

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 全部服务端逻辑（1157 行）：双 HTTP 服务、导入、代理、IMU、配置 |
| `components/EagleConfig.js` | dashboard 配置页组件（目标库选择等） |
| `maxurl.user.js` | Image Max URL userscript（可选，原图升级） |

## 扫描状态

- 版本：1.0.0
- 扫描时间：2026-08-20
- 已扫描：index.ts 头部注释与配置默认值、类结构关键行（端口/路由/导入/IMU）、package.json、目录结构
- 未扫描：index.ts 各 handler 完整实现、EagleConfig.js
