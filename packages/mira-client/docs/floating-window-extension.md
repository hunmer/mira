# 自定义外部窗口扩展开发指南

> 本文档说明如何在 mira-client 中创建一个**独立于主渲染进程的外部 BrowserWindow**（如全局搜索窗口、桌面通知窗口），并复用通用浮动窗口模板 `FloatingWindowHandler`。
>
> 适用读者：需要新增一种独立悬浮窗口（mini 播放器、悬浮工具箱、全局提示卡片等）的开发者。

---

## 目录

- [一、架构总览](#一架构总览)
- [二、核心概念](#二核心概念)
- [三、文件结构与职责](#三文件结构与职责)
- [四、FloatingWindowHandler API 参考](#四floatingwindowhandler-api-参考)
- [五、从零创建一个新窗口（完整教程）](#五从零创建一个新窗口完整教程)
- [六、进阶：多实例窗口池](#六进阶多实例窗口池)
- [七、构建与打包](#七构建与打包)
- [八、常见问题](#八常见问题)
- [九、检查清单](#九检查清单)

---

## 一、架构总览

浮动窗口采用**三层架构**，与主渲染进程（`dist-renderer`）完全解耦：

```
┌─────────────────────────────────────────────────────────────┐
│                      主进程 (dist-main)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  XxxWindowHandlers.ts                                 │  │
│  │    └─ FloatingWindowHandler (通用基类)                  │  │
│  │         ├─ 创建 BrowserWindow（透明/无边框/置顶）         │  │
│  │         ├─ MessageChannelMain 双向通信                  │  │
│  │         ├─ 屏幕位置定位 (computePosition)               │  │
│  │         └─ messageHandlers (业务消息分发)               │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │ MessagePort                       │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │  preload (dist-preload/xxx-preload.js)                │  │
│  │    └─ connect 消息 → 转发为 DOM MessageEvent + port    │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ window.postMessage(ports)
┌───────────────────────────▼─────────────────────────────────┐
│              浮动窗口渲染层 (dist-float)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  xxx-window.html                                      │  │
│  │    ├─ <script> vendor/vue.global.prod.js  (全局 Vue)    │  │
│  │    ├─ <script> floating-window-core.js    (通用脚手架)   │  │
│  │    └─ <script> xxx-window.js              (业务入口)     │  │
│  │                                                       │  │
│  │  xxx-window.js                                        │  │
│  │    └─ FloatingWindowCore.createBridge({               │  │
│  │         role, onMessage, onReady, onTheme             │  │
│  │       })                                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**消息流向**：

```
浮动窗口渲染层  ──(MessagePort)──▶  FloatingWindowHandler  ──(IPC)──▶  主渲染进程
   (业务 UI)                         (窗口管理 + 消息分发)            (业务逻辑所在)
```

业务逻辑可以放在浮动窗口内（简单场景），也可由基类 `forwardToMainRenderer` 转发给主渲染进程处理（复杂场景，如搜索窗口）。

---

## 二、核心概念

### 2.1 为什么需要独立窗口？

主渲染进程是一个完整的 SPA（Vue + Router + Pinia）。但某些场景需要**独立的轻量窗口**：

| 场景 | 原因 |
|------|------|
| 全局搜索窗口 | 需要置顶、透明、独立于主窗口的生命周期 |
| 桌面通知 | 需要多实例、自动消失、不抢焦点、不进任务栏 |
| 悬浮 mini 播放器 | 需要常驻、可拖拽、跨工作区显示 |

这些窗口通过 `loadFile` 加载独立的 HTML 页面（非 dev server），使用全局 `Vue` 而非主 renderer 的打包产物。

### 2.2 FloatingWindowHandler 做了什么？

通用基类封装了所有窗口管理的"脏活"：

- ✅ 透明、无边框、置顶 `BrowserWindow` 的创建/显示/隐藏/切换/销毁
- ✅ 8 种屏幕位置预设 + 自定义坐标定位（`computePosition`）
- ✅ `MessageChannelMain` 双向通信建立
- ✅ 主题同步（探测主渲染进程 dark/light 并下发）
- ✅ 全屏 loading 遮罩（可选）
- ✅ 开发/生产环境路径自动切换
- ✅ 通用消息处理（拖拽、关闭、开发者工具）

你只需关注**业务消息**和**窗口配置**。

### 2.3 消息通信机制

浮动窗口**不直接访问 Electron API**（`sandbox: true`）。所有通信通过 `MessagePort`：

1. 主进程在窗口 `did-finish-load` 后，通过 `webContents.postMessage('connect', {role}, [port2])` 传递一个 `MessagePort`
2. preload 脚本把 IPC 的 `connect` 事件转发为 DOM 的 `MessageEvent`（携带 port）
3. 渲染层 `FloatingWindowCore.createBridge()` 捕获 port，之后 `bridge.send()` / `port.onmessage` 双向通信

---

## 三、文件结构与职责

以通知窗口为例，新增一个窗口类型涉及以下文件：

```
packages/mira-client/
├── src/
│   ├── main/ipc/
│   │   ├── FloatingWindowHandler.ts        # 🔵 通用基类（无需修改）
│   │   ├── NotificationWindowHandlers.ts   # 🟢 主进程处理器（新增/参考）
│   │   └── handlers.ts                     # 🟡 注册入口（修改：实例化+清理）
│   ├── preload/
│   │   ├── notification-preload.js         # 🟢 窗口专属 preload（新增）
│   │   └── preload.ts                      # 🟡 主渲染 preload（修改：暴露 API）
│   ├── notification-window/                # 🟢 渲染层页面（新增）
│   │   ├── notification-window.html
│   │   └── notification-window.js
│   ├── floating-window/                    # 🔵 通用脚手架（无需修改）
│   │   ├── floating-window-core.js
│   │   └── vendor/vue.global.prod.js
│   └── shared/
│       └── types.ts                        # 🟡 类型定义（修改：新增 API 类型）
├── scripts/
│   └── build-float.js                      # 🟡 构建脚本（修改：新增文件条目）
├── vite.config.ts                          # 🟡 preload 多入口（修改）
├── vite.preload.config.ts                  # 🟡 preload 备用配置（修改）
└── electron-builder.json                   # 🔵 已含 dist-float/dist-preload（无需修改）
```

图例：🔵 无需修改 ｜ 🟢 新增 ｜ 🟡 需修改

---

## 四、FloatingWindowHandler API 参考

### 4.1 配置项 `FloatingWindowOptions`

```ts
interface FloatingWindowOptions {
  name: string                // 标识名（日志用），如 'notification'
  title: string               // 窗口标题
  width: number               // 宽度
  height: number              // 高度
  position?: FloatingWindowPosition  // 屏幕位置，默认 'bottom-right'
  margin?: number             // 距屏幕边缘间距(px)，默认 20
  minWidth?: number           // 最小宽度
  minHeight?: number          // 最小高度
  maxWidth?: number           // 最大宽度
  maxHeight?: number          // 最大高度
  resizable?: boolean         // 可调整大小，默认 false
  movable?: boolean           // 可移动，默认 true
  alwaysOnTop?: boolean       // 始终置顶，默认 true
  hideOnBlur?: boolean        // 失焦时隐藏，默认 false
  skipTaskbar?: boolean       // 不显示在任务栏，默认 false
  showLoading?: boolean       // 创建/显示时触发全屏 loading，默认 true
  htmlFileName: string        // 渲染层 HTML 文件名，如 'notification-window.html'
  htmlDirName: string         // 渲染层源目录名，dev 从 src/<htmlDirName>/ 加载
  preloadFileName: string     // preload 文件名，如 'notification-preload.js'
  ipcChannelPrefix: string    // IPC 前缀，注册 <prefix>:show|hide|toggle
  role: string                // MessagePort 角色标识，下发到渲染层
  messageHandlers?: Record<string, (data, ctx) => void>  // 业务消息处理器
}
```

### 4.2 位置预设 `FloatingWindowPosition`

```ts
type FloatingWindowPosition =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'top' | 'bottom' | 'center'
  | { x: number; y: number }
```

| 位置 | x（水平） | y（垂直） |
|------|-----------|-----------|
| `top-left` | 左边缘 + margin | 顶部 + margin |
| `top-right` | 右边缘 - 宽 - margin | 顶部 + margin |
| `bottom-left` | 左边缘 + margin | 底部 - 高 - margin |
| `bottom-right`（默认） | 右边缘 - 宽 - margin | 底部 - 高 - margin |
| `top` | 水平居中 | 顶部 + margin |
| `bottom` | 水平居中 | 底部 - 高 - margin |
| `center` | 水平居中 | 垂直居中 |
| `{x, y}` | x | y |

### 4.3 消息上下文 `FloatingWindowMessageContext`

每个 `messageHandler` 收到的第二个参数：

```ts
interface FloatingWindowMessageContext {
  window: BrowserWindow | null   // 当前窗口实例
  send: (message: any) => void   // 向当前窗口发消息
  getMainWindow: () => BrowserWindow | null  // 获取主渲染进程窗口
  hide: () => void               // 隐藏当前窗口
}
```

### 4.4 内置消息类型（禁止业务复用）

基类自动处理以下 `data.type`，**你的自定义消息不要用这些名字**：

| type | 行为 |
|------|------|
| `floating-window-ready` | 记录就绪日志 |
| `drag-start` | 临时启用原生拖拽（`-webkit-app-region: drag`，100ms） |
| `close-window` | 隐藏窗口 |
| `toggle-devtools` | 切换开发者工具 |

### 4.5 消息分发顺序

收到消息时，基类按以下顺序处理：

1. 若 `data.type` 属于内置类型 → `handleBuiltinMessage`
2. 否则若 `messageHandlers[data.type]` 存在 → 调用该 handler
3. 否则 → `forwardToMainRenderer`（转发给主渲染进程，通道 `${role}-from-window`）

### 4.6 常用方法

| 方法 | 说明 |
|------|------|
| `createWindow()` | 创建窗口，返回 BrowserWindow |
| `show() / hide() / toggle()` | 显示/隐藏/切换 |
| `sendMessage(msg)` | 经 MessagePort 向窗口发消息 |
| `computePosition(pos?, offset?)` | 计算坐标（返回 {x,y}） |
| `positionWindow(pos?, offset?)` | 计算并设置窗口位置 |
| `clampToScreen()` | 将窗口限制在屏幕可视区内 |
| `resizeHeight(h)` | 调整窗口高度（内容自适应时用） |
| `cleanup()` | 销毁窗口、关闭 MessagePort、移除 IPC handle |
| `getWindow()` | 获取当前 BrowserWindow |

子类可覆盖的 protected 方法：`onReadyToShow()`（控制显示时机）、`getWindowSize()`（动态尺寸）、`createWindowInternal()`、`setupWindowEvents()`、`doShow()` 等。

---

## 五、从零创建一个新窗口（完整教程）

下面以创建一个 **mini 播放器窗口** 为例，演示完整流程。

### 步骤 1：创建渲染层页面

创建 `src/mini-player-window/mini-player-window.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>Mira Mini Player</title>
  <!-- 共用全局 Vue 与通用脚手架（注意相对路径） -->
  <script src="../floating-window/vendor/vue.global.prod.js"></script>
  <script src="../floating-window/floating-window-core.js"></script>
  <style>
    /* Material Icons 字体（路径相对 src/mini-player-window/，向上两级到项目根） */
    @font-face {
      font-family: 'Material Icons';
      src: url('../../assets/fonts/material-icons.ttf') format('truetype');
    }
    .material-icons { font-family: 'Material Icons'; font-size: 24px; }
    body { margin: 0; background: transparent; overflow: hidden; user-select: none; }
    #mini-player-app { width: 100vw; height: 100vh; }
    .player-card {
      width: 280px; height: 60px;
      background: #1f2937; border-radius: 12px;
      box-shadow: 0 10px 30px -5px rgba(0,0,0,.5);
      display: flex; align-items: center; padding: 0 12px; gap: 8px;
      cursor: move; /* 整卡可拖拽 */
    }
  </style>
</head>
<body>
  <div id="mini-player-app"></div>
  <script src="./mini-player-window.js"></script>
</body>
</html>
```

> **路径说明**：`../floating-window/...` 在源码中指向共享脚手架；构建时 `build-float.js` 会扁平化到 `dist-float/` 并重写为同级引用。字体路径 `../../assets/fonts/...` 在开发环境解析到项目根 `assets/`，在生产环境解析到 `resources/assets/`（extraResources）。

创建 `src/mini-player-window/mini-player-window.js`：

```js
/**
 * Mini Player 窗口入口
 */
let bridge = null

window.addEventListener('DOMContentLoaded', async () => {
  const Core = window.FloatingWindowCore
  if (!Core || typeof Vue === 'undefined') {
    document.getElementById('mini-player-app').innerHTML =
      '<div style="padding:2rem;color:#ef4444;text-align:center;">初始化失败</div>'
    return
  }
  await initMiniPlayer()
})

async function initMiniPlayer() {
  const Core = window.FloatingWindowCore

  // 建立与主进程的通信
  bridge = Core.createBridge({
    role: 'mini-player',
    onMessage: (data) => {
      // 接收主进程下发的播放状态
      if (data.type === 'player-state') {
        appVM.state = data.payload
      }
    },
    onReady: () => {
      bridge.send({ type: 'player-ready', timestamp: Date.now() })
    },
  })
  bridge.start()

  // 注册通用快捷键（ESC 关闭、F12 开发者工具）
  Core.registerDefaultShortcuts(bridge)

  const { createApp } = Vue
  const app = createApp({
    data() {
      return { state: { title: '未在播放', playing: false } }
    },
    template: `
      <div class="player-card" @mousedown="onDragStart">
        <span class="material-icons">{{ state.playing ? 'pause' : 'play_arrow' }}</span>
        <span style="flex:1;color:#fff;font-size:13px;">{{ state.title }}</span>
      </div>
    `,
    methods: {
      onDragStart() {
        bridge.send({ type: 'drag-start', timestamp: Date.now() })
      },
    },
  })
  const appVM = app.mount('#mini-player-app')
}
```

### 步骤 2：创建 preload 脚本

创建 `src/preload/mini-player-preload.js`（参考 `notification-preload.js`）：

```js
/**
 * Mini Player 窗口 preload：桥接 MessagePort
 */
const { ipcRenderer, contextBridge } = require('electron')

ipcRenderer.on('connect', (event, payload) => {
  const [port] = event.ports
  if (port) {
    window.dispatchEvent(new MessageEvent('message', {
      data: payload,        // { role: 'mini-player' }
      ports: [port],
      origin: location.origin,
    }))
  }
})

// 如需暴露额外 API 可在此扩展
contextBridge.exposeInMainWorld('electronAPI', {})
```

### 步骤 3：创建主进程处理器

创建 `src/main/ipc/MiniPlayerWindowHandlers.ts`：

```ts
import { ipcMain } from 'electron'
import {
  FloatingWindowHandler,
  type FloatingWindowOptions,
} from './FloatingWindowHandler'

export interface MiniPlayerPayload {
  title?: string
  playing?: boolean
}

/**
 * Mini Player 窗口管理器（单实例）
 */
export class MiniPlayerWindowHandlers {
  private handler: FloatingWindowHandler

  constructor() {
    const options: FloatingWindowOptions = {
      name: 'mini-player',
      title: 'Mira Mini Player',
      width: 300,
      height: 70,
      position: 'bottom-right',
      movable: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      showLoading: false,    // 不触发全屏 loading
      htmlFileName: 'mini-player-window.html',
      htmlDirName: 'mini-player-window',
      preloadFileName: 'mini-player-preload.js',
      ipcChannelPrefix: 'mini-player-window',
      role: 'mini-player',
      messageHandlers: {
        'player-ready': () => {
          console.log('[MiniPlayer] 窗口已就绪')
        },
        // 业务消息示例：转发给主渲染进程
        'player-command': (data, ctx) => {
          const mainWindow = ctx.getMainWindow()
          mainWindow?.webContents.send('mini-player-from-window', data)
        },
      },
    }

    this.handler = new FloatingWindowHandler(options)

    // 注册业务专用 IPC（供主渲染进程调用）
    ipcMain.handle('mini-player:show', () => this.handler.show())
    ipcMain.handle('mini-player:hide', () => this.handler.hide())
    ipcMain.handle('mini-player:update', (_e, payload: MiniPlayerPayload) => {
      this.handler.sendMessage({ type: 'player-state', payload })
    })
  }

  public async show(): Promise<void> {
    return this.handler.show()
  }

  public async hide(): Promise<void> {
    return this.handler.hide()
  }

  public updateState(payload: MiniPlayerPayload): void {
    this.handler.sendMessage({ type: 'player-state', payload })
  }

  public cleanup(): void {
    ipcMain.removeHandler('mini-player:show')
    ipcMain.removeHandler('mini-player:hide')
    ipcMain.removeHandler('mini-player:update')
    this.handler.cleanup()
  }
}
```

### 步骤 4：注册到 IPCHandlers

修改 `src/main/ipc/handlers.ts`：

```ts
import { MiniPlayerWindowHandlers } from './MiniPlayerWindowHandlers'

export class IPCHandlers {
  // ...其他字段
  private miniPlayerHandlers: MiniPlayerWindowHandlers

  constructor() {
    // ...其他处理器
    this.miniPlayerHandlers = new MiniPlayerWindowHandlers()
  }

  // 在 removeAllHandlers() 中清理：
  public removeAllHandlers(): void {
    // ...
    this.miniPlayerHandlers.cleanup()
    // ...
  }
}
```

### 步骤 5：暴露 API 到主渲染进程

修改 `src/shared/types.ts`，在 `ElectronAPI` 接口中添加：

```ts
// Mini Player 窗口 API
miniPlayer: {
  show: () => Promise<void>
  hide: () => Promise<void>
  update: (payload: { title?: string; playing?: boolean }) => Promise<void>
}
```

修改 `src/preload/preload.ts`：

```ts
// Mini Player 窗口 API
miniPlayer: {
  show: () => ipcRenderer.invoke('mini-player:show'),
  hide: () => ipcRenderer.invoke('mini-player:hide'),
  update: (payload) => ipcRenderer.invoke('mini-player:update', payload),
},
```

现在在主渲染进程中即可调用：

```ts
// 显示 mini player
await window.electronAPI.miniPlayer.show()
// 更新播放状态
await window.electronAPI.miniPlayer.update({ title: '视频.mp4', playing: true })
```

### 步骤 6：更新构建配置

**6a.** 修改 `scripts/build-float.js`，在 `filesToCopy` 数组中追加：

```js
const filesToCopy = [
  // ...已有条目
  ['src/mini-player-window/mini-player-window.html', 'mini-player-window.html'],
  ['src/mini-player-window/mini-player-window.js', 'mini-player-window.js'],
]
```

**6b.** 修改 `vite.config.ts` 的 preload 多入口，增加：

```ts
entry: {
  preload: 'src/preload/preload.ts',
  'search-preload': 'src/preload/search-preload.js',
  'notification-preload': 'src/preload/notification-preload.js',
  'mini-player-preload': 'src/preload/mini-player-preload.js',  // 新增
},
```

**6c.** 同样修改 `vite.preload.config.ts`（保持两个配置一致）。

> `electron-builder.json` **无需修改**——`dist-float/**/*` 和 `dist-preload/**/*` 已被通配包含。

---

## 六、进阶：多实例窗口池

通知窗口是**多实例并存**的典型：每条通知是一个独立的 `FloatingWindowHandler` 实例。如果新窗口需要多实例，参考 `NotificationWindowHandlers` 的窗口池架构：

### 关键点

1. **每实例唯一 IPC 前缀**：基类构造时会注册 `<prefix>:show|hide|toggle`，多实例必须用唯一前缀（如 `notification-slot-${id}`），否则 `ipcMain.handle` 会报"重复注册"错误。

2. **role 可共享**：`role` 仅用于渲染层 bridge 过滤，多实例可共用同一 role（如 `'notification'`），因为每个窗口的 `MessagePort` 天然隔离。

3. **用匿名子类覆盖 `onReadyToShow`**：内容渲染完成后再定位+显示：

```ts
const handler = new (class extends FloatingWindowHandler {
  protected onReadyToShow(): void {
    // 自定义定位逻辑
    self.positionSlot(this, position, index)
    this.doShow()
  }
})({
  /* FloatingWindowOptions */
  ipcChannelPrefix: `xxx-slot-${id}`,  // 唯一前缀
  role: 'xxx',                          // 共享 role
  showLoading: false,
  // ...
})
```

4. **堆叠管理**：维护一个 `slots: NotificationSlot[]` 数组，关闭时 `relayout()` 重排剩余实例。

5. **自定义拖拽**：通知窗口用 `nt-drag-start/move/end`（非内置 `drag-start`），渲染层 JS 计算增量，主进程 `setPosition` 移动并 clamp。详见 `NotificationWindowHandlers.dragAxis` + `notification-window.js` 的拖拽实现。

---

## 七、构建与打包

### 7.1 构建命令

```bash
# 构建浮动窗口（拷贝 HTML/JS 到 dist-float/，扁平化目录）
pnpm run build:float

# 构建全部（renderer + main + preload + float）
pnpm run build:all

# 生产构建
pnpm run build:prod
```

### 7.2 构建产物结构

```
dist-float/
  mini-player-window.html      # HTML（脚本引用已重写为同级）
  mini-player-window.js
  floating-window-core.js      # 共享脚手架
  vendor/vue.global.prod.js    # 共享 Vue

dist-preload/
  mini-player-preload.js       # preload（CJS 格式）

dist-main/
  main.js                      # 主进程（含你的 Handler，打包进单文件）
```

### 7.3 开发 vs 生产路径

| 环境 | HTML 加载路径 | preload 加载路径 |
|------|--------------|-----------------|
| 开发 (`app.isPackaged === false`) | `src/<htmlDirName>/<htmlFileName>` | `src/preload/<preloadFileName>` |
| 生产 (`app.isPackaged === true`) | `dist-float/<htmlFileName>` | `dist-preload/<preloadFileName>` |

由 `FloatingWindowHandler.createWindowInternal` 根据 `app.isPackaged` 自动切换。

### 7.4 为什么不用 Vite 打包浮动窗口？

浮动窗口使用**全局 `<script>` 标签**加载（非 ES module），因为它们使用全局 `Vue` 而非 npm 包。Vite 的 MPA 构建无法正确处理全局脚本（会报 "can't be bundled without type=module"）。因此采用 `build-float.js` 直接拷贝 + 重写 HTML 引用的方式。

---

## 八、常见问题

### Q1：窗口创建了但不显示？

检查 `showLoading` 选项。默认 `showLoading: true` 会触发全屏 loading，且窗口在 `ready-to-show` 时自动显示。若设为 `false`（通知窗口），需覆盖 `onReadyToShow()` 显式调用 `doShow()`，否则窗口创建后不会显示。

### Q2：`ipcMain.handle` 报"second handler"错误？

`ipcChannelPrefix` 必须全局唯一。基类注册了 `<prefix>:show|hide|toggle` 三个 handle。多实例时务必用 `xxx-slot-${id}` 这样的唯一前缀。

### Q3：渲染层收不到消息？

1. 确认 preload 的 `role` 与 `FloatingWindowOptions.role` 一致
2. 确认 `bridge.start()` 已调用
3. preload 必须正确转发 `connect` 事件（把 `event.ports` 传到 DOM MessageEvent）

### Q4：拖拽不生效？

通知窗口使用**自定义 JS 拖拽**（`nt-drag-*` 消息 + 主进程 `setPosition`），而非内置的 `drag-start`（`-webkit-app-region` hack，对动态设置的卡片不可靠）。如需拖拽，参考通知窗口的实现。

### Q5：生产环境窗口白屏？

确认 `dist-float/` 中包含你的 HTML/JS 文件，且 HTML 内的脚本引用已被 `build-float.js` 重写为扁平路径（`vendor/vue.global.prod.js` 而非 `../floating-window/vendor/...`）。

### Q6：如何调试浮动窗口？

在渲染层发 `toggle-devtools` 消息（已内置），或按 `F12`（`FloatingWindowCore.registerDefaultShortcuts` 已绑定）。开发环境也可在主进程临时加 `window.webContents.openDevTools()`。

---

## 九、检查清单

新增一个浮动窗口时，对照以下清单确认无遗漏：

- [ ] **渲染层**：`src/<name>-window/<name>-window.html` + `.js`，正确引用 `../floating-window/vendor/vue.global.prod.js` 和 `floating-window-core.js`
- [ ] **preload**：`src/preload/<name>-preload.js`，转发 `connect` MessagePort
- [ ] **主进程 Handler**：`src/main/ipc/<Name>WindowHandlers.ts`，配置 `FloatingWindowOptions`
- [ ] **handlers.ts**：实例化 Handler + `cleanup()` 清理
- [ ] **preload.ts**：主渲染进程暴露 API（`window.electronAPI.xxx`）
- [ ] **types.ts**：`ElectronAPI` 接口新增对应类型
- [ ] **build-float.js**：`filesToCopy` 追加 HTML + JS 条目
- [ ] **vite.config.ts** + **vite.preload.config.ts**：preload 多入口新增条目
- [ ] **消息类型**：未与内置类型（`floating-window-ready`/`drag-start`/`close-window`/`toggle-devtools`）冲突
- [ ] **验证**：`pnpm type-check` 通过 + `pnpm build:all` 通过

---

> **参考实现**：
> - 单实例窗口：`SearchWindowHandlers.ts`（居中、可调整大小、业务消息转发）
> - 多实例窗口池：`NotificationWindowHandlers.ts`（右下角堆叠、自动消失、拖拽、动画）
> - 渲染层模板：`notification-window.js` / `search-window.js`
