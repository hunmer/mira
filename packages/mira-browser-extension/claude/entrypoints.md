# 入口与启动

## 构建入口

构建由 `vite.config.ts` + @crxjs 驱动,入口分两类:

### manifest 声明入口(@crxjs 自动识别)
| 入口 | manifest 字段 | 产物 |
|------|---------------|------|
| `src/background/index.ts` | `background.service_worker`(module) | `service-worker-loader.js` + `assets/index.ts-*.js`(SW bundle) |
| `src/content/index.ts` | `content_scripts[0].js` | `assets/index.ts-loader-*.js`(content bundle) |
| `src/ui/popup.html` | `action.default_popup` | `src/ui/popup.html` |
| `src/ui/sidepanel.html` | `side_panel.default_path` | `src/ui/sidepanel.html` |

### 显式 rollup 入口(非 manifest,@crxjs 不自动构建)
| 入口 | 配置 | 原因 |
|------|------|------|
| `src/offscreen/index.html` | `vite.config.ts` → `build.rollupOptions.input.offscreen` | offscreen 不在 manifest 入口,@crxjs 不会构建;不声明则 `chrome.offscreen.createDocument` 找不到文件 → 整页/选区截图失败。产物 `src/offscreen/index.html` + `assets/offscreen-*.js` |

### 静态资源(直接复制)
- `public/maxurl.user.js` → `dist/maxurl.user.js`(7.2MB,web_accessible_resource)
- `icons/icon{16,48,128}.png`(来自 dashboard favicon)

## 运行时启动流程

### Service Worker(`background/index.ts`)
1. 模块加载:打印 `[bg] service worker loaded`;装配 uploader/capturer/router
2. `initSettingsWatcher()` 绑 storage.onChanged → 广播给监听器
3. `getSettings()` 启动初始化(uiMode → side panel 行为)
4. onMessage 监听:SNIFFER_REPORT(content 上报)→ 存快照 + 广播 SNIFFER_FOUND;Request → router
5. `onInstalled` → `setupContextMenus`

### UI(`ui/main.ts` → `App.vue`)
1. `main.ts`:按 `location.pathname` 定 containerMode(sidepanel/popup);挂载前应用默认主题(防闪烁);读 storage 真实主题 + 监听系统变化
2. `App.onMounted`:`load()` 设置 → `verify({serverURL,username,password})` 三级回退(验 token → 自动登录默认 admin/admin123 → 失败落 idle)
3. `booting` 期间显示「连接中…」,避免登录界面闪烁
4. 清理脏 libraryId + 注册 AUTH_EXPIRED

### Content Script(`content/index.ts`)
1. 模块加载:打印 `[content] script loaded {url, readyState}`
2. 装配 sniffer/dragdrop/scroller
3. onMessage 处理 ContentCommand + 截图滚动命令(SCROLL_TO/SCROLL_RESTORE)
4. **初始化**:`CONFIG_GET` → 按 `dragPopoverEnabled`/`snifferEnabled` 恢复开关(实现持久化自动启用)

### Offscreen(按需)
- `capturer` 整页/选区截图时 `ensureOffscreen()` → `createDocument({reason:BLOBS})`
- `offscreen/index.ts` 监听 STITCH/CROP → 调 image-ops → 回 dataUrl

## 关键时序

- **截图**:UI 点按钮 → Request CAPTURE_* → SW capturer → `sendToContent`(必要时注入)→ captureVisibleTab/滚动 → offscreen 拼接 → uploader.enqueue
- **拖拽上传**:网页 dragstart → content dragdrop 浮层 → drop → `fileToStaged`(number[])→ UPLOAD_FILES → SW stagedToFile → uploader
- **嗅探**:content `extractFromDOM` + PerformanceObserver → SNIFFER_REPORT → SW 存快照 → SNIFFER_FOUND 广播 → UI 刷新
- **自动登录**:见 ui 入口流程

## 注意

- @crxjs v2.7.1:content_scripts.js 产物带 hash(`assets/index.ts-loader-*.js`),`inject.ts` 从 `manifest.content_scripts[].js` **动态读取**文件名,不能写死。
- SW 会被 Chrome 回收,模块级变量(`sniffSnapshots`、`currentClient`)不保证持久;设置每次从 storage 读,不缓存。
