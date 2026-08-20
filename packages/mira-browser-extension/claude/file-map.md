# 文件清单

源码 101 个文件(含 19 个测试),按上下文组织。`dist/` 是构建产物(不入索引)。

## 根配置

| 文件 | 用途 |
|------|------|
| `package.json` | 包定义、scripts、依赖 |
| `tsconfig.json` | TS 配置(strict,别名 @/*) |
| `vite.config.ts` | 构建(**offscreen + upload 两个 rollup input;vue 单路径 alias 防 mira-plugin-ui 双实例**) |
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
| `uploader.ts` | 上传队列(+ .test) |
| `capturer.ts` | 截图编排 |
| `offscreen.ts` | offscreen 生命周期(reason=BLOBS) |
| `settings.ts` | 设置读写 + 监听 |
| `inject.ts` | content 注入兜底(sendToContent) |
| `context-menus.ts` | 右键菜单 |
| `resource-fetch.ts` | 资源抓取:cookies/referrer/UA + declarativeNetRequest 规则,配 imu fallback 候选(+ .test) |
| `mira-client.test.ts` | SDK 封装测试 |

## src/content/(注入网页)

| 文件 | 用途 |
|------|------|
| `index.ts` | **content 入口**,装配 + 初始化恢复开关 |
| `sniffer.ts` | 资源嗅探(DOM/perf/mutation)(+ .test) |
| `dragdrop.ts` | 拖拽浮层(文件夹列表+自动滚动)(+ .test) |
| `hover-button.ts` | 图片悬停 dots 按钮:导入图片/复制 URL/新标签打开大图(+ .test) |
| `autoscroll.ts` | 自动滚动器(+ .test) |
| `overlay/selection.ts` | 选区截图遮罩 |
| `overlay/import-dialog.ts` | 网页内「批量导入」对话框(URL 列表+文件夹单选/新建+标签多选,纯 DOM)(+ .test) |
| `overlay/styles.ts` | overlay 共享样式常量(如 OVERLAY_Z) |

## src/offscreen/(Canvas)

| 文件 | 用途 |
|------|------|
| `index.html` | offscreen 页面 |
| `index.ts` | STITCH/CROP 监听 |
| `image-ops.ts` | stitch/crop 纯逻辑(+ .test) |

## src/ui/(Vue3:popup / sidepanel / upload 独立窗口)

| 文件 | 用途 |
|------|------|
| `main.ts` | popup/sidepanel 入口,主题应用 |
| `upload-main.ts` | **批量上传独立窗口入口**(chrome.windows.create 打开,取 IndexedDB 暂存文件) |
| `App.vue` | 根(自动登录/tab/主题) |
| `UploadApp.vue` | 批量上传窗口根(恢复主题/设置 → BatchUploadHost) |
| `upload.html` / `popup.html` / `sidepanel.html` | 入口 HTML |
| `theme.ts` | 主题工具 |
| `style.css` | CSS 变量(亮/暗) |
| `i18n/index.ts` + `i18n/locales/{zh-CN,en}.ts` | vue-i18n(初始 zh-CN,设置加载后切换) |
| `composables/useBackground.ts` | 消息桥 |
| `composables/useConnection.ts` | 认证 + 自动登录(默认 admin/admin123) |
| `composables/useSettings.ts` / `useSniffer.ts` / `useUploadQueue.ts` | 设置/嗅探/上传队列 |
| `composables/useServers.ts` | 多服务器管理 |
| `composables/useLibraryTree.ts`(+ `useLibraryTreeActions.ts`、`libraryTreeSearch.test.ts`) | 文件夹树(+ .test) |
| `composables/useBatchUpload.ts` | 批量上传会话 |
| `composables/useDialog.ts` / `useImagePreview.ts` / `useImageViewer.ts` | 对话框/图片预览 |
| `components/ConnectionForm.vue` / `GlobalHeader.vue` / `TabBar.vue` | 登录表单/头部/tab |
| `components/screenshot/ScreenshotView.vue` | 截图视图 |
| `components/sniffer/{SnifferView,ResourceList,ResourceItem,MasonryView,MasonryItem}.vue` | 嗅探视图(列表 + 瀑布流) |
| `components/settings/{SettingsView,SettingsOverlay}.vue` | 设置视图(含调试开关) |
| `components/upload/{UploadView,Dropzone,UploadQueue,UploadItem,UploadQueueButton,BatchUploadHost}.vue` | 上传视图 + 批量上传宿主 |
| `components/dragdrop/CustomUploadView.vue` | 自定义上传视图 |
| `components/library/{LibraryPicker,LibraryTreeView,LibIcon}.vue` | 库选择/文件夹树 |
| `components/ui/{Button,Input,Switch,Progress,DialogHost,ImageHovercard,ImageViewer}.vue` | UI 原语(原 ContextMenu.vue 已删) |

## src/shared/(跨上下文)

| 文件 | 用途 |
|------|------|
| `types.ts` | 类型 + DEFAULT_SETTINGS(servers/activeServerId/locale/sniffer 过滤/batchImportConcurrency/imuRules 等) |
| `messages.ts` | 消息协议 + 守卫(+ .test) |
| `storage.ts` | chrome.storage 封装(+ .test) |
| `staged-file.ts` | 跨上下文文件序列化(number[] / normalizeBytes)(+ .test) |
| `concurrency.ts` | 并发控制工具(+ .test) |
| `resource-filename.ts` | 资源文件名生成(+ .test) |
| `drag-data.ts` | 拖拽数据解析(+ .test) |
| `imu.ts` | maxurl 封装(MAIN world 注入,fallback 候选)(+ .test) |
| `debug.ts` | 统一日志 + mira_debug 开关(+ .test) |

## public/

| 文件 | 用途 |
|------|------|
| `maxurl.user.js` | Image Max URL userscript(7.2MB,web_accessible_resource) |

## 关键文件(改动高敏感)

- `shared/staged-file.ts` — 跨上下文序列化,曾连续踩坑,改动需全形态回归
- `background/offscreen.ts` — reason 必须是 BLOBS
- `vite.config.ts` — offscreen/upload rollup input 不能删;vue 单路径 alias 不能删
- `background/inject.ts` — content 注入兜底,文件名动态读 manifest
- `shared/messages.ts` — 新消息三处都要登记
- `background/resource-fetch.ts` — DNR 规则 id/清理时机,改动需手动回归受限站点
