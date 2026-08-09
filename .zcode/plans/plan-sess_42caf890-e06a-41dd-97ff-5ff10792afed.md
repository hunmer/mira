# mira-mobile 核心浏览功能实现 Plan（交接给下个 agent）

## 目标
为 mira-mobile 实现：**服务器编辑/连接 → 连接素材库 → 查看文件夹/标签列表（多选过滤）→ 查看图片瀑布流 → 大图预览（左右翻页）/视频预览（含非MP4的HLS转码）→ 上传**。全部接入真实数据，UI 面向手机设计。

## 背景事实（调研已确认，下个 agent 必须知晓）

### 当前 mira-mobile 状态
- **所有 screens 都是 mock 占位**，无一处接真实数据。
- **状态管理：裸 `setState`**，无全局"当前服务器/当前库/登录态"。这是首先要补的基础。
- **`server_edit_screen.dart` 的 `_testConnection` 是死代码**（引用已删除的旧 SDK 符号 `MiraOptions`/`ConnectedEvent`），**当前编译不过**。必须重写该方法。
- **两套 SDK 并存**：本次只用 `lib/mira_sdk/`（已测通、与后端契约对齐）；`lib/src/packages/mira_sdk/` 是旧的、不用、可忽略（不在本 plan 范围删除，避免牵连）。
- 路由：Navigator 1.0 命名路由（`lib/router/app_router.dart`），无鉴权 guard。
- 主题：Material 3 + `liquid_glass_widgets` 玻璃态。深色判断散落各处用 `Theme.of(context).brightness`。
- pubspec 已有：`http`、`web_socket_channel`、`shared_preferences`、`flutter_staggered_grid_view`、`infinite_scroll_pagination`、`liquid_glass_widgets`、`http_parser`。

### 必须先修的 SDK 缺陷（阻塞性，不修则"按文件夹看图"无法实现）
**根因**：Dart SDK 的 `FileFilters` 发送 `folder_id`，但后端 `getFiles` 读取 `folder`（见 `mira-app-core/src/storage/sqlite/mixins/FileOperations.ts:181,264`）。mira-client 发的是 `folder`（正常），SDK 发错成 `folder_id`。
- 修复 `lib/mira_sdk/models/file.dart` 的 `FileFilters`：
  - `folderId` → 改发 json key **`folder`**（对齐后端）。
  - 补 **`category`** 字段（`image`/`video`/`audio`，后端 FileOperations.ts:217 按扩展名映射）。
  - 支持 **null 语义**：`folder=null`（未分类）、`tags=null`（未标签）。需在 toJson 里允许显式传 null（当前 toJson 跳过 null）。建议用哨兵或新增 `unCategorized: bool` / `unTagged: bool` 字段，toJson 时转为后端魔法值。
- 修复后重跑 `test/mira_sdk_api/` 确认不回归（现有 41 测试应仍绿）。

### 后端可用端点（已确认存在）
- `GET /api/files/thumb/:libraryId/:id` — 缩略图 PNG
- `GET /api/files/file/:libraryId/:id` — 原图/视频（支持 Range，mp4 直接放）
- `GET /api/files/preview/:libraryId/:fileId/index.m3u8` + `/segment/:n.ts` — 非 mp4 视频的 HLS 转码
- 鉴权：HTTP header `Authorization: Bearer <token>`；图片/视频直链用 query `?token=<token>`（SDK `HttpClient.getUrl(path)` 已封装）。

## 技术决策（已与用户确认）

| 决策项 | 选择 |
|--------|------|
| 状态管理 | **Riverpod**（新增依赖） |
| folder 过滤问题 | **修 SDK 发 `folder` key**（不是后端 bug，是 SDK key 名错） |
| 文件夹/标签 | **支持多选组合过滤**（文件夹+标签可同时多选） |
| 大图预览 | **支持左右翻页切换上/下张** |
| 视频 | **支持非 MP4 的 HLS 转码** |
| 范围 | 含**上传功能** |

## 新增依赖（pubspec.yaml）
- `flutter_riverpod: ^2.5.1` — 状态管理
- `cached_network_image: ^3.4.1` — 缩略图缓存（现全用 Image.network 无缓存）
- `photo_view: ^0.15.0` — 大图缩放/平移手势
- `video_player: ^2.9.2` + `chewie: ^1.8.5` — 视频播放（chewie 提供 UI 皮肤，video_player 原生支持 HLS m3u8）
- `file_picker: ^8.1.4` — 上传文件选择

## 实现步骤（按依赖顺序）

