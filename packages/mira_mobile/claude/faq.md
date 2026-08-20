# FAQ / 常见问题

> 更新：2026-08-20。每条给出定位路径。

### Q1：SDK 在哪？怎么调后端？

唯一的 SDK 是 `lib/mira_sdk/`（基于 `http`）。入口 `MiraClient(baseUrl)`，资源域经
`client.auth()/files()/libraries()/...`。App 内**不要** new `MiraClient`（除一次性探活），
统一从 `ref.read(sessionProvider).client` 取。定位：`lib/mira_sdk/client/mira_client.dart`。

### Q2：有 CI 吗？

**没有**。原 `.github/workflows/sdk_test.yml` 只服务已被移除的旧打包 SDK，已一并删除。当前无任何
自动化门禁，改代码后请本地 `flutter analyze` + `flutter test test/mira_sdk_api/` 自检。

### Q3：怎么取到 `MiraClient` 实例去调后端？

不要 `new MiraClient(...)`（除非像 `ServerEditScreen._testConnection` 那样做一次性探活）。
统一经 `ref.read(sessionProvider).client`（`SessionState.client`）。会话恢复/登录后该字段才非空，
未连接时各数据 provider 会返回空/loading。定位：`lib/src/providers/session_provider.dart`。

### Q4：图片/视频直链怎么带鉴权？

经 `client.getHttpClient().getUrl(path)`，它会把 `token` 拼成 URL query `?token=`。
缩略图/原图/HLS 端点见 [public-interfaces.md](public-interfaces.md)。定位：`mira_sdk/client/http_client.dart:getUrl`、`src/utils/media_utils.dart`。

### Q5：画廊为什么不显示真实宽高？

`FileData` 模型**无 width/height**（定位 `mira_sdk/models/file.dart`）。`SliverDynamicFlexbox`
运行时惰性测量缩略图尺寸并缓存，滚动锚定校正避免跳动。视频缩略图无法解析 → 固定 4:3 兜底。
设计依据：`docs/superpowers/specs/2026-08-09-flexbox-masonry-gallery-design.md`。

### Q6：为什么用 `CupertinoApp` 但又有 Material 组件？

`CupertinoApp` 是唯一导航宿主（单 Navigator）；`main.dart` 的 `_MaterialInheritedScope` 补
`Theme`/`ScaffoldMessenger`/`DefaultTextStyle`，并配了 Material localization delegates，
让 `RefreshIndicator`/`TextField`/`Chip`/`showDialog` 等可用。**不要**再嵌一层 `MaterialApp`。
定位：`lib/main.dart`。

### Q7：切库后数据怎么自动刷新？

数据 provider `watch(sessionProvider.select((s) => s.library?.id))`；库 id 变化即失效重载。
`filesViewProvider` 还 listen `fileFilterProvider`。定位：`lib/src/providers/files_provider.dart`。

### Q8：后端响应有几种包裹？SDK 怎么处理？

4 种：`{code,message,data}` / `{success,message,data}` / 裸数组或对象 / 错误态 `{error}`。
`MiraHttpClient._extract` 对含 `data` 字段的对象自动取内层 `data`，否则原样返回。
例外：`/api/libraries` 返回**裸数组**；`FileData.tags` 是 JSON **字符串**（用 `parsedTags()` 解）。
定位：`mira_sdk/client/http_client.dart`。

### Q9：怎么跑测试？

`flutter test`（全部：SDK 集成 + 模型 + 应用层单测）；或 `flutter test test/mira_sdk_api/` 只跑 SDK。
screens 层目前无 widget 测试。详见 [testing-and-quality.md](testing-and-quality.md)。

### Q10：哪些功能还没完成？

`ItemDetailScreen`（`/item_detail`）仍是**静态展示页**（标签/文件夹编辑等处留有 TODO，未接真实编辑逻辑）。
原 `/profile` 占位路由已删除。定位：`lib/src/screens/item_detail_screen.dart`、`lib/router/app_router.dart`。

### Q11：多语言文案在哪改？

`easy_localization`，JSON 翻译在 `assets/translations/`（zh/en），代码里 `'key'.tr()`。
语言切换由 `locale_provider` 持久化并同步到 `EasyLocalization`。定位：`lib/src/providers/locale_provider.dart`、`lib/main.dart`。

### Q12：下载/相册自动备份在哪实现？

下载：`lib/src/services/download_service.dart` + `providers/download_provider.dart` + 队列面板
`screens/download/download_queue_sheet.dart`（通知走 `notification_service.dart`）。
相册自动备份：`lib/src/services/photo_backup_service.dart`（+ `photo_backup_collector.dart`，
基于 `photo_manager`）+ `providers/photo_backup_provider.dart`，设置页 `screens/settings/backup_settings_screen.dart`、`album_picker_screen.dart`。
