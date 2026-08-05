# Mira 浏览器扩展设计文档

- **日期**:2026-08-06
- **状态**:已通过设计评审,待写实现计划
- **位置**:`packages/mira-browser-extension`(新建独立 package,加入 `pnpm-workspace.yaml`)

## 1. 目标与范围

构建一个 Chrome MV3 扩展,作为 Mira 素材库的网页侧采集入口。核心能力:

1. **网页截图**:可视区域 / 整页滚动拼接 / 选区 三模式,截图后上传到目标库
2. **拖拽上传**:两个入口 —— 页面拖起图片时弹出 popover 快传按钮;插件面板本身作为拖放区接收文件
3. **资源嗅探**:被动采集页面的图片 / 音频 / 视频 资源 URL,可选上传
4. **自动滚动**:自动滚动页面触发懒加载,配合嗅探采集动态资源
5. **设置面板**:服务器地址、用户名/密码、目标素材库(及文件夹/默认标签)、UI 模式、各功能开关
6. **双 UI 形态**:popup 与 side panel 二选一,设置里切换,同一套组件适配

**关键约束**:插件与后端的 API 通信**必须通过 `mira-app-core` 提供的 dist SDK**(`MiraClient`),不手写纯 HTTP。

## 2. 关键决策(已确认)

| 决策点 | 选择 | 说明 |
|--------|------|------|
| 认证方式 | 用户名+密码登录 | SDK `auth().login()` 拿 accessToken,缓存 token;无独立 API key 体系 |
| SDK 集成 | 打包集成 ESM | `@crxjs/vite-plugin` 打包,`import { MiraClient } from 'mira-app-core'`,axios 等依赖一起 bundle |
| 交付范围 | 全部功能进一个 spec | 截图、拖拽、嗅探、自动滚动、popup/side panel 一次性覆盖 |
| 资源嗅探实现 | DOM 解析 + PerformanceObserver | 双通道互补,覆盖静态与动态加载 |
| 拖拽 popover | 两种入口都要 | 页面拖起图片弹快传按钮 + 面板本身也是拖放区 |
| 截图范围 | 可视 / 整页 / 选区 三模式 | 图像处理走 offscreen document |
| popup 与 side panel | 二选一可切换 | 设置里切 `uiMode`,同一套组件适配两种容器 |
| 代码位置 | 新建独立 package | `packages/mira-browser-extension`,加入 workspace |

## 3. 整体架构(方案 A:模块化分层)

**service worker 是唯一的后端通信出口**。所有调用 SDK 的请求(登录、列素材库、上传、列文件)都在 service worker 内通过 `MiraClient` 发出。content script 和 UI 不直接 import SDK、不直接发 HTTP,通过 `chrome.runtime.sendMessage` 向 service worker 请求。

这样做的原因:content script 运行在宿主页面 CSP 之下,跨域上传和 axios 会被拦;UI(popup)生命周期短。收敛到 service worker 规避 CSP/跨域问题,保证 SDK 单例、token、上传队列状态一致。

### 三层角色与职责

| 角色 | 运行环境 | 职责 | 持有 SDK |
|------|---------|------|----------|
| **service worker** (background) | 扩展独立 JS 上下文 | SDK 单例、token、上传队列、截图捕获、设置读写、库列表缓存 | ✅ 唯一 |
| **content script** | 注入到网页 | DOM 嗅探、拖拽 popover、自动滚动执行、选区覆盖层 | ❌ |
| **UI** (popup / side panel) | 扩展独立页面 | 设置面板、上传/嗅探列表展示、拖放区、触发操作 | ❌ |

## 4. 包结构与构建

### 目录结构

```
packages/mira-browser-extension/
├── package.json              # name: mira-browser-extension, private: true
├── tsconfig.json             # 继承根 tsconfig, strict
├── vite.config.ts            # @crxjs/vite-plugin + 多入口配置
├── src/
│   ├── manifest.ts           # MV3 manifest 定义(程序化生成)
│   ├── background/           # service worker(SDK 唯一持有者)
│   │   ├── index.ts          # 入口:消息路由、生命周期
│   │   ├── mira-client.ts    # MiraClient 单例 + token 缓存 + 自动重登
│   │   ├── uploader.ts       # 上传队列(并发控制、重试)
│   │   ├── capturer.ts       # 截图捕获(captureVisibleTab + 整页拼接)
│   │   ├── offscreen.ts      # offscreen document 管理(图像处理)
│   │   └── settings.ts       # 设置读写(chrome.storage)
│   ├── content/              # content script(注入页面)
│   │   ├── index.ts          # 入口:消息路由
│   │   ├── sniffer.ts        # DOM + PerformanceObserver 嗅探
│   │   ├── dragdrop.ts       # 拖拽图片 popover 快传按钮
│   │   ├── autoscroll.ts     # 自动滚动执行器(共享)
│   │   └── overlay/          # 选区截图覆盖层
│   │       └── selection.ts
│   ├── ui/                   # popup + side panel 共用 UI
│   │   ├── popup.html        # popup 入口
│   │   ├── sidepanel.html    # side panel 入口
│   │   ├── App.vue           # 共用根组件(按容器形态适配)
│   │   ├── composables/      # useBackground / useUploadQueue 等
│   │   ├── components/        # 设置面板、上传列表、嗅探列表、拖放区
│   │   └── assets/
│   └── shared/               # service worker / content / ui 共享
│       ├── messages.ts       # 消息类型 + 校验
│       ├── staged-file.ts    # 跨上下文文件序列化(StagedFile)
│       ├── storage.ts        # chrome.storage schema 与封装
│       └── types.ts          # 资源、上传任务、设置等类型
├── icons/                    # 扩展图标
└── README.md
```

