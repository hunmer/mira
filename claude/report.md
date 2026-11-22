# 代码自检报告（2026-11-21，HEAD b4f39095）

> 证据口径：全部结论来自 grep/wc/自写括号配平脚本实测（2242 个 .ts/.vue 文件，排除 node_modules/dist/build），不采信文档宣称；行数含注释与空行，巨型函数为启发式扫描（非 AST）。

## 1. 结构与职责

**体量基线**：全仓 .ts/.vue 共 2242 个文件，P50=39 行 / P90=312 行 / P99=1020 行；>1000 行 24 个、>600 行 74 个。以下违例均以 P90=312 为参照。

### Top 违例（≤10 条）

| # | 违例 | 证据 | 建议 |
|---|------|------|------|
| 1 | 上帝文件+上帝函数：`setupRoutes` 单函数 1605 行（整个文件 1780 行 = 一个函数 + 头部） | `packages/mira-app-server/src/routes/FileRoutes.ts:52`（脚本实测函数跨度 52→1656） | 按资源拆 FileQueryRoutes / FileMutationRoutes / FileImportRoutes，handler 改注册表驱动 |
| 2 | 上帝函数：`useTabs` 单函数 899 行 | `packages/mira-client/src/renderer/composables/useTabs.ts:255` | 拆 tab 生命周期 / 持久化 / 激活策略三个子 composable |
| 3 | 上帝文件：SDK 服务 1242 行 | `packages/mira-client/src/renderer/services/MiraSDKService.ts` | 按 core SDK 17 模块边界镜像拆分 partial 类 |
| 4 | 上帝文件：plugin store 1189 行 | `packages/mira-client/src/renderer/stores/plugin.ts:57`（defineStore 体 1133 行） | 拆 market 安装 / 本地启用 / 更新检查三个 store |
| 5 | 巨型函数：`upgradeImageUrlCandidates`（初判 550 行系扫描器括号失衡伪影，AST 实测 48 行） | `plugins/plugins/mira_eagle_extension/index.ts:608`（实测跨度 608→655；608→文件尾恰为 550） | 候选筛选/去重/排序已抽 `collectImuCandidates`（48→31 行）；尺寸/域名规则在 vendored maxurl.user.js 内，无策略清单可拆 |
| 6 | 巨型函数：`registerApiRoutes` 390 行 | `plugins/plugins/mira_ai_sdk/index.ts:283` | 每端点抽独立 handler 函数 |
| 7 | 巨型函数：`getFiles` 252 行（查询构造+分页+过滤混在一起） | `packages/mira-app-core/src/storage/sqlite/mixins/FileOperations.ts:200` | 拆 buildWhere / applyPagination / 行映射 |
| 8 | 路由层直接做数据访问：FileRoutes 内 30 处 `getLibrary\|\.db` | `packages/mira-app-server/src/routes/FileRoutes.ts:65,99,445-446` | 收敛到 Service（对照 LibraryImportService 已有先例） |
| 9 | 运行时依赖装进源码树：`src/plugins/node_modules/` 整目录（含 mira-app-core 软链、@types 等） | `packages/mira-app-server/src/plugins/node_modules/`（find 实测） | 插件依赖目录迁到仓库级 data/ 或独立 runtime/，并在 tsconfig exclude |
| 10 | 路由与 WS 广播耦合：广播三连（broadcastPluginEvent + sendToWebsocket + broadcastLibraryEvent）在 FileRoutes 手写 8 处 | `packages/mira-app-server/src/routes/FileRoutes.ts:299-309` 等（grep 计 8） | 提 `emitFileEvent(libraryId, fileId, event, payload)` 单一出口 |

**巨型函数总量**：server+client+core+dashboard 四树 ≳100 行函数共 **108 个**（脚本口径；defineStore/useXxx 整体计为一个函数，含 store/composable 全体，属内聚度上限口径）。

**业务/UI/数据访问耦合点**：
- `packages/mira-client/src/renderer/components/business/MediaDetailComponent.vue:963-1002`：UI 组件内联 formatFileSize/isImageFile/getFileExtension/isVideoFile 等纯逻辑 6 个。
- `packages/mira-app-server/src/routes/FileRoutes.ts:52-1656`：路由内直接拼 SQL 条件与存储访问（见违例 1/8）。
- `packages/mira-dashboard-next/src/views/mira/file-manager/index.vue:212`：视图内联 formatSize 而非走 SDK/共享 utils。

