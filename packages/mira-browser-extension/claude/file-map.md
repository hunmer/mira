# 文件清单

源码 54 个文件(含测试),按上下文组织。`dist/` 是构建产物(不入索引)。

## 根配置

| 文件 | 用途 |
|------|------|
| `package.json` | 包定义、scripts、依赖 |
| `tsconfig.json` | TS 配置(strict,别名 @/*) |
| `vite.config.ts` | 构建(**含 offscreen rollup input**) |
| `vitest.config.ts` | 测试(node env,别名 @) |
| `manifest.ts` | MV3 manifest 源(→ dist/manifest.json) |
| `README.md` | 开发/构建/加载/手动验证清单 |
| `icons/icon{16,48,128}.png` | 扩展图标(来自 dashboard favicon) |

## src/background/(Service Worker)

| 文件 | 用途 |
|------|------|
| `index.ts` | **SW 入口**,装配 + 监听 |
| `message-router.ts` | Request 路由中心 |
| `mira-client.ts` | SDK 封装(认证) |
| `uploader.ts` | 上传队列 |
| `capturer.ts` | 截图编排 |
| `offscreen.ts` | offscreen 生命周期(reason=BLOBS) |
| `settings.ts` | 设置读写 + 监听 |
| `inject.ts` | content 注入兜底(sendToContent) |
| `context-menus.ts` | 右键菜单 |
| `*.test.ts` | uploader/mira-client 测试 |

## src/content/(注入网页)

| 文件 | 用途 |
|------|------|
| `index.ts` | **content 入口**,装配 + 初始化恢复开关 |
| `sniffer.ts` | 资源嗅探(DOM/perf/mutation) |
| `dragdrop.ts` | 拖拽浮层(文件夹列表+自动滚动) |
| `autoscroll.ts` | 自动滚动器 |
| `overlay/selection.ts` | 选区截图遮罩 |
| `*.test.ts` | sniffer/autoscroll 测试 |

## src/offscreen/(Canvas)

| 文件 | 用途 |
|------|------|
| `index.html` | offscreen 页面 |
| `index.ts` | STITCH/CROP 监听 |
| `image-ops.ts` | stitch/crop 纯逻辑(+ .test) |

## src/ui/(Vue3)

| 文件 | 用途 |
|------|------|
| `main.ts` | **UI 入口**,主题应用 |
| `App.vue` | 根(自动登录/tab/主题) |
| `theme.ts` | 主题工具 |
| `style.css` | CSS 变量(亮/暗) |
| `popup.html` / `sidepanel.html` | 入口 HTML |
| `composables/useBackground.ts` | 消息桥 |
| `composables/useConnection.ts` | 认证 + 自动登录(默认 admin/admin123) |
| `composables/useSettings.ts` | 设置 |
| `composables/useSniffer.ts` | 嗅探 |
| `composables/useUploadQueue.ts` | 上传队列 |
| `components/ConnectionForm.vue` | 登录表单 |
| `components/GlobalHeader.vue` | 头(库选择 + 主题切换) |
| `components/TabBar.vue` | tab 切换 |
| `components/screenshot/ScreenshotView.vue` | 截图视图 |
| `components/sniffer/{SnifferView,ResourceList,ResourceItem}.vue` | 嗅探视图 |
| `components/settings/SettingsView.vue` | 设置视图(含调试开关) |
| `components/upload/{UploadView,Dropzone,UploadQueue,UploadItem}.vue` | 上传视图 |
| `components/ui/{Button,Input,Switch,Progress}.vue` | UI 原语 |

## src/shared/(跨上下文)

| 文件 | 用途 |
|------|------|
| `types.ts` | 类型 + DEFAULT_SETTINGS |
| `messages.ts` | 消息协议 + 守卫(+ .test) |
| `storage.ts` | chrome.storage 封装(+ .test) |
| `staged-file.ts` | 跨上下文文件序列化(number[] / normalizeBytes)(+ .test) |
| `imu.ts` | maxurl 封装(MAIN world 注入) |
| `debug.ts` | 统一日志 + mira_debug 开关 |

## public/

| 文件 | 用途 |
|------|------|
| `maxurl.user.js` | Image Max URL userscript(7.2MB,web_accessible_resource) |

## 关键文件(改动高敏感)

- `shared/staged-file.ts` — 跨上下文序列化,曾连续踩坑,改动需全形态回归
- `background/offscreen.ts` — reason 必须是 BLOBS
- `vite.config.ts` — offscreen rollup input 不能删
- `background/inject.ts` — content 注入兜底,文件名动态读 manifest
- `shared/messages.ts` — 新消息三处都要登记
