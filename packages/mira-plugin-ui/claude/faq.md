# mira-plugin-ui 常见问题（FAQ）

## Q: 为什么 Select 打不开 / Dialog 内容点不了？

历史事故：曾手写包装组件用 `v-bind="props"` 透传了 `undefined` 键，触发 reka-ui（vueuse `useVModel`）受控模式误判。**官方组件禁止手写或魔改**，它们靠 `useForwardPropsEmits` / `reactiveOmit` 正确转发 props；业务组件只组合，不重新实现。（源自 README 记载）

## Q: 改了源码，消费方没生效？

`file:` 链接的宿主消费的是 dist：改源码后必须 `pnpm build`；开发期用 `pnpm build:watch`。workspace 依赖走 library 源码入口的不受此影响。CDN 形态（`mira-app-server/public/pair.html`）还需重跑 `mira-app-server/scripts/copy-plugin-ui.mjs` 同步 `public/vendor/`。

## Q: 宿主页面样式全乱了 / 组件没样式？

- 根入口消费必须同时引入 `mira-plugin-ui/mira-plugin-ui.css`（自包含，含 token 与内联字体）。
- CSS 暗色跟随宿主 `.dark` 类；token 与 mira-client 一致，宿主已定义同名变量时互不干扰。
- 新增组件的 class 必须在 `src/assets/tailwind.css` 的 `@source "../"` 扫描范围内，否则 dist 缺类（曾出现文件列表 grid 塌成单列）。

## Q: library 子入口和根入口怎么选？

- 宿主**没有** tailwind/组件环境（任意 HTML、tiptap web 插件）→ 根入口 + dist CSS。
- 宿主**已有** tailwind v4 + shadcn token（mira-browser-extension）→ `mira-plugin-ui/library` 源码消费，样式并入宿主体系，且可 tree-shake、直引单个 .vue。

## Q: 怎么切换组件库语言 / 宿主接管文案？

- 切语言：`setLocale('en')`（根入口或 library 子入口均可导入，同一单例），全部组件即时生效；主窗口监听 `window.mira.onLocaleChanged` 调一次 setLocale 即全局生效。
- 宿主接管文案：library 系列组件传 `t` prop（签名 `(key, params) => string`，vue-i18n 的 t 可直接传），缺 key 自动回退内置词典；业务组件传 `title`/`submitText`/`cancelText` 等文案 props 覆盖对应位置。初始语言探测：`window.mira.app.locale` → `navigator.language` → zh。

## Q: 怎么新增 shadcn 基础组件？

`npx shadcn-vue@latest add <name> --overwrite`；代理拉不到 registry 时 `node demo/fetch-registry.mjs`（改顶部 names 列表）。之后在 `src/index.ts` 补 `export * from './components/ui/<name>'`，样式由 `@source` 自动覆盖。

## Q: 树组件怎么拿到数据？

组件不访问数据源。宿主实现 `LibraryTreeServices`（listFolders/listTags/createNode/deleteNode/updateNode?/updateSortIndex?/moveNode?）注入；弹窗注入 `LibraryTreeDialog`；上传注入 `LibraryTreeUpload`。`updateSortIndex` 且 `sort='custom'` 才启用拖拽排序；`moveNode` 提供后启用跨层移动（确认走内置 AlertDialog）。`useLibraryTreeData().seed(libId, items)` 可先注入宿主缓存立即渲染。

## Q: 拖放文件到树想自定义处理怎么办？

传 `fileDrop` 回调即接管（收 `LibraryTreeFileDropPayload`）；不传则走内置 `defaultDropUpload`（`defaultDropUploadMode='direct'` 直传 / `'dialog'` 开 `upload.pick` 预填）。传了 fileDrop 又想走默认上传必须显式 `useDefaultDropUpload=true`——Vue 对 Boolean prop 未传缺省是 false，不能用 `??` 判断"是否传过"（源码内有注释说明此坑）。

## Q: 标签传标题还是 ID？

**传 ID**（`LibraryTreeUploadTarget.tags` / `BatchUploadFileMeta.tags` / `initialTagTitles` 均兼容旧标题值，新调用方一律传 ID）。旧版按标题名关联，2026-11 起改为 ID，`BatchUploadForm` 仅提交当前标签树中仍存在的 ID。

## Q: MediaBrowser 瀑布流高度不对？

提供 `MediaBrowserServices.getMetadataByIds`（对应 SDK `files().getMetadataByIds`）后按真实宽高布局；`item.aspect`（"W:H"）优先；两者都没有退 1:1。分页一页 200。

## Q: demo 连不上 server？

demo 经 vite 代理 `/mira-api → http://127.0.0.1:8081`（server 无 CORS，不能直连跨域）。确认本机 8081 有 server 在跑，默认账号 admin/admin123（demo 内置）。demo 的 SDK alias 指向 `../mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs`，需 mira-app-core 已构建。