**✓ 好惯例**：
- ✓ server 路由按域拆 21 个模块（`src/routes/` 实测 21 个 .ts），未糊成单个 app.ts。
- ✓ 异步任务已收敛 Service 层且带单测：`LibraryImportService` / `LibraryRelocationService` / `MetadataService` / `ThumbnailService` / `DuplicateScanner` 均有对应 `.test.ts`。
- ✓ core SDK 每模块配 `.contract.test.ts`（`src/shared/sdk/modules/` 实测 7+ 个）。
- ✓ client 业务组件已普遍抽 composables（见第 4 节复用表）。

## 2. 重复

### 内联工具函数泛滥（最严重问题）

| 重复逻辑 | 实测定义处数 | 代表证据 | 建议 |
|---|---|---|---|
| `formatSize/formatBytes/formatFileSize` | **34 处** | client 内 20 处（`renderer/components/business/MediaDetailComponent.vue:976`、`preview/ImagePreview.vue:196`、`common/MediaCardComponent.vue:274`、`tabs/dashboard/cards/useStatsCard.ts:124`、`components/ui/dropzone/Dropzone.vue:143` 等）+ plugin-ui 7 处（`src/library/MediaDetail.vue:460` 等）+ dashboard 4 处（`views/mira/overview/index.vue:23` 等）+ video-editor 2 处 | core 或独立 shared 包出唯一实现；client 已有 `renderer/utils/index.ts:39 formatBytes` 却 0 引用，先收敛到它 |
| `formatDate/formatDuration/formatTimer` | **25+ 处** | `business/VideoFileInfoComponent.vue:159,184`、`common/MediaCardComponent.vue:284,292`、`preview/VideoPreview.vue:237` 等 | 同上，`utils/helpers.ts:196 formatDate` 已存在 |
| `getFileExtension/extOf/getExtension` | **12 处** | `business/MediaListComponent.vue:457`、`views/FilePreviewView.vue:143`、`components/ui/file-icon/iconPaths.ts:268` | `utils/fileUtils.ts:136` 已导出，19 个文件在用，补齐剩余 |
| `mimeType.startsWith('image/')` 内联判定 | **47 处** | `tabs/dashboard/cards/AlbumCard.vue:180`、`business/FileUploadDialog/useFileManagement.ts:279-285`（isImageFile/isVideoFile/isAudioFile 三连） | core 出 `classifyMedia(mime|ext)` 单一判定 |

### 组件级复制品

| 重复 | 证据 | 建议 |
|---|---|---|
| 两份 Dropzone 近逐行相同：`isImage/formatSize/extOf` 同名同实现，行号都错位仅 3-7 行 | `packages/mira-client/src/components/ui/dropzone/Dropzone.vue:132-153` vs `packages/mira-plugin-ui/src/library/Dropzone.vue:135-153` | plugin-ui 版反向回流或抽到共享包，client 只留皮肤差异 |
| 两份 MediaDetail 共享 6 个同名函数（formatFileSize/formatDate/getFileExtension/isImageFile/isVideoFile/formatDuration） | `renderer/components/business/MediaDetailComponent.vue:963-1002` vs `mira-plugin-ui/src/library/MediaDetail.vue:455-460` | 差异只在 UI 壳，逻辑层合并 |
| 两套 FilterBar（size/date/tag/folder 过滤器两套实现，token 高度重叠） | `renderer/components/business/FilterBar/FilterBar.vue`（984 行）vs `mira-plugin-ui/src/library/FilterBar.vue`（1140 行） | 过滤模型（条件结构/序列化）下沉 core，UI 双壳 |
| 上传 UI 三份并行演化 | `renderer/components/business/FileUploadDialog.vue`（882 行）、`common/MultiTabFileUpload.vue`（1112 行）、`mira-plugin-ui/src/BatchUploadForm.vue` | 明确各自定位或合并 |
| server 无 utils/ 目录，路由各自拼装 | `ls packages/mira-app-server/src/{utils,helpers}` exit 1 | 建 `src/lib/` 放响应/校验/事件广播公共件 |

### 命名簇
- `handle*` 簇无命名规范：client+server 实测 `handleMouseEnter/Leave` 各 3 处、`handleTagSelect` 3 处、`handleFolderSelect` 3 处等，共 40+ 个 handle 前缀函数，无 onXxx/动词宾语约定。
- 未发现 `*_v2` 式版本后缀残留（grep 0 命中）✓。

