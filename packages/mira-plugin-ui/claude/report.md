# 代码自检报告（2026-11-21，HEAD 于 bc638a73 之后 21 个 "fix" 提交）

> 证据口径：以 git diff（bc638a73..HEAD）、wc -l 行数实测、全仓 grep 引用计数为准，未采信提交信息（全为 "fix"）。范围：本次 34 个变更文件 + 消费方复核。

## 1. 结构与职责

- ⚠ `src/library/FilterBar.vue` 1140 行（本次 +103），包内最大；8 类筛选器 + 已保存过滤器 + 排序器混在一个 SFC。建议：按筛选器类型拆子组件（date/metadata/size 各自弹层独立）。
- ⚠ `src/i18n.ts` 631 行词典与逻辑同文件（可接受——纯数据 + 少量函数，拆分收益低）。
- ✓ 树体系职责分层清晰：`tree.ts` 纯函数（build/sort/filter）、`LibraryTreeView.vue` 容器（784 行，props 编排）、`LibraryTree.vue` 递归渲染（699 行）；拖放上传默认路由独立成 `defaultDropUpload.ts`（29 行）而非内联。
- ✓ i18n 词典从 `library/i18n.ts`（237 行）收敛到包级 `src/i18n.ts` 单例，library 侧只留 5 行兜底转发——消除了两处词典漂移风险。

## 2. 重复

- ✓ 本次重构方向就是去重：zh 词典合一（library/顶层共享一份 key）；`defaultDropUpload` 把「File 优先于 URL」的防重复上传规则收敛为单一函数（树容器 + 各落点共用 `dispatchFileDrop`）。
- ⚠ `demo/App.vue` 与组件 Props 存在演示性重复（排序模式标签表等），属 demo 可接受。

## 3. 可读性

- ⚠ `LibraryTree.vue` 分支连接线：常量（`BRANCH_ROW_H=28` 与模板行 `h-7` 耦合）、`measureRows` 手测 offsetTop、手写 rAF 弹簧动画集中在渲染组件里（约 200 行视觉细节）。建议后续抽 `useBranchLines`/连接线子组件。可读性尚可——每段有中文注释说明坐标推导。
- ✓ 关键坑有源码注释：`useDefaultDropUpload` 的 Vue Boolean prop 缺省 false 语义（LibraryTreeView.vue `dispatchFileDrop` 内）；`createdTimeOf` 缺失时间排最后（-Infinity）。
- ⚠ 提交信息全部为 "fix"（含 1 个 "fIx"），无语义化线索，可追溯性差（流程问题非代码问题）。

## 4. 可复用资产

| 资产 | 位置 | 实测复用方 |
|------|------|-----------|
| `defaultDropUpload` / `parseDrop` / `canAcceptDrop` | `src/library/defaultDropUpload.ts` / `drag-data.ts` | LibraryTreeView 内置；mira-browser-extension 有同名同源测试（`src/content/default-drop-upload.test.ts`） |
| `sortTree` / `buildTree` / `filterTree` | `src/library/tree.ts` | LibraryTreeView + browser-extension（经 library 子入口，grep `useLibraryTree` 4 文件） |
| 包级 i18n 单例 `setLocale`/`useI18n` | `src/i18n.ts` | 包内 6 顶层组件 + 全部 library 组件 + demo；双入口导出供 9 个消费方宿主使用 |
| `MediaLibraryView` 三栏整合 | `src/library/MediaLibraryView.vue` | mira-cep-panel（grep 实测） |
| `BatchUploadDialog`/`Form` | `src/` | browser-extension（src 直引）+ online 插件（image-search 等，grep 实测 10 文件） |
| ui 基础组件 68 族 | `src/components/ui/` | 全部消费方（含 pair.html 经 UMD 全局注册） |

## 复用守则

1. 新 UI 优先组合 `components/ui` 官方组件，禁止手写包装（reka-ui 误判事故）。
2. 树数据操作只走 `tree.ts` 纯函数 + `LibraryTreeServices` 注入，组件内不直接 fetch。
3. 文案一律进 `src/i18n.ts` 词典（zh/en 同补），不写死字符串；宿主接管经 `t` prop / 文案 props。
4. 拖放上传路由复用 `defaultDropUpload`，自定义场景用 `fileDrop` 回调，不自建解析（`parseDrop` 已处理 srcset/Pinterest/moz-url）。
5. 标签引用一律传 ID（兼容旧标题值的逻辑不要再扩散）。
