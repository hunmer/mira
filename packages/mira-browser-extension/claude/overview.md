# 架构总览

## 是什么

`mira-browser-extension` 是一个 **Chrome MV3 浏览器扩展**,作为「Mira 素材库」的网页采集入口。它把网页上的图片/视频/截图快速归档到本地运行的 Mira 后端(`mira-app-core` SDK + mira-client/server)。

## 解决什么问题

- 网页图片/视频**一键收藏**到素材库(右键菜单、拖拽浮层、悬停按钮、嗅探批量、选中文字批量导入)
- 网页**截图**(可视区域 / 整页滚动 / 选区框选)直接入库
- **拖拽上传**本地文件;popup 可开「批量上传」独立窗口(文件经 IndexedDB 暂存传递)
- **资源嗅探**:扫描页面 DOM/网络请求,批量抓取图片/视频/音频(列表/瀑布流两种视图,可按尺寸/比例过滤)
- **多服务器管理**:servers 列表 + 激活/测试,可保存多套后端
- 前端**高清大图升级**(集成 maxurl.user.js,缩略图 → 原图);受限站点经 cookie/DNR 资源抓取兜底
- UI 双语(zh-CN/en,vue-i18n)

## 运行时形态(MV3 四上下文)

```text
┌─────────────────────────────────────────────────────────────┐
│ Service Worker (background,无 DOM)                          │
│  index.ts → router → mira-client(SDK) / uploader / capturer │
│  职责:认证、文件下载、上传队列、截图编排、资源抓取、设置广播  │
└───────▲──────────────────────────────▲──────────────────────┘
        │ chrome.runtime.sendMessage    │ chrome.tabs.sendMessage
        │ (Request/Event)               │ (ContentCommand)
┌───────┴──────────────────┐  ┌────────┴───────────────────────┐
│ UI(Vue3:popup/sidepanel │  │ Content Script(注入网页,有 DOM) │
│  /upload 独立窗口)       │  │ sniffer / dragdrop / autoscroll │
│  职责:连接、多服务器、设置│  │ / selection / hover-button      │
│  截图/上传/嗅探/批量上传  │  │ / import-dialog / IMU 注入      │
└──────────────────────────┘  └────────────────────────────────┘
        │
        │ chrome.offscreen.createDocument + sendMessage
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Offscreen Document(有 DOM/Canvas,无可见 UI)                 │
│  index.ts → stitch / crop(Canvas 拼接与裁剪)                 │
└─────────────────────────────────────────────────────────────┘
```

- **跨上下文通信**:Service Worker 无 DOM,需 offscreen 做 Canvas;UI/content 无法直传 `File`,用 `StagedFile`(详见 [data-model.md](data-model.md))。

## 关键设计取舍

1. **offscreen reason = BLOBS**:Canvas `convertToBlob` 产出 Blob,Chrome 合法 reason 是 `BLOBS`;`IMAGE_PROCESSING` 是 Firefox/Edge 的,Chrome 会拒绝。
2. **offscreen HTML 必须显式声明为 rollup 入口**(`vite.config.ts`),否则 @crxjs 只构建 manifest 引用的入口,offscreen 不会进 dist → 整页/选区截图失败。
3. **content script 程序化注入兜底**(`inject.ts`):SPA/预渲染页/安装前已打开的页,manifest 注入可能错过;`sendToContent` 失败时用 `chrome.scripting.executeScript` 重新注入(文件名从 manifest 动态读取,带 hash)。
4. **跨上下文文件传输用 `number[]`**:裸 `ArrayBuffer` 经 sendMessage 变成 `{}`;`Uint8Array` 变成 `{0:x,1:y,...}` 类数组对象;只有普通 `number[]`(真 Array)稳定。`stagedToFile` 的 `normalizeBytes` 兼容全部形态。
5. **maxurl(MV3 CSP 限制)**:扩展环境禁止 `eval`/`new Function`,maxurl 只能注入**页面 MAIN world**(`<script src=web_accessible_resource>`),通过 `postMessage` 桥接跨 world 调用。
6. **设置持久化 + 自动启用**:`chrome.storage.local`,content script 加载时读 `CONFIG_GET` 恢复 sniffer/dragdrop/hover-button 开关;后台 `onSettingsChange` 广播所有 tab + `tabs.onUpdated` 覆盖新导航。
7. **自动登录**:启动页面先验 token,失败用保存凭据或默认 `admin/admin123` 自动登录,失败才显示登录界面。
8. **vue 单实例**:本包引 `mira-plugin-ui`(npm 实体目录,Tailwind class 组件),其依赖链会解析出第二份 vue → 双实例 slot/inject 崩溃;`vite.config.ts` 把 `vue` alias 钉到本包 `node_modules` 的单一 runtime 文件。

## 边界

- 只采集,不做素材库管理(管理在 mira-client/dashboard)。
- 依赖本地 Mira 后端(serverURL 默认 `http://localhost:8081`,支持 servers 多服务器切换),通过 `mira-app-core/shared/sdk` 的 MiraClient 访问。
- 不内嵌后端,纯客户端扩展。