**✓ 已提取的公共件**：mira-plugin-ui（9 消费方）、core SDK（3 包 26 文件）、`useStatsCard`（4 张 dashboard 卡共用统计卡骨架）、server `parseLibraryItem`（FileRoutes 内部 4 处复用，`FileRoutes.ts:534,552,570,715`）。

## 3. 可读性

### "不看上下文不知道在干嘛"的命名（代表 5 个）

| 命名 | 位置 | 问题 |
|---|---|---|
| `const obj = this.backend.libraries!.getLibrary(...)` | `packages/mira-app-server/src/WebSocketServer.ts:102,160,252` | `obj` 实为 library 实例，3 处复制 |
| `const obj = this.backend.libraries!.getLibrary(libraryId)` | `packages/mira-app-server/src/routes/FileRoutes.ts:65,99` | 同上，还叠非空断言 `!.` |
| `const ret = await this.parseLibraryItem(req, res)` | `packages/mira-app-server/src/routes/FileRoutes.ts:534,552,570,715` | `ret` 泛化命名，4 处 |
| `const h = host.toLowerCase()` | `plugins/plugins/mira_eagle_extension/index.ts:321` | 单字母 |
| `export function init(inst: any)` | `plugins/plugins/mira_eagle_extension/index.ts:1153` | `inst` + `any`，插件入口签名全靠文档 |

### 嵌套过深（缩进折算层级，≤10 条）

| # | 位置 | 实测 | 建议 |
|---|---|---|---|
| 1 | `packages/mira-app-server/src/routes/PluginRoutes.ts:627-648` | yauzl 解压回调链缩进 26 空格（≈13 层）：openReadStream→writeStream.on('finish')→readEntry | 提取 `extractEntry(zipfile, entry, out)` 返回 Promise + async/await |
| 2 | `packages/mira-app-server/src/routes/FileRoutes.ts:298-309` | 19 空格缩进：update 成功→if(clientId)→ws 定向+广播双发 | 事件发射器单出口（同第 1 节违例 10） |
| 3 | `packages/mira-app-server/src/routes/FsRouter.ts:74` | 15 空格：盘符枚举嵌在多层回调内 | 提前 return + `Promise.all` |
| 4 | `packages/mira-app-core/src/shared/sdk/client/HttpClient.ts:63` | 15 空格：拦截器内嵌 request 分支 | 拆响应/错误拦截器函数 |
| 5 | `packages/mira-app-server/src/routes/UserRouter.ts:73` | 13 空格：用户组判定嵌套 if 链 | 查表替代 if 链 |
| 6 | `packages/mira-app-server/src/routes/StatisticsRouter.ts:152` | 13 空格：按 key 合并统计的循环内三重嵌套 | 提 `mergeStat(map, item)` |
| 7 | `packages/mira-app-server/src/routes/SettingsRouter.ts:46` | 13 空格：字段回退表达式嵌套 | `??` 链 + 常量表 |
| 8 | `packages/mira-client/src/renderer/services/ShortcutService.ts:326` | 12 空格：条件或链条过长 | 提 `isEditableTarget(el)` |
| 9 | `packages/mira-app-server/src/services/DuplicateScanner.ts:135` | 11 空格：哈希分阶段状态机内嵌套 | 状态改枚举驱动 |
| 10 | `packages/mira-app-server/src/routes/FolderRouter.ts:162` | 11 空格：watcher 忽略路径逻辑 | 条件取反提前 return |

### 其他可读性信号
- 注释掉的死代码：`packages/mira-app-server/src/routes/PluginRoutes.ts:634-642` 连续 9 行 `//` 代码并标"暂时不需要"——删除，历史交给 git。
- `any` 使用量：client **765** 处 / server 279 / core 138（grep `: any\|as any`），client 是治理重点。
- `@ts-ignore`/`eslint-disable` 共 8 处（client+server），量可控 ✓。

## 4. 可复用资产（实测复用方）