### 技术选型

- **打包**:`@crxjs/vite-plugin`(MV3 专用,HMR、manifest 自动生成、多入口处理成熟)
- **框架**:Vue 3 + shadcn-vue(与 `mira-client`、`mira-dashboard-next` 技术栈一致,复用 monorepo 既有约定,遵循 `@/components/ui`)
- **SDK 集成**:`import { MiraClient } from 'mira-app-core'`,Vite 打包时把 `mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs` 及 axios 依赖一起 bundle 进 service worker

### 依赖

```json
{
  "dependencies": {
    "mira-app-core": "workspace:*",
    "vue": "^3.x"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.x",
    "vite": "^6.x",
    "@vitejs/plugin-vue": "^5.x"
  }
}
```

`mira-app-core` 用 `workspace:*`,直接从 monorepo 引用,无需发布。

## 5. 消息总线与数据流

### 消息协议

所有跨上下文消息走统一的类型化协议,定义在 `src/shared/messages.ts`。每条消息有 `type` 和 `payload`,service worker 维护一个 `type → handler` 路由表。

```ts
// src/shared/messages.ts
export type Request =
  // —— 认证 / 配置 ——
  | { type: 'AUTH_LOGIN'; payload: { username: string; password: string } }
  | { type: 'AUTH_VERIFY' }
  | { type: 'CONFIG_GET' }
  | { type: 'CONFIG_SET'; payload: Partial<ExtensionSettings> }
  // —— 素材库 ——
  | { type: 'LIB_LIST' }
  // —— 上传 ——
  | { type: 'UPLOAD_FILES'; payload: { files: StagedFile[]; libraryId: string; tags?: string[]; folderId?: string } }
  | { type: 'UPLOAD_FROM_URL'; payload: { url: string; kind: ResourceKind; libraryId: string } }
  | { type: 'UPLOAD_STATUS' }
  | { type: 'UPLOAD_CANCEL'; payload: { id: string } }
  // —— 截图 ——
  | { type: 'CAPTURE_VISIBLE'; payload: { tabId: number } }
  | { type: 'CAPTURE_FULLPAGE'; payload: { tabId: number } }
  | { type: 'CAPTURE_SELECTION'; payload: { tabId: number } }
  // —— 嗅探 ——
  | { type: 'SNIFFER_START'; payload: { tabId: number; kinds: ResourceKind[] } }
  | { type: 'SNIFFER_STOP'; payload: { tabId: number } }
  | { type: 'SNIFFER_QUERY'; payload: { tabId: number } }
  // —— 自动滚动 ——
  | { type: 'AUTOSCROLL_START'; payload: { tabId: number } }
  | { type: 'AUTOSCROLL_STOP'; payload: { tabId: number } };

// service worker → 推送(content script / UI 监听)
export type Event =
  | { type: 'UPLOAD_PROGRESS'; payload: { id: string; percent: number; status: UploadStatus } }
  | { type: 'SNIFFER_FOUND'; payload: { tabId: number; resources: SniffedResource[] } }
  | { type: 'AUTH_EXPIRED' };

// service worker → content script(经 chrome.tabs.sendMessage,带 tabId)
export type ContentCommand =
  | { type: 'SNIFFER_START'; payload: { kinds: ResourceKind[] } }
  | { type: 'SNIFFER_STOP' }
  | { type: 'AUTOSCROLL_START'; payload: { delay: number } }
  | { type: 'AUTOSCROLL_STOP' }
  | { type: 'START_SCROLL_CAPTURE'; payload: { delay: number } }  // 整页截图
  | { type: 'DRAW_SELECTION' }                                    // 选区截图
  | { type: 'DISPATCH_DRAGDROP'; payload: { enabled: boolean } }; // 启停拖拽 popover
```

### 消息通道区分