### 第 1 步：修 SDK FileFilters（阻塞性，最先做）
改 `lib/mira_sdk/models/file.dart`：
- `FileFilters.folderId` 的 toJson 输出 key 改为 `folder`。
- 新增 `String? category` 字段（toJson 输出 `category`）。
- 新增 `bool uncategorized` / `bool untagged`：为 true 时 toJson 输出 `folder: null` / `tags: null`（后端据此查"无文件夹"/"无标签"）。
- 新增 `int? recycled` 字段（toJson 输出 `recycled`；默认浏览传 `recycled: 0` 排除回收站）。
跑 `flutter test test/mira_sdk_api/` 确认 41 测试仍全绿。

### 第 2 步：Riverpod 基础设施（全局状态）
新建 `lib/src/providers/`：
- `server_provider.dart`：`AsyncNotifierProvider` 管理服务器列表（复用现有 `ServerStorageService`）。
- `session_provider.dart`：**核心**。持有 `MiraClient` 单例 + 当前 `Library` + 登录用户。状态机：`disconnected → connecting → connected(librarySelected)`。提供 `connect(ServerConfig, {username,password})`（login）、`selectLibrary(Library)`、`disconnect()`。MiraClient 在 connect 时 new + login，disconnect 时 dispose。
- `library_provider.dart`：依赖 session，提供 `librariesProvider`（`ref.watch(sessionProvider).client.libraries().getAll()`）。
- `folder_provider.dart` / `tag_provider.dart`：依赖当前 library，提供文件夹/标签列表（调 `getAll(libraryId)`，**客户端组树，不用 query**）。
- `file_filter_provider.dart`：`StateNotifier<FileFilters>`，持有当前选中的文件夹 id 列表 + 标签列表 + 分页游标。暴露 toggle 方法。
- `files_provider.dart`：`AsyncNotifier`，watch file_filter_provider，调 `getFiles(GetFilesRequest(libraryId, filters))`，支持触底加载（limit/offset 累加）。

`main.dart`：用 `ProviderScope` 包根；`MaterialApp` 可继续命名路由，或迁移 `go_router`（**可选**，不强制）。

### 第 3 步：连接流程页面（重写现有 screen）
- **`server_list_screen.dart`**：已可用（ServerStorageService 真实持久化）。改动：点击服务器→若该服务器存了凭据且 autoLogin，调 `sessionProvider.connect()`；否则跳编辑页。新增"添加服务器"→`server_edit`。连接成功→跳库选择页。
- **`server_edit_screen.dart`**：重写死代码 `_testConnection`。测试连接 = `MiraClient(baseUrl)` → `client.system().getHealth()`（拿到 authRequired）→ 若需鉴权则 `client.login(u,p)` → `verify()`。成功后保存到 ServerStorageService 并调 `sessionProvider.connect()`。删除所有 `MiraOptions`/`ConnectedEvent` 引用。
- **库选择页**（新增 `library_select_screen.dart` 或复用路由）：`ref.watch(librariesProvider)` 列出库网格/列表，点击 → `sessionProvider.selectLibrary(lib)` → 跳主页 MainShell。

### 第 4 步：主页 + 文件夹/标签列表（多选过滤）
- **`main_shell_screen.dart`**：保留三 Tab。Tab1=图片网格，Tab2=文件夹/标签树，Tab3=设置。
- **文件夹/标签 Tab**（改造 `tree_view_screen.dart`）：用 `folder_provider`/`tag_provider` 拉真实列表（`getAll`），客户端组树（根=parentId==null）。**多选模式**：每个节点带 checkbox，选中写入 `file_filter_provider`。同时提供"全部/未分类/未标签"基础分类（对应 folder=null/tags=null/recycled=0）。选中变化→Tab1 网格自动刷新（Riverpod watch）。
- 手机布局：树用可展开的列表（缩进+连接线，复用现有 `_TreeLinePainter`），不照搬桌面三栏；可考虑用 `BottomSheet` 或独立全屏页展示树，避免横向拥挤。

### 第 5 步：图片瀑布流（接真实数据）
- **`library_item_list_screen.dart`**（GalleryGrid）：替换 mock `RemoteGalleryApi`。数据源 = `ref.watch(filesProvider)`。用 `infinite_scroll_pagination` + `flutter_staggered_grid_view` 的 `PagedMasonryGridView`（现有结构可复用）。缩略图用 `cached_network_image` + URL = `client.getHttpClient().getUrl('/api/files/thumb/$libId/${file.id}')`。点击 → 跳大图预览，传当前列表的图片子集 + 索引（用 Riverpod 或 args 传）。
- 分页：触底加载，offset += pageSize（如 30），`filesProvider` 累加 result。total 来自 FilesPage.total。

