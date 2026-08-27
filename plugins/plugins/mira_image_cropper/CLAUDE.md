# mira_image_cropper

多选区图片裁切深度插件(v1.0.0,2026-08-21 新增,默认 enabled)。形态为「服务端 HTTP 路由 + `web/` 客户端 SPA」:服务端仅一条入库路由,裁切交互全部在 `web/` 插件窗口应用中完成,UI 用 `mira-plugin-ui`(workspace:*)+ Vue 3 + Vite + Tailwind 4。

## 约定

- 协议 A 深度插件,但**不 `extends ServerPlugin`**:`init(inst)` 返回自定义类,构造函数经 `inst.pluginManager.server.backend.getHttpServer().httpRouter` 调 `registerRounter(libraryId, path, method, handler)`,`cleanup()` 中 unregister
- 唯一路由 `POST /api/image-cropper/save`:接收 base64 dataUrl(png/jpeg/webp,上限 64MB),写临时文件后 `dbService.createFileFromPath(..., { importType: 'move' })` 入库
- 无 runtime npm 依赖(仅 node 内置 fs/path + 宿主 dbService),不用 sharp/ffmpeg
- 配置如需持久化写 `{pluginDir}/data/`(git 忽略)
- `web/` 经 `web/plugin.json`(pluginId `a4d2b8c6-...`,permissions `["ui","window"]`)被 ServerPluginManager 分发给客户端

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口,112 行,注册/注销 save 路由 |
| `web/src/App.vue` | SPA 组合根:顶栏 + 左侧图片实例栏 + 中部画布 + 右侧裁切列表 |
| `web/src/components/{CropPanel,CropStage,CropThumb,HeaderBar,MediaRail}.vue` | 裁切面板/画布/缩略图/顶栏/媒体栏 |
| `web/src/stores/cropper.ts` | 裁切状态 |
| `web/src/lib/{host,i18n,server}.ts` | 宿主桥接/国际化/服务端调用 |
| `web/plugin.json` | 客户端插件元数据 |

## 扫描状态

- **更新时间**: 2026-08-25(首建文档)
- **已扫描**: index.ts 全文、web/ 目录结构、package.json、plugins.json / server 运行时注册表(均 enabled)
- **未深扫**: web/ 各组件实现体