- **content script → service worker**:`chrome.runtime.sendMessage`(标准 runtime 消息)
- **service worker → content script**:`chrome.tabs.sendMessage(tabId, msg)`(必须带 tabId)
- **UI ↔ service worker**:双向都用 `chrome.runtime` 消息;service worker 状态变更(上传进度、新嗅探资源)通过 `chrome.runtime.onMessage` 广播,UI 监听刷新

### 关键数据流

**1. 上传一张拖拽的图片(UI 拖放区 → service worker → SDK)**
```
UI 拖放区 ondrop
  → File 转 StagedFile({name, type, arrayBuffer})
  → sendMessage(UPLOAD_FILES, { files, libraryId })
  → service worker: uploader.enqueue() → 重建 File → miraClient.files().uploadFile()
  → onUploadProgress 回调 → 推 UPLOAD_PROGRESS 事件 → UI 监听刷新
```

**2. 页面拖起图片弹 popover(content script 自治 → 需上传时才上报)**
```
content script dragdrop.ts 监听 dragstart
  → 本地渲染 popover(不上报 service worker)
  → 用户拖到 popover 按钮 → ondrop
  → 拿到 File 或图片 URL
  → sendMessage(UPLOAD_FILES | UPLOAD_FROM_URL)
  → service worker 走上传队列
```

**3. 选区截图(content script 覆盖层 + service worker 捕获)**
```
UI → sendMessage(CAPTURE_SELECTION, { tabId })
  → service worker → chrome.tabs.sendMessage(tabId, 'DRAW_SELECTION')
  → content script overlay/selection.ts: 画半透明覆盖层 + 选框,用户框选返回 {rect}
  → service worker: captureVisibleTab() → offscreen 裁剪
  → 转 File → 进上传队列
```

## 6. 设置面板与存储

### 设置项

| 区块 | 字段 | 说明 |
|------|------|------|
| **连接** | `serverURL` | 后台服务器地址(如 `http://localhost:8081`) |
| | `username` / `password` | 登录凭据,触发登录拿 token |
| | `connectionStatus` | 派生状态:未连接/已连接/连接中/失败 |
| **目标** | `libraryId` | 上传的目标素材库(下拉,来自 `LIB_LIST`) |
| | `folderId` | 可选,目标文件夹(下拉,基于所选库) |
| | `tags` | 可选,上传时默认附加的标签 |
| **界面** | `uiMode` | `popup` \| `sidePanel`,决定点击图标的入口形态 |
| | `dragPopoverEnabled` | 是否启用页面拖拽图片的快传按钮 |
| | `dropZoneEnabled` | 是否启用面板拖放区 |
| **采集** | `snifferEnabled` | 是否开启资源嗅探 |
| | `snifferKinds` | `['image','audio','video']` 多选 |
| | `autoScrollEnabled` | 是否开启自动滚动 |
| | `autoScrollDelay` | 滚动间隔(ms) |

### Settings schema

```ts
export interface ExtensionSettings {
  serverURL: string;
  username: string;
  password: string;
  libraryId: string;
  folderId?: string;
  tags: string[];
  uiMode: 'popup' | 'sidePanel';
  dragPopoverEnabled: boolean;
  dropZoneEnabled: boolean;
  snifferEnabled: boolean;
  snifferKinds: ResourceKind[];
  autoScrollEnabled: boolean;
  autoScrollDelay: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  serverURL: '',
  username: '',
  password: '',
  libraryId: '',
  tags: [],
  uiMode: 'popup',
  dragPopoverEnabled: true,
  dropZoneEnabled: true,
  snifferEnabled: false,
  snifferKinds: ['image', 'audio', 'video'],
  autoScrollEnabled: false,
  autoScrollDelay: 800,
};
```

### 存储分层

| 存储 | 内容 | 原因 |
|------|------|------|
| `chrome.storage.local` | `serverURL`、`libraryId`、`uiMode`、各开关、`tags`、`folderId`、`username` | 非敏感、较大、需要持久 |
| `chrome.storage.session` | `password`、`token`(运行期) | 敏感数据,session 在浏览器关闭时清除,减少泄露面 |

session storage 在 service worker 重启间**保留**(仅浏览器关闭时清),适合放 token。password 放 session storage 是 MV3 下的合理默认(不进磁盘持久化)。

### 设置变更联动

- **`serverURL` / `username` / `password` 改动** → 失效当前 token → 触发重新 `login()` → 刷新连接状态
- **`serverURL` / `libraryId` 改动** → 重新拉 `LIB_LIST` / 文件夹列表,刷新下拉
- **`uiMode` 改动** → `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick })`:选 `sidePanel` 时 true,选 `popup` 时 false
- **`snifferEnabled` / `autoScrollEnabled` 改动** → 向当前 tab 的 content script 发消息启停对应模块

### 存储 API 边界

`src/background/settings.ts` 封装读写。UI 与 content script 都通过 `CONFIG_GET` / `CONFIG_SET` 消息访问(不直接碰 storage 写),保持"service worker 为唯一写入点"。读取可放宽:UI 直接读 `chrome.storage.local` 用于快速渲染。

