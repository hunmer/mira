# mira_gallery_dl

gallery-dl 图库批量导入插件（协议 A 类深度插件，无 web/）。spawn 外部 gallery-dl 命令 `--dump-json` 解析图库链接，经 dashboard 页勾选后导入素材库。服务端只做解析与安全校验，自身零运行时依赖。

## 约定

- `init(inst)` 返回自定义类实例，经 `getRoutes()` 暴露 dashboard 路由 `/tools/gallery-dl-importer`（components/GalleryDlImporter.js，组"工具"）
- HTTP 路由（httpRouter.registerRounter）：`GET /gallery-dl/status`（探测命令可用性+版本）、`POST /gallery-dl/parse`（解析 URL 列表）
- gallery-dl 命令探测顺序：`GALLERY_DL_PATH` → `GALLERY_DL_PYTHON`（-m gallery_dl）→ Windows %APPDATA%/Python/*/Scripts/gallery-dl.exe → PATH gallery-dl → py/python -m
- SSRF 防护：仅 http/https、禁 userinfo/localhost/.local/私有 IP，DNS 解析后二次校验（assertPublicUrl）
- 限额：单次最多 20 条链接、500 个条目，gallery-dl `--range 1-200`，输出 20MB、超时 120s
- 命令行白名单：仅允许 `--proxy`（http/https/socks5），其余参数拒绝
- 只保留图片扩展名（jpg/jpeg/png/gif/webp/avif/bmp），条目含缩略图 URL（优先 360x360 变体）
- 构建命令：`npm run build`（tsc）；`npm run test` = build + node test.js
- 不注册文件格式，与缩略图无关

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 全部逻辑（370 行）：命令探测、输出解析、SSRF 校验、路由 |
| `components/GalleryDlImporter.js` | dashboard 导入页组件 |

## 扫描状态

- 版本：1.0.0
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、目录结构
- 未扫描：components/GalleryDlImporter.js、test.js
