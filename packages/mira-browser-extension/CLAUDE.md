# mira-browser-extension

Chrome MV3 浏览器扩展,作为「Mira 素材库」(本地 `mira-app-core` 后端)的网页采集入口。把网页图片/视频、截图(可视/整页/选区)、拖拽文件、悬停按钮、选中文字批量导入、嗅探到的资源快速归档到素材库,并集成前端高清大图升级(maxurl)。

技术栈:TypeScript(strict)+ Vue 3(`<script setup>`,popup/side panel/批量上传独立窗口页,以及**注入网页的拖拽浮层**,Shadow DOM 隔离)+ Vite + @crxjs/vite-plugin + Tailwind 4 + `mira-plugin-ui`(UI 组件 + library 树组件 + 编译 CSS 产物)+ vue-i18n(zh-CN/en)+ `mira-app-core` workspace SDK。运行时形态是 MV3 四上下文:Service Worker(认证/上传/截图编排/资源抓取)、Content Script(注入网页,DOM 扫描/拖拽浮层/悬停按钮/选框/导入对话框)、Offscreen Document(Canvas 拼接裁剪)、UI(Vue)。

## 关键约定

- **命令**:`pnpm --filter mira-browser-extension build`(含 `vue-tsc` 类型检查)/ `dev` / `test`(26 个测试文件,约 169 用例)。改代码后须 build + 重新加载扩展 + 刷新目标页。
- **跨上下文传文件必须用 `fileToStaged`**(`number[]`):裸 ArrayBuffer/Uint8Array 经 `sendMessage` 会丢/退化。
- **offscreen reason = `chrome.offscreen.Reason.BLOBS`**(非字符串、非 IMAGE_PROCESSING);offscreen HTML 与 upload HTML 都必须在 `vite.config.ts` 的 `rollupOptions.input` 声明。
- **向 content 发消息用 `sendToContent`**(注入兜底),不要直接 `chrome.tabs.sendMessage` 后不处理 reject。
- **MV3 禁 eval/Function**:动态代码(maxurl)只能注入页面 MAIN world。
- **顶层访问 `chrome.*` 必须** `typeof chrome !== 'undefined'` 守卫(测试环境无 chrome)。
- 新加消息:`shared/messages.ts` 联合类型 + `*_TYPES` 集合三处都要登记。
- **vue 必须单路径 alias**(`vite.config.ts` 把 `vue` 钉到本包 node_modules):`mira-plugin-ui` 是 npm 实体目录,不钉会出现双 vue 实例 → slot/inject 崩溃。
- **注入网页的浮层样式必须进 Shadow DOM**:拖拽浮层宿主 `#mira-dragdrop-host` 用 `attachShadow` + `all: initial` 隔离;mira-plugin-ui 样式经其**编译产物** `mira-plugin-ui/mira-plugin-ui.css?url` 注入(源码 CSS 的 `?url` 会被 CRX 保留为不存在的 src 路径)。
- **弱化文字色用 `var(--muted-foreground)`**,不要用/覆盖 shadcn 的 `--muted`(它是弱化**背景**;曾把它别名成文字色导致暗色主题大面积对比度异常)。

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

- **更新时间**:2026-11-21
- **已扫描**:基线 bc638a73(2026-08-25)以来 23 commits(08-26 → 09-09,提交信息均为 "fix")、52 文件 +2552/−649;逐 diff 取证 + 新增文件全文阅读(dragdrop.ts/DragDropOverlay.vue/library-cache.ts/node-last-used.ts/types.ts/SnifferView.vue/SettingsView.vue/CustomUploadView.vue/LibraryPicker.vue/context-menus.ts 等)+ 硬事实核对(manifest/依赖/构建配置均无变化)。
- **跳过**:`dist/`(git 忽略,本地产物为 08-24 旧构建)、`public/maxurl.user.js` 内容、`node_modules/`。
- **覆盖率**:src 现 111 文件(76 ts + 29 vue + 2 css + 4 html,含 26 测试),本次变更全部覆盖。
- **本次要点**(2026-08-25 后):
  - **拖拽浮层重写为 Vue 组件**(`content/overlay/DragDropOverlay.vue`,Shadow DOM + mira-plugin-ui 编译 CSS):文件夹|标签双栏树(LibraryTreeView,支持右键编辑/删除/拖拽排序/跨层移动)、底部素材库横条 hover 切换(经 `dragDropLibraryId` 持久化)、「不设文件夹」根区 + 自定义上传 zone、批量导入/批量复制 URL zone(`collectImagesUnder`);宿主 `dragdrop.ts` 只管拖拽侦测/定位/自动滚动。
  - **拖拽快传站点黑白名单**:`dragPopoverMode`(blacklist/whitelist)+ `dragPopoverHosts`(host 精确匹配,content 按 `location.host` 过滤);右键菜单「切换当前网站是否开启图片拖拽快速上传」;旧白名单数据自动迁移(storage.ts)。
  - **「最后使用」排序链路**:新 `shared/node-last-used.ts`(导入时 touch 落点文件夹/标签,200ms 合并写 `mira_node_last_used`)+ 树 5 种排序(id/title/created_at/last_used/custom)+ 树样式 tree/tiles(`libraryTreeStyle`)。
  - **新 `shared/library-cache.ts`**:内存 + storage 双层库/树缓存(scope=服务器),CustomUploadView 先占位渲染再后台刷新,消除打开闪烁。
  - **嗅探「导入到」**:SnifferView 集成 mira-plugin-ui `SaveLocationDialog`,落点记忆(`snifferImportLibraryId/FolderId/Tags`);批量导入前 IMU 大图解析预处理(progress phase `upgrade`),batchImport 支持传 tags。
  - **LibraryPicker 重写**:自绘卡片网格 → mira-plugin-ui `LibrarySelect` 下拉;`LibIcon.vue` 删除。
  - **drag-data.ts 解析增强**:DOMParser 替代正则(还原 `&amp;`、data-* 懒加载属性、srcset 最大候选)、Pinterest 专用 `x-pinterest-closeup-image`、`text/x-moz-url`/`text/url` 回退。
  - **context-menus 修复**:点击监听提至模块顶层(SW 重启不丢),菜单项仅在 onInstalled 重建。
  - **暗色主题修复**:style.css 删除 `--muted` 覆盖,41 处弱化文字改 `--muted-foreground`(交接文档 `handoff/2026-09-02-dark-theme-save-location.md`)。
  - 测试 19 → 26 文件、约 137 → 169 用例;i18n +24 键。
- **下一步**:本地 `dist/` 落后 src(最后构建 08-24),验证前需重新 build;`DragDropOverlay` 的 dev 模式 CSS 回退(localhost:5174)依赖 vite dev 端口约定,改端口需同步。