| 资产 | 位置 | 实测复用方 |
|---|---|---|
| core SDK（MiraClient + 17 模块，`shared/sdk/`） | `packages/mira-app-core/src/shared/sdk/` | 3 包 26 文件：browser-extension 11、client 8、dashboard-next 7（grep `shared/sdk` 按文件计数） |
| SDK FileModule（最大模块 751 行） | `packages/mira-app-core/src/shared/sdk/modules/FileModule.ts` | SDK 门面 + 3 个消费包（经 MiraClient） |
| WebSocketClient（Node/浏览器双适配 + sendBinary） | `packages/mira-app-core/src/shared/sdk/client/WebSocketClient.ts` | core SDK index + MiraClient（278 行） |
| mira-plugin-ui（67 ui 目录 + library 族） | `packages/mira-plugin-ui/` | 9 个 package.json 声明依赖：browser-ext、cep-panel、mira_ai_sdk/mira_format_converter/mira_image_cropper/mira_tiptap_format 四插件 web、image-search、mira-video-editor、mira-whiteboard |
| vue-masonry（瀑布流） | `packages/vue-masonry/` | 3 包 7 文件：client（main.ts、WaterfallComponent 等）、plugin-ui（MediaBrowser/MediaWaterfall）、browser-extension（MasonryView） |
| vue-selection-box（框选） | `packages/vue-selection-box/` | 2 包 5+ 文件：client（LocalFolderTabView、WaterfallComponent、MediaListComponent 等）、plugin-ui |
| grid-layout-plus（栅格 fork） | `packages/grid-layout-plus/` | client Home 仪表盘（vendored，`grid-layout.vue` 1795 行） |
| client `useToast` | `renderer/composables/useToast.ts` | **27 处**（composable 引用计数第一） |
| client `useTabs` | `renderer/composables/useTabs.ts` | 17 处 |
| client `LibraryPrefs` | `renderer/composables/` | 17 处 |
| client `useDeviceShare` | `renderer/composables/` | 10 处 |
| client `useImportHandler` | `renderer/composables/` | 7 处 |
| client `useMediaTabData` | `renderer/composables/` | 6 处 |
| client `useConfirm` | `renderer/composables/` | 4 处 |
| client `useStatsCard`（统计卡骨架） | `renderer/components/tabs/dashboard/cards/useStatsCard.ts` | 4 张 dashboard 卡 |
| server `ThumbnailService` | `packages/mira-app-server/src/services/ThumbnailService.ts` | 5 个非 services 文件 |
| server `MetadataService` | `src/services/MetadataService.ts` | 5 个非 services 文件 |
| server `ServerPluginManager` | `src/ServerPluginManager.ts`（660 行） | 22 个文件 |
| client `MiraSDKService`（SDK 封装） | `renderer/services/MiraSDKService.ts` | **56 个文件**（client 内引用最广的服务） |
| client `utils/fileUtils.ts` | `renderer/utils/fileUtils.ts` | 19 个文件（formatFileSize/getFileExtension 正源） |
| client `@/components/ui`（shadcn-vue） | `packages/mira-client/src/components/ui/` | 125 个 renderer 文件（UI 约定实际执行良好） |
| server `parseLibraryItem` | `src/routes/FileRoutes.ts`（内部方法） | 路由内 4 处复用（534/552/570/715）——但未跨文件共享 |

## 复用守则

1. **新写展示逻辑前先查 `renderer/utils/fileUtils.ts`（19 人在用）与 `renderer/composables/`**：字节/时间/扩展名格式化一律 import，禁止组件内重写（现存 34 处 formatSize 类定义即违例存量）。
2. **媒体类型判定（isImage/isVideo/isAudio）只允许经 core 单一实现**：47 处 `startsWith('image/')` 内联是新代码继续复制的源头。
3. **插件侧 UI 一律 `mira-plugin-ui`**，勿从 client 复制组件；两份 Dropzone/MediaDetail/FilterBar 的分叉应以 plugin-ui 为回流正源。
4. **server 新路由不动存储**：数据访问进 `src/services/`（已有 5 个 Service + 单测先例），路由只做参数校验与事件发射；WS 广播走单一 emitFileEvent 出口。
5. **client 状态分散进既有 store/composable**：不在组件里新起本地仓（plugin.ts 1189 行是拆分而非合并方向）。
6. **复用方 ≥3 的模块改动需跑其消费面**：MiraSDKService（56 文件）、ServerPluginManager（22 文件）、useToast（27 处）改签名前先 grep 消费方。
7. **弃用即删**：注释掉的代码块（如 PluginRoutes.ts:634-642）不入库，命名禁 `obj/ret/tmp/h` 级缩写。