### 首次配置流程

```
打开 popup/side panel(无有效 token)
  → 显示「连接」表单(服务器地址 + 用户名 + 密码)
  → 用户填写 → AUTH_LOGIN
  → service worker: miraClient.auth().login() 成功
  → 缓存 token 到 session storage
  → 自动拉 LIB_LIST,libraryId 默认选第一个 active 库
  → 进入主界面
```

连接失败时表单原地显示错误(复用 SDK 的 `ErrorResponse`)。

## 7. 截图子系统

### 三模式总览

| 模式 | 触发 | 流程核心 |
|------|------|---------|
| 可视区域 | UI 按钮 / 快捷键 | `chrome.tabs.captureVisibleTab()` → 直出 |
| 整页滚动 | UI 按钮 / 快捷键 | 自动滚动 + 多次 `captureVisibleTab` + 拼接 |
| 选区 | UI 按钮 / 快捷键 | content script 画选框 → 可视截图 → 按 rect 裁剪 |

三模式完成后统一转 File → 进上传队列 → 上传到目标库(复用 `UPLOAD_FILES` 链路)。

### 图像处理:offscreen document

MV3 service worker 无 DOM、无 Canvas。所有需 Canvas 的操作(拼接、裁剪)走 **offscreen document**(`chrome.offscreen` API,需 Chrome 116+)。offscreen document 单例(整个扩展生命周期内一个),封装在 `src/background/offscreen.ts`。

```
service worker 拿到原始 PNG dataURL
  → 创建/复用 offscreen document
  → sendMessage 到 offscreen: { type:'STITCH'|'CROP', frames:[...], rect }
  → offscreen 用 Canvas 处理 → 返回 dataURL
  → service worker 转 File → 入上传队列
```

### 模式 1:可视区域截图

1. service worker 调 `chrome.tabs.captureVisibleTab(windowId, { format: 'png' })`
2. dataURL → Blob → File(`screenshot-<timestamp>.png`)
3. 入上传队列。无 offscreen 参与。

### 模式 2:整页滚动截图

复用 §9 的自动滚动执行器(独立于"采集用自动滚动",不污染页面状态):

1. service worker 向 content script 发 `START_SCROLL_CAPTURE`(带 `autoScrollDelay`、`scrollHeight`)
2. content script:
   - 记录原滚动位置 `restoreY = window.scrollY`
   - 循环:`window.scrollTo(0, y)` → 等一帧 → 通知 service worker "到位" → service worker `captureVisibleTab` 累积帧 → `y += viewportHeight`
   - 到底停止,恢复 `window.scrollTo(0, restoreY)`
3. service worker 把帧序列发 offscreen 拼接(处理最后一帧高度不足裁剪、`devicePixelRatio` 缩放)
4. dataURL → File → 入队列

**已知限制**:页面 `position: fixed` 元素(如顶栏)在每帧重复出现。MVP 先不特殊处理,接受重复。

### 模式 3:选区截图

1. service worker → content script `DRAW_SELECTION`
2. content script `overlay/selection.ts` 注入覆盖层:
   - 全屏半透明遮罩 + 可拖拽选框(dashed border + 尺寸提示)
   - 鼠标拖动确定矩形 `{ x, y, w, h }`(相对 viewport)
   - 按 Esc 取消,松开鼠标确认 → 返回 rect 给 service worker
3. service worker: `captureVisibleTab()` 拿当前可视图
4. rect + `devicePixelRatio` → 发 offscreen 裁剪
5. dataURL → File → 入队列

覆盖层是 content script 注入的 DOM,不依赖宿主页面,z-index 拉满、`pointer-events` 全接管。

### 上传命名与元数据

- `title`:`screenshot-<域名>-<时间戳>.png`
- `tags`:合并设置默认 tags + `['screenshot', 域名]`
- 用 SDK 的 `files().uploadFile(file, libraryId, { tags, folderId })`,走标准上传链路

### 命令入口