### 第 6 步：大图预览（左右翻页）
- **`image_preview_screen.dart`**：用 `photo_view`（双指缩放/平移/旋转）。**左右翻页**：用 `PageView` 承载当前文件列表中过滤出的图片子集，初始页=点击的索引。左右滑动切换上/下张。底部显示文件名/大小。返回按钮接 pop。
- 原图 URL = `getUrl('/api/files/file/$libId/${file.id}')`。

### 第 7 步：视频预览（含 HLS 转码）
- **`video_preview_screen.dart`**：引入 `video_player` + `chewie`。源选择（复刻 mira-client `getMediaPreviewSource`）：
  - mp4 → `getUrl('/api/files/file/$libId/${file.id}')`（video_player 原生支持）
  - 非 mp4（mov/avi/mkv/flv/wmv/webm/m4v/mpg/mpeg/3gp）→ `getUrl('/api/files/preview/$libId/${file.id}/index.m3u8')`（video_player 支持 HLS）
- 播放控件用 chewie（播放/暂停/进度/全屏）。同样支持左右翻页切换视频（PageView 或按钮）。

### 第 8 步：上传
- **`upload_screen.dart`**：用 `file_picker.pickFiles()` 选文件 → 调 `client.files().uploadFile(File(path), libraryId, tags:?, folderId:?)`（SDK 已实现 multipart，`dart:io File`）。上传中显示进度（监听 multipart 字节数或简单转圈），完成后刷新 filesProvider。
- 手机：可提供"选择照片/视频"入口（image_picker 作为 file_picker 的备选）。

## 规范约束（下个 agent 必须遵守）
1. **只用 `lib/mira_sdk/`**，禁止用 `lib/src/packages/mira_sdk/`（旧）。
2. **统一状态走 Riverpod**，新页面用 `ConsumerWidget`/`ConsumerStatefulWidget`，不在 widget 里直接 new MiraClient（除了 server_edit 的临时测试连接）。
3. **缩略图/图片/视频 URL 必须经 `client.getHttpClient().getUrl(path)`** 拼接（带 token），不要裸拼字符串。
4. **文件夹树客户端组树**：用 `folders().getAll()` 全量 + 按 parentId 分组，**不要用 folders().query() / getSubFolders()**（parent_id 过滤不可靠，已验证）。
5. **FileData.tags 是 JSON 字符串**，用 `file.parsedTags()` 解析，不要当 List 用。
6. **根节点 parentId 为 null**（Folder/Tag 都一样），判根用 `parentId == null`，不是 `== 0`。
7. **FileData 时间戳是 Unix 秒（int）**（createdAt/importedAt），不是 ISO 字符串。
8. UI 用 Material 3 + 现有 `liquid_glass_widgets` 玻璃态风格；颜色走 ColorScheme，不硬编码。布局按手机单列/双列设计，不照搬桌面三栏。
9. 遵循现有命名路由体系（`AppRouter`），新增页在 `app_router.dart` 注册。
10. **每改 SDK 必须重跑 `test/mira_sdk_api/` 不回归**。

## 验收标准（全部满足才算完成）
1. **编译通过**：`flutter analyze lib/ lib/src/` 无 error（含修复 server_edit 死代码）。
2. **SDK 测试不回归**：`flutter test test/mira_sdk_api/` 全绿（41 测试）。
3. **端到端可走通**（连真实 server admin/admin123）：
   - 添加服务器→测试连接成功→保存。
   - 登录后看到素材库列表，选择库 `1779810479725` 进入主页。
   - 文件夹/标签 Tab 显示真实文件夹（folder1/未分类/1）和标签（tag1），支持多选。
   - 多选文件夹后，图片网格只显示该文件夹下的图片（验证 folder 过滤修复生效）。
   - 图片瀑布流正常加载缩略图并分页（滚动到底加载更多）。
   - 点图片进大图，左右滑动能切换上/下张。
   - 点视频进播放器，mp4 能播放；非 mp4 走 HLS 能播放（若测试库有非mp4视频）。
   - 上传一张图片后能在列表看到新文件。
4. **断开重连**：断开后重连同一/不同服务器，状态正确重置，无 client 泄漏（dispose）。
5. 无测试数据残留（上传的测试文件应可手动删除，或上传到可丢弃的库）。

## 已知风险/边界（不在本 plan 修复，但需知晓）
- 后端 `folders/query` 的 parent_id 过滤不可靠 → 本 plan 全程用 getAll 绕开，不依赖它。
- 后端 `getFiles` 无 `extension` 过滤分支（只认 `category`）→ 按"分类"而非"扩展名"筛选。
- 本 plan 不做：WebSocket 实时同步、回收站浏览、文件元数据编辑、拖拽排序、多服务器同时连接、SMB 本地路径优化（移动端统一走 HTTP）。
- `lib/src/packages/mira_sdk/`（旧SDK）暂不删除，避免牵连；下个 agent 不要 import 它。