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
| `src/ui/upload.html` | `vite.config.ts` → `build.rollupOptions.input.upload` | 批量上传独立窗口页(chrome.windows.create 打开),非 manifest 入口;入口脚本 `upload-main.ts`,根组件 `UploadApp.vue` |

### 静态资源(直接复制)
- `public/maxurl.user.js` → `dist/maxurl.user.js`(7.2MB,web_accessible_resource)
- `icons/icon{16,48,128}.png`(来自 dashboard favicon)

## 运行时启动流程

### Service Worker(`background/index.ts`)
1. 模块加载:打印 `[bg] service worker loaded`;装配 uploader/capturer/router
2. `initSettingsWatcher()` 绑 storage.onChanged → 广播给监听器
3. `getSettings()` 启动初始化(uiMode → side panel 行为)
4. onMessage 监听:SNIFFER_REPORT(content 上报)→ 存快照 + 广播 SNIFFER_FOUND;Request → router
5. `setupContextMenus` 模块加载即注册(`contextMenus.onClicked` 监听在**模块顶层**,SW 重启不丢);菜单项仅 `onInstalled` 时 removeAll + 重建

### UI(`ui/main.ts` → `App.vue`;`ui/upload-main.ts` → `UploadApp.vue`)
1. `main.ts`:按 `location.pathname` 定 containerMode(sidepanel/popup);挂载前应用默认主题(防闪烁);读 storage 真实主题 + 监听系统变化;挂 vue-i18n
2. `App.onMounted`:`load()` 设置 → `verify({serverURL,username,password})` 三级回退(验 token → 自动登录默认 admin/admin123 → 失败落 idle)
3. `booting` 期间显示「连接中…」,避免登录界面闪烁
4. 清理脏 libraryId + 注册 AUTH_EXPIRED
5. `upload-main.ts`(独立窗口):恢复主题/设置 → 从 IndexedDB 取 popup 暂存的文件 → `BatchUploadHost`;popup 与窗口间经 CUSTOM_UPLOAD_* 会话消息协同

### Content Script(`content/index.ts`)
1. 模块加载:打印 `[content] script loaded {url, readyState}`
2. 装配 sniffer/dragdrop/scroller
3. onMessage 处理 ContentCommand + 截图滚动命令(SCROLL_TO/SCROLL_RESTORE)
4. **初始化**:`CONFIG_GET` → 按 `dragPopoverEnabled`/`snifferEnabled` 恢复开关(实现持久化自动启用);dragdrop 需再过站点黑白名单(`isDragPopoverHostAllowed(location.host, mode, hosts)`)才启用
5. **拖拽浮层库记忆**:首次打开浮层 `getOverlayLibraryId()`(优先 `dragDropLibraryId`,回退 `libraryId`);浮层内切库经 `saveOverlayLibraryId` 持久化(CONFIG_SET)
6. **浮层挂载**(dragdrop.ts):document.documentElement 建 `#mira-dragdrop-host`(all:initial)→ `attachShadow({mode:'open'})` → 注入 overlay CSS + mira-plugin-ui 编译 CSS(dev 下 URL 回退 `localhost:5174`)→ `createApp(DragDropOverlay)` 挂载 props(services/upload/回调)

### Offscreen(按需)
- `capturer` 整页/选区截图时 `ensureOffscreen()` → `createDocument({reason:BLOBS})`
- `offscreen/index.ts` 监听 STITCH/CROP → 调 image-ops → 回 dataUrl

## 关键时序

- **截图**:UI 点按钮 → Request CAPTURE_* → SW capturer → `sendToContent`(必要时注入)→ captureVisibleTab/滚动 → offscreen 拼接 → uploader.enqueue
- **拖拽上传**:网页 dragstart → content dragdrop(过站点黑白名单)→ Shadow DOM 内 DragDropOverlay(双栏树/根区/批量 zone)→ 落点释放 → `fileToStaged`(number[])→ UPLOAD_FILES → SW stagedToFile → uploader;URL 拖拽走 drag-data 解析(DOMParser/Pinterest)→ UPLOAD_FROM_URL/BATCH_IMPORT
- **嗅探**:content `extractFromDOM` + PerformanceObserver → SNIFFER_REPORT → SW 存快照 → SNIFFER_FOUND 广播 → UI 刷新;「导入到」先本地 IMU 大图解析(phase upgrade)→ BATCH_IMPORT(带库/文件夹/标签落点)
- **自动登录**:见 ui 入口流程

## 注意

- @crxjs v2.7.1:content_scripts.js 产物带 hash(`assets/index.ts-loader-*.js`),`inject.ts` 从 `manifest.content_scripts[].js` **动态读取**文件名,不能写死。
- SW 会被 Chrome 回收,模块级变量(`sniffSnapshots`、`currentClient`)不保证持久;设置每次从 storage 读,不缓存。
