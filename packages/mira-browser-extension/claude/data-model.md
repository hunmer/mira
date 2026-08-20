# 数据模型

> 更新:2026-08-20。类型定义在 `shared/types.ts`。核心是设置 + 上传任务 + 跨上下文文件 + 嗅探资源 + 消息协议。

## 设置(`ExtensionSettings`,`DEFAULT_SETTINGS`)

存 `chrome.storage.local` 的 `mira_settings` key。`loadSettings`/`saveSettings`(`storage.ts`)合并默认值保证字段完整。

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| servers / activeServerId | `ServerConfig[]` / string | `[]` / `''` | **多服务器管理**(2026-08-11 后新增) |
| serverURL | string | `''` | 后端地址(UI 默认填 `http://localhost:8081`) |
| username/password | string | `''` | 凭据(登录后存) |
| libraryId | string | `''` | 当前素材库(记住上次选择) |
| folderId | string? | — | 默认目标文件夹 |
| tags | string[] | `[]` | 默认标签 |
| uiMode | `'popup'\|'sidePanel'` | `popup` | UI 形态 |
| theme | `'auto'\|'light'\|'dark'` | `auto` | 主题(auto 跟随系统) |
| locale | `'zh-CN'\|'en'` | `zh-CN` | 界面语言(vue-i18n) |
| dragPopoverEnabled | boolean | true | 拖拽浮层开关 |
| dropZoneEnabled | boolean | true | 面板拖放区开关 |
| imageHoverButtonEnabled | boolean | false | 图片悬停按钮开关(新增) |
| snifferEnabled | boolean | false | 嗅探开关(持久化,自动启用) |
| snifferView | `'list'\|...` | `list` | 嗅探视图(列表/瀑布流) |
| snifferSortOrder | string | `desc` | 嗅探排序 |
| snifferMinWidth / snifferMinHeight | number | 0 | 嗅探尺寸过滤 |
| snifferAspectRatios | string[] | `[]` | 嗅探比例过滤 |
| snifferKinds | ResourceKind[] | `[image,audio,video]` | 嗅探类型 |
| autoScrollEnabled | boolean | false | 自动滚动 |
| autoScrollDelay | number | 800 | 滚动间隔(ms) |
| batchImportConcurrency | number | 3 | 批量导入并发(新增) |
| imuEnabled | boolean | true | 高清大图升级(maxurl) |
| imuRules | ImageUrlRule[] | DEFAULT_IMAGE_URL_RULES | maxurl 规则(新增) |

session 存 `chrome.storage.session` 的 `mira_session`:`{token?, username?, password?}`。

## 跨上下文文件(`StagedFile`)

**最重要的坑**:`chrome.runtime.sendMessage` 跨上下文传文件,`File` 不可序列化。

| wire 格式 | 到达 SW 形态 | 是否可用 |
|-----------|--------------|----------|
| 裸 `ArrayBuffer` | `{}`(空对象) | ❌ 丢字节 |
| `Uint8Array` | `{0:255,1:216,...}`(类数组普通对象,丢 TypedArray 身份) | ❌ instanceof 失败 |
| **`number[]`(真 Array)** | `number[]` | ✅ 稳定 |

**结论**:用 `fileToStaged` 转 `number[]`(`Array.from(new Uint8Array(buffer))`)发送;`stagedToFile` 的 `normalizeBytes` 兼容**全部形态**(number[]/Uint8Array/ArrayBuffer/类数组对象/损坏)。

## 上传(`UploadTask` / `UploadSource`)

- `UploadSource`:`'screenshot' | 'dragdrop' | 'sniffer' | 'dropzone'`
- `UploadStatus`:`'queued' | 'uploading' | 'success' | 'failed'`
- `UploadTask`:`{id, source, file: File, libraryId, tags?, folderId?, status, percent, error?, result?, createdAt}`
- uploader(`uploader.ts`):并发 3(`MAX_CONCURRENCY`)、重试 2(`MAX_RETRY`、间隔 1000ms)、成功 10s 移除(`SUCCESS_TTL`)、取消(AbortController)

## 嗅探(`SniffedResource` / `ResourceKind`)

- `ResourceKind`:`'image' | 'audio' | 'video'`
- `SniffedResource`:`{id(url hash), url, kind, source:'dom'|'perf', width?, height?, duration?, poster?, mimeType?, variants?(srcset), occurrences, sniffedAt}`
- 去重:`urlToId`(字符串 hash)→ `dedupeByUrl`(单次)/`mergeResources`(跨次累加 occurrences)
- 内存快照:SW 的 `sniffSnapshots: Map<tabId, SniffedResource[]>`,tab 关闭清理

## 文件夹 / 库(来自 SDK)

- `Library`(SDK):id, name, ...
- `Folder`(SDK):`id: number`, title, parent_id?, ... — SDK 的 `folderId` 是 `string`,边界处 `String(folder.id)`

## maxurl(IMU)

- `ImuResult`:`{url, is_original?, bad?, fake?, video?}`
- bridge 消息(page MAIN world ↔ content,`window.postMessage`):
  - req:`{tag:'__mira_imu_req__', id, url, iterations}`
  - res:`{tag:'__mira_imu_res__', id, result?: ImuResult[], error?: string}`
- `upgradeImageUrl` 返回:**排序候选数组**(is_original 优先,去 bad/fake/video,去重)+ 原 url 保底在末尾

## 状态管理

- 无 Pinia/Vuex。跨上下文状态用「消息 + storage」:
  - UI composables(`useConnection`/`useSettings`/`useSniffer`/`useUploadQueue`)持有模块级 `ref`(如 `status`/`libraries`/`settings`/`resources`/`tasks`),跨组件共享。
  - SW 用模块级 Map/变量(`sniffSnapshots`、`currentClient`、`cachedToken`),不保证持久(SW 会被回收)。

## 主题

`Theme = 'auto' | 'light' | 'dark'`,存设置。`resolveTheme(auto)`→ `prefers-color-scheme`;`<html data-theme>` + `style.css` 的 `:root[data-theme="..."]` 变量集。