| 入口 | 行为 |
|------|------|
| popup/side panel 按钮 | 三按钮:可视 / 整页 / 选区 |
| 右键菜单 | 页面右键 → 三选项 |
| 快捷键 | `manifest.commands` 注册:`capture-visible`、`capture-fullpage`、`capture-selection`(默认无键,用户在 chrome://extensions/shortcuts 自设) |

快捷键命令在 service worker 的 `chrome.commands.onCommand` 接收。

### 错误处理

| 场景 | 处理 |
|------|------|
| `captureVisibleTab` 失败(chrome:// 页面、商店页) | service worker 捕获 → 推 toast 提示"该页面不支持截图" |
| 选区覆盖层注入失败 | content script 上报错误 → service worker 回退提示 |
| offscreen 创建失败 | 回退:整页/选区模式不可用,仅可视模式可用 + 提示 |

## 8. 资源嗅探子系统

### 目标

开启后,被动收集当前页面已加载/正在加载的图片、音频、视频资源 URL,在面板展示,用户可选上传到目标库。**只采集 URL 和元信息,不自动下载**(尊重流量与隐私),上传由用户触发。

### 嗅探来源:DOM 解析 + PerformanceObserver 双通道

**通道 1:DOM 解析(静态/已插入元素)**

| 资源类型 | 来源选择器 | 提取字段 |
|---------|-----------|---------|
| 图片 | `<img src>` / `<img srcset>` / `background-image`(computed style) | url, 宽高(只对 img 取 naturalWidth/Height) |
| 视频 | `<video src>` / `<video poster>` / `<source src>` | url, poster, 时长(duration,可获取时) |
| audio | `<audio src>` / `<source src>` | url, 时长 |

- **srcset 处理**:解析出多个候选 URL,取最高分辨率那条作为代表 URL,其余存为 `variants`
- **data URL 过滤**:跳过 `data:` 开头的内联资源(无上传价值且体积大)

**通道 2:PerformanceObserver(动态/懒加载资源)**

监听 `PerformanceObserver(['resource'])`,过滤 `entry.initiatorType` ∈ `img`/`video`/`audio`/`css`,按 mime 二次过滤。抓懒加载、JS 动态插入的资源。

### 去重与合并

同一 URL 可能被两通道捕获或重复出现。按 `url` 归并:
- 保留首次出现的元信息,DOM 通道优先级高于 perf
- 记录 `occurrences`(出现次数,用于排序高频资源)

### 资源数据结构

```ts
export type ResourceKind = 'image' | 'audio' | 'video';

export interface SniffedResource {
  id: string;              // url 派生 hash,去重用
  url: string;
  kind: ResourceKind;
  source: 'dom' | 'perf';
  width?: number;
  height?: number;
  duration?: number;
  poster?: string;
  mimeType?: string;
  variants?: string[];
  occurrences: number;
  sniffedAt: number;
}
```

### 嗅探生命周期(按 tab)

- **开启**:`snifferEnabled` 变 true 且 tab 加载完成 → service worker 向 content script 发 `SNIFFER_START({ tabId, kinds })`
- **content script**:
  - 立即跑一次 DOM 扫描
  - 启动 PerformanceObserver 监听后续
  - 启动 MutationObserver 监听 DOM 变化(`childList` + `subtree`),新节点触发增量 DOM 扫描(防抖 300ms)
- **停止**:`SNIFFER_STOP` → 断开三个 observer,清空内存资源索引
- **tab 关闭**:随 content script 销毁自动停

### 上报与存储

资源不放 chrome.storage(可能量大):
- content script → service worker 推 `SNIFFER_FOUND`(批量,防抖 500ms)更新"该 tab 最新资源集"
- service worker 缓存每 tab 最近一次的资源快照(内存,Map<tabId, SniffedResource[]>)
- UI 发 `SNIFFER_QUERY({ tabId })` → service worker 返回快照

### UI 展示与上传

- 按类型分组(image/audio/video),每项显示缩略图(图片用 url;视频用 poster;audio 用图标)
- 支持多选 + "上传选中"按钮
- 上传链路:用户点上传 → service worker fetch url 成 Blob → 转 File → 复用 `UPLOAD_FILES` 队列

**跨域 fetch**:资源下载**统一在 service worker 做**(不受页面 CORS 限制,有 host_permissions),content script 只负责发现 URL。

### 过滤规则

- `snifferKinds`:多选要采集的类型
- 最小尺寸过滤(图片宽高 < 32px 过滤,避免图标/占位图噪音)
- 域名黑名单(MVP 不做,默认全收)

### 性能与边界

| 关注点 | 处理 |
|--------|------|
| 大量资源导致 UI 卡顿 | 虚拟滚动列表 |
| MutationObserver 风暴 | 增量扫描防抖 300ms |
| PerformanceObserver 内存 | 只缓存 url+元信息,不缓存响应体 |
| 关闭嗅探时彻底清理 | observer.disconnect + 清空索引 |

## 9. 拖拽与自动滚动

### 9.1 拖拽入口 A:页面拖起图片 → popover 快传按钮

运行在 content script 的 `dragdrop.ts`,完全本地自治(service worker 不参与渲染)。

**监听**(捕获阶段):
```ts
document.addEventListener('dragstart', onDragStart, true);
document.addEventListener('dragend', onDragEnd, true);
```

**触发条件**:`e.target` 是 `<img>` 或 `<video>`,且 `dragPopoverEnabled === true`。

**popover 行为**:
- `dragstart` → 鼠标位置附近插入浮动按钮(`z-index: 2147483646`,仅次于选区覆盖层),显示"上传到素材库"
- 用户拖到按钮上松开(按钮监听 `dragover` preventDefault + `drop`)→ 触发上传
- 拖到别处松开 → `dragend` → 移除按钮

**从元素取 File 的优先级**:
1. `e.dataTransfer` 里若已是 File → 直接用
2. 否则取 `<img>.src` / `<video>.src` → 上报 URL 给 service worker fetch 成 Blob → 转 File

**视频特殊情况**:拖 video 元素上传 video 源文件;poster 图不单独上传。

**上报消息**:
```
content script ondrop
  → 拿到 File: sendMessage(UPLOAD_FILES, { files:[file], libraryId })
  → 只有 URL:  sendMessage(UPLOAD_FROM_URL, { url, kind, libraryId })
```

### 9.2 拖拽入口 B:面板拖放区

popup/side panel UI 里的固定拖放区:
- `dropZoneEnabled === false` 时隐藏
- 接收任意 File → 走 `UPLOAD_FILES` 队列,支持多文件
- 拖放时高亮反馈,上传中显示进度

**跨上下文传 File**:`chrome.runtime.sendMessage` 不能直接序列化 File。方案:popup 里 `File → arrayBuffer`,消息传 `{name, type, arrayBuffer}`;service worker 侧 `new File([arrayBuffer], name, {type})` 重建。封装在 `shared/staged-file.ts`。

### 9.3 自动滚动

两种用途共享同一套底层滚动执行器:
- **采集用自动滚动**:开启后自动滚到底,触发懒加载,配合嗅探抓动态资源
- **截图用滚动**:整页截图专用,由截图流程驱动

**共享滚动执行器 `autoscroll.ts`**

```ts
class AutoScroller {
  start({ step, delay, onArrive, signal });
  stop();
}
```

滚动逻辑:
```
loop:
  beforeY = window.scrollY
  window.scrollBy(0, step)            // step 默认 = viewport 高度 90%
  await waitForRepaint() + delay      // delay = autoScrollDelay
  onArrive?.(window.scrollY)
  if (window.scrollY === beforeY) break                 // 到底
  if (window.innerHeight + scrollY >= scrollHeight - 1) break
```

`waitForRepaint` 用 `requestAnimationFrame` 两帧确认,保证懒加载触发。

**采集用自动滚动**:
- `autoScrollEnabled === true` → service worker 发 `AUTOSCROLL_START`
- content script 启动 AutoScroller(`onArrive` 留空,纯为触发懒加载)
- 到底自动停;用户手动滚动则中断(`scroll`/`wheel`/`touchstart` 监听 + AbortSignal)
- 滚动期间嗅探的 observer 自动抓新加载资源

**截图用滚动**:由 `START_SCROLL_CAPTURE` 驱动,AutoScroller 的 `onArrive(y)` → 通知 service worker 触发 `captureVisibleTab`。截图流程创建独立实例和 AbortSignal。

### 9.4 并发与冲突

- 同一时间只允许一种滚动激活:采集滚动进行时,截图滚动需先停采集(或提示用户)
- content script 维护 "scroll 状态机":`idle | autoscroll-capture | screenshot-scroll`,互斥

### 9.5 边界与限制

| 场景 | 处理 |
|------|------|
| 懒加载未触发 | `delay` 可配置,默认 800ms |
| 无限滚动页面 | 设硬上限 `MAX_SCROLL_FRAMES = 50`,到上限停止 |

## 10. 上传队列与 SDK 封装

### 10.1 SDK 客户端封装 `mira-client.ts`

service worker 内单例,封装 `MiraClient` + token 管理 + 自动重登。

```ts
class MiraClientHolder {
  private client: MiraClient | null = null;

  private rebuild(): void {
    this.client = new MiraClient(this.settings.serverURL, {
      getToken: () => this.getStoredToken(),  // 每次请求实时从 session 取
    });
  }

  async login(creds): Promise<void> {
    const res = await this.client!.auth().login(creds.username, creds.password);
    await storeSession({ token: res.accessToken, username });
  }

  async ensureReady(): Promise<MiraClient> {
    if (!this.client) this.rebuild();
    try {
      await this.client!.auth().verify();
    } catch (e) {
      if (isAuthError(e)) await this.autoRelogin();
    }
    return this.client!;
  }

  private async autoRelogin(): Promise<void> {
    const { username, password } = await loadSession();
    if (username && password) await this.login({ username, password });
    else throw new Error('AUTH_EXPIRED');
  }
}
```

**MV3 service worker 重启处理**:service worker 非持久,30 秒空闲被终止,内存里的 `MiraClient` 实例和 token 会丢。所以:
- `token` 存 `chrome.storage.session`(service worker 重启间保留)
- `MiraClient` 实例不持久化,`ensureReady` 时按需 `rebuild`
- `ClientConfig.getToken` 用函数形式,SDK 每次请求实时从 session 取最新 token

### 10.2 token 失效处理

```
任意 SDK 调用 → HttpClient 拦截器返回 401
  → ensureReady 的 verify 失败 → autoRelogin
  → 成功:重试原请求一次
  → 失败(无缓存凭据 / 凭据失效):抛 AUTH_EXPIRED
  → service worker 推 AUTH_EXPIRED 事件 → UI 切回登录表单
```

所有模块调用都经 `ensureReady()` 包裹,统一兜底。

### 10.3 上传队列 `uploader.ts`

```ts
interface UploadTask {
  id: string;                // uuid
  source: 'screenshot' | 'dragdrop' | 'sniffer' | 'dropzone';
  file: File;
  libraryId: string;
  tags?: string[];
  folderId?: string;
  status: 'queued' | 'uploading' | 'success' | 'failed';
  percent: number;
  error?: string;
  result?: UploadResult;
  createdAt: number;
}
```

**队列行为**:
- **并发控制**:同时最多 `N=3` 个上传
- **进度**:SDK `upload()` 走 axios,支持 `onUploadProgress` 回调 → 更新 task.percent → 广播 `UPLOAD_PROGRESS`
- **失败重试**:网络错误/5xx 自动重试 2 次(间隔 1s);401 走 §10.2 重登后重试;其他错误标 failed
- **取消**:`UPLOAD_CANCEL` → AbortController.abort(),axios 支持 AbortSignal
- **完成清理**:成功的任务延迟 10s 后从队列移除;failed 保留直到用户清除
- **持久化**:队列不持久化(service worker 重启即清空);重启后 UI 显示"队列已重置"

### 10.4 文件重建 pipeline

各上传源拿到文件的方式不同,最终都转换成 service worker 侧的 `File` 再入队:

| 上传源 | 初始形态 | 转换位置 |
|--------|---------|---------|
| 截图 | dataURL(service worker) | service worker:dataURL→Blob→File |
| 拖放区(UI drop) | File(UI) | UI→序列化→SW 重建:arrayBuffer → new File |
| 页面 popover(本地文件) | File(content script) | content script→序列化→SW |
| 页面 popover(URL) | url | SW fetch→Blob→File |
| 嗅探 | url | SW fetch→Blob→File |

封装 `toStagedFile()` 工具函数统一产出,uploader 只认 File。

### 10.5 库与文件夹列表缓存

- 首次登录/切换 serverURL 后,拉一次 `libraries().getAll()` 缓存在内存
- `folderId` 下拉基于所选 `libraryId`,调 `folders()` 模块拉列表;切换 library 时刷新
- 缓存有效期 5 分钟,过期或失败重新拉

### 10.6 错误模型

复用 SDK 的 `ErrorResponse`(HttpClient 已标准化为 `{ error, message, timestamp, stack? }`):
- UI 层显示 `message`
- service worker 日志记 `error` + `stack`
- 认证错误统一转 `AUTH_EXPIRED` 流转

## 11. UI 与交互

### 11.1 双容器共用 UI

popup 和 side panel 是两个独立 HTML 入口,加载同一套 Vue 组件。差异:
- **容器尺寸**:popup 宽 360-400px、高自适应(≤600px);side panel 宽全占、高全占
- **生命周期**:popup 打开即挂载、关闭即销毁;side panel 持久,适合长任务观察

通过 `App.vue` 的 `containerMode` prop('popup' | 'sidePanel')驱动响应式样式。

### 11.2 uiMode 切换机制

```ts
if (key === 'uiMode') {
  if (value === 'sidePanel') {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }
}
```

side panel 需 manifest 声明 `side_panel.default_path`,popup 需声明 `action.default_popup` —— 两者 manifest 里都声明,运行时由 `openPanelOnActionClick` 决定走哪个。

### 11.3 页签式主界面

未登录 → 显示**连接表单**。已登录 → **页签式主界面**:

```
┌─────────────────────────────────────┐
│  Mira · [素材库: 默认库 ▾]          │
│  ─────────────────────────────────  │
│  [ 上传 ] [ 截图 ] [ 嗅探 ] [ 设置 ]│
│  ─────────────────────────────────  │
│                                     │
│            (页签内容区)              │
│                                     │
└─────────────────────────────────────┘
```

顶部全局栏:当前目标库切换(下拉)+ 连接状态指示灯。

**页签 1:上传**
- 拖放区(`dropZoneEnabled` 为 true 时显示),支持多文件
- 上传队列列表:每项含文件名/缩略图、进度条、状态、失败重试/取消按钮
- 监听 `UPLOAD_PROGRESS` 实时刷新,成功项 10s 淡出
- 底部统计:总数 / 成功 / 失败

**页签 2:截图**
- 三按钮:可视区域 / 整页 / 选区
- 截图完成进上传队列,显示最近一次截图缩略预览 + "重拍"按钮
- 错误提示(chrome:// 页等不支持)

**页签 3:嗅探**
- 顶部开关:`snifferEnabled` 切换 + 类型多选(`snifferKinds`)
- 资源列表:按 `kind` 分组,虚拟滚动
  - 图片:缩略图 + 尺寸 + 复选框
  - 视频:poster + 时长 + 复选框
  - audio:图标 + 时长 + 复选框
- 底部:"上传选中(N)" 按钮
- 资源来自 `SNIFFER_QUERY` 拉取 + 监听 `SNIFFER_FOUND` 增量更新

**页签 4:设置**:§6 全部设置项的表单,分四区块,改动实时保存。

### 11.4 组件清单

```
ui/components/
├── ConnectionForm.vue        # 连接表单(未登录态)
├── TabBar.vue                # 页签栏
├── GlobalHeader.vue          # 顶部库切换 + 状态灯
├── upload/
│   ├── UploadView.vue
│   ├── Dropzone.vue
│   ├── UploadQueue.vue
│   └── UploadItem.vue
├── screenshot/
│   └── ScreenshotView.vue
├── sniffer/
│   ├── SnifferView.vue
│   ├── ResourceList.vue
│   └── ResourceItem.vue
└── settings/
    └── SettingsView.vue
```

全部用 shadcn-vue 组件(Button、Input、Tabs、Select、Switch、Checkbox、Card、Progress、Toast),遵循 `@/components/ui` 约定。

### 11.5 消息桥 `ui/composables/useBackground.ts`

UI 不直接散落 `chrome.runtime.sendMessage`,封装成 composable:

```ts
const bg = useBackground();
const libs = await bg.listLibraries();
await bg.uploadFiles(stagedFiles);
const off = bg.onUploadProgress(task => queue.update(task));
await bg.captureVisible({ tabId });
```

内部封装 sendMessage + onMessage 监听 + 响应错误转 Toast。组件只调语义化方法。

### 11.6 状态管理

轻量,**不用 Pinia**。用 Vue 3 `reactive` 在 composable 里管理:
- `useUploadQueue()` → 上传队列响应式状态
- `useSniffer()` → 当前 tab 资源
- `useSettings()` → 设置
- `useConnection()` → 登录状态 + 库列表

**生命周期差异**:
- popup 每次打开重新初始化(从 service worker 拉最新状态),不依赖 popup 内状态持久
- side panel 长生命周期,composable 状态常驻,持续监听实时刷新

### 11.7 与 content script 的交互边界

UI 与 content script 不直接通信。所有需要 content script 配合的操作(选区、嗅探启停、自动滚动、整页截图滚动)都经 service worker 中转。

### 11.8 图标与右键菜单

- **图标**:工具栏图标点击按 uiMode 走 popup/side panel;图标反映连接状态(灰=未连接,绿=已连接)用 `chrome.action.setIcon` 动态切换
- **右键菜单**:`chrome.contextMenus` 注册截图三项 + "上传此图片"(右键 `<img>` 时出现,`contexts: ['image']`),后者直接把图片 URL 发 service worker 上传

## 12. manifest 权限

```json
{
  "manifest_version": 3,
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "scripting",
    "contextMenus",
    "sidePanel",
    "offscreen",
    "commands"
  ],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background/index.js", "type": "module" },
  "action": {
    "default_popup": "ui/popup.html",
    "default_icon": { ... }
  },
  "side_panel": { "default_path": "ui/sidepanel.html" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/index.js"]
  }],
  "commands": {
    "capture-visible": { "description": "截图可视区域" },
    "capture-fullpage": { "description": "整页截图" },
    "capture-selection": { "description": "选区截图" }
  }
}
```

`<all_urls>` 的 host_permissions 是因为:嗅探/拖拽上传需要在任意页面注入 content script,且 service worker 跨域 fetch 资源 URL。可在后续按需收窄(如仅 http/https)。

## 13. 已知限制(MVP 范围外)

| 限制 | 说明 |
|------|------|
| 整页截图 fixed 元素重复 | `position: fixed` 元素每帧重复出现,不特殊处理 |
| 上传队列不持久化 | service worker 重启即清空,UI 提示"队列已重置" |
| 域名黑名单 | 嗅探默认全收,不支持黑名单过滤 |
| 无限流页面上限 | 硬上限 50 屏 |
| 区域截图选区持久 | 每次重新框选,不记忆上次选区 |

## 14. 后续 spec(本设计不覆盖)

以下能力可在本扩展落地后作为独立 spec 推进:
- 截图 fixed 元素隐藏增强
- 上传队列持久化(File 落盘方案)
- 嗅探规则引擎(域名黑名单、正则匹配、自动上传规则)
- 批量操作(多 tab 嗅探聚合、跨页面上传)
