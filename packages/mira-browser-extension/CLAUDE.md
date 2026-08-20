# mira-browser-extension

Chrome MV3 浏览器扩展,作为「Mira 素材库」(本地 `mira-app-core` 后端)的网页采集入口。把网页图片/视频、截图(可视/整页/选区)、拖拽文件、悬停按钮、选中文字批量导入、嗅探到的资源快速归档到素材库,并集成前端高清大图升级(maxurl)。

技术栈:TypeScript(strict)+ Vue 3(`<script setup>`,popup/side panel/批量上传独立窗口页)+ Vite + @crxjs/vite-plugin + Tailwind 4 + `mira-plugin-ui` + vue-i18n(zh-CN/en)+ `mira-app-core` workspace SDK。运行时形态是 MV3 四上下文:Service Worker(认证/上传/截图编排/资源抓取)、Content Script(注入网页,DOM 扫描/拖拽浮层/悬停按钮/选框/导入对话框)、Offscreen Document(Canvas 拼接裁剪)、UI(Vue)。

## 关键约定

- **命令**:`pnpm --filter mira-browser-extension build`(含 `vue-tsc` 类型检查)/ `dev` / `test`(19 个测试文件,约 137 用例)。改代码后须 build + 重新加载扩展 + 刷新目标页。
- **跨上下文传文件必须用 `fileToStaged`**(`number[]`):裸 ArrayBuffer/Uint8Array 经 `sendMessage` 会丢/退化。
- **offscreen reason = `chrome.offscreen.Reason.BLOBS`**(非字符串、非 IMAGE_PROCESSING);offscreen HTML 与 upload HTML 都必须在 `vite.config.ts` 的 `rollupOptions.input` 声明。
- **向 content 发消息用 `sendToContent`**(注入兜底),不要直接 `chrome.tabs.sendMessage` 后不处理 reject。
- **MV3 禁 eval/Function**:动态代码(maxurl)只能注入页面 MAIN world。
- **顶层访问 `chrome.*` 必须** `typeof chrome !== 'undefined'` 守卫(测试环境无 chrome)。
- 新加消息:`shared/messages.ts` 联合类型 + `*_TYPES` 集合三处都要登记。
- **vue 必须单路径 alias**(`vite.config.ts` 把 `vue` 钉到本包 node_modules):`mira-plugin-ui` 是 npm 实体目录,不钉会出现双 vue 实例 → slot/inject 崩溃。

更多见 [开发约定](claude/conventions.md)。

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [架构总览](claude/overview.md) | 四上下文形态、设计取舍、边界 | 首次了解整体 |
| [开发约定](claude/conventions.md) | 命令、代码风格、MV3 坑、调试 | 改代码前 |
| [模块职责](claude/module-responsibilities.md) | 各文件职责、子域关系图 | 找某功能在哪 |
| [入口与启动](claude/entrypoints.md) | 构建/运行时入口、启动时序 | 理解构建或启动 |
| [对外接口](claude/public-interfaces.md) | 消息协议、SDK 调用、Chrome API | 加消息/对接后端 |
| [依赖与配置](claude/dependencies-and-config.md) | 依赖、manifest/vite/tsconfig、兼容性 | 升级依赖/改配置 |
| [数据模型](claude/data-model.md) | 设置/StagedFile/UploadTask/嗅探/IMU | 改状态或序列化 |
| [测试与质量](claude/testing-and-quality.md) | 测试命令、覆盖、风险 | 写测试/评估质量 |
| [文件清单](claude/file-map.md) | 全部文件用途、高敏感文件 | 定位文件 |
| [FAQ](claude/faq.md) | 常见 bug 现象→根因→定位 | 排查问题 |
| [变更记录](claude/changelog.md) | 索引生成/更新记录 | 看索引版本 |

## 扫描状态

- **更新时间**:2026-08-20
- **已扫描**:src 101 文件(全量,含 19 个测试文件)+ 根配置(package.json/tsconfig/vite/vitest/manifest/README)+ public/ 用途 + icons。基于实际文件读取 + git 核对。
- **跳过**:`dist/`(产物)、`public/maxurl.user.js` 内容(7.2MB,仅记用途)、`node_modules/`。
- **覆盖率**:源码 101/101;background/content/offscreen/ui(3 页面)/shared 全覆盖。
- **本次要点**(2026-08-11 后 33 commits):新增悬停按钮采集(`content/hover-button.ts`)、网页内批量导入对话框(`content/overlay/import-dialog.ts`)、带 cookie/DNR 的资源抓取(`background/resource-fetch.ts`,permissions 增 downloads/notifications/cookies/declarativeNetRequestWithHostAccess)、批量上传独立窗口(`ui/upload.html`+`UploadApp.vue`+`BatchUploadHost.vue`,文件经 IndexedDB 暂存)、多服务器管理(servers/activeServerId 设置 + SERVERS_* 消息)、嗅探瀑布流视图(MasonryView + @hunmer/vue-masonry)、i18n(vue-i18n zh-CN/en);删除 LibraryTree/ServerBar/ServerManagerView/ContextMenu。
- **下一步**:i18n 文案与 settings 新字段已核对;`resource-fetch.ts` 的 DNR 规则细节未逐行展开,需要时再深挖。
