# 常见问题(FAQ)

排查路径为主。每条给出「现象 → 根因 → 定位/修复」。

## 跨上下文文件传输

### 上传文件后服务端 size=15 / 缩略图失败(ffmpeg code 69)
- **根因**:文件字节跨 sendMessage 丢失。size=15 是空 File 的固定开销。
- **定位**:看 `[staged] fileToStaged {bytesLen}`(UI)vs `[staged] stagedToFile {bytesLen}`(SW)。不等 = 丢字节。
- **形态**:裸 ArrayBuffer→`{}`(空);Uint8Array→`{0:x,1:y,...}`(类数组对象)。
- **修复**:用 `fileToStaged`(转 `number[]`);`stagedToFile` 的 `normalizeBytes` 兼容全形态。详见 [data-model.md](data-model.md)。
- **回归**:`staged-file.test.ts` 必须覆盖全部到达形态。

## 截图

### 整页/选区截图「点击无效」/ 显示完成却没上传
- **根因 A**:content script 没注入(SPA/预渲染页)→ `sendMessage` reject。
- **根因 B**:router catch 返回 `{error}`(resolve),`run()` 的 try/catch 不触发 → 误报完成。
- **定位**:Service Worker console 看有没有 `[content]` 日志;`[inject]` 有没有注入重试。
- **修复**:`capturer` 用 `sendToContent`(注入兜底);`ScreenshotView.run()` 检查 `{error}` 字段。

### `Could not load file: 'src/content/index.ts-loader.js'`
- **根因**:写死了 content script 路径,但 @crxjs 产物带 hash(`assets/index.ts-loader-*.js`)。
- **修复**:`inject.ts` 从 `manifest.content_scripts[].js` 动态读取文件名。

### `offscreen.createDocument` 报 IMAGE_PROCESSING 非法
- **根因**:`IMAGE_PROCESSING` 是 Firefox/Edge 的 reason,Chrome 没有。
- **修复**:用 `chrome.offscreen.Reason.BLOBS`(Canvas convertToBlob)。详见 [dependencies-and-config.md](dependencies-and-config.md)。

### 整页/选区截图失败但可视区域正常
- **根因**:offscreen HTML 没进 dist(@crxjs 只构建 manifest 入口)。
- **定位**:`ls dist/src/offscreen/index.html`。
- **修复**:`vite.config.ts` 加 `rollupOptions.input.offscreen`。详见 [entrypoints.md](entrypoints.md)。

## 嗅探

### 开启嗅探不展示资源,要重新点 toggle 才显示
- **根因**:SnifferView 挂载时不调 `load()`,只在 `onToggle(true)` 调。
- **修复**:`onMounted` 若 `snifferEnabled` 已开则 `load()`;`watch(tabIdRef)` 也刷新。

### 嗅探刷新/新开页不自动启用
- **根因**:content 加载时不读 `snifferEnabled`;后台 `onSettingsChange` 只通知激活 tab。
- **修复**:content 初始化读 `CONFIG_GET` 恢复开关;后台广播所有 tab + `tabs.onUpdated`。

## 拖拽

### 拖图片不弹浮层
- **根因 A**:content 没加载(看 `[content] script loaded`)。
- **根因 B**:`dragPopoverEnabled=false`(设置关了)。
- **根因 C**:拖的不是 `<img>`/`<video>`(有些站点用 background-image/div 套图,`dragstart.target` 非 IMG)。
- **定位**:`[dragdrop] dragstart {tag, isImg, enabled}` 日志。

## 登录

### 每次开扩展都要登录
- **根因**:无自动登录。
- **修复**:`verify()` 三级回退(验 token → 自动登录 admin/admin123 → 失败落 idle)。

### 登录界面一闪而过
- **根因**:自动登录期间显示了 ConnectionForm。
- **修复**:`App.vue` 的 `booting` loading 状态覆盖自动登录期。

## maxurl / 高清升级

### maxurl 不生效 / 报 CSP 错
- **根因**:MV3 禁 eval/Function,maxurl 不能在扩展环境直接跑。
- **修复**:MAIN world 注入(`<script src=maxurl.user.js>`)+ postMessage 桥。CSP 严的站点会拦脚本,`upgradeImageUrl` 超时回退原 URL。
- **定位**:网页 console 看 `[mira-ext][imu]` 日志。

## UI / 依赖

### 引入/升级组件后 UI 崩(slot/inject 失效、provide 报错)
- **根因**:`mira-plugin-ui` 是 npm 实体目录(内含自己的 vue 拷贝),依赖链按 importer 解析出第二份 vue → 双实例。
- **修复**:`vite.config.ts` 已把 `vue` alias 钉到本包 `node_modules/vue/dist/vue.runtime.esm-bundler.js`,不要删;新增依赖时注意同理。
- **定位**:报错栈里出现两个不同路径的 vue runtime。

## 调试

### 怎么开调试日志
设置页 → 「调试」→ 打开「调试日志」。日志在哪看:
- **网页功能**:网页 F12,过滤 `mira-ext`
- **SW 功能**:扩展页 → Service Worker 链接
- **弹窗**:右键扩展图标 → 检查弹出内容
