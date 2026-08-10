# Mira Zipper Format

Mira 服务端 + 客户端格式插件，为 `.zip` 归档提供只读浏览预览：解压条目树、图片/文本/音视频内联预览、首图缩略图。

迁移自 Eagle 插件 `8f788ab3-52e9-4190-a8c5-5ee1973ca968`（zipper）。Eagle 的 `eagle.*` API、原生 Node 解压模块（7zip-min / adm-zip / node-unrar-js）以及外部编辑/回写功能均不复用；改为 Mira 的 `getExtraFile`/`getExtraFileUrl` 鉴权 URL + `yauzl` 流式解压 + 原生 HTML/JS viewer。

仅处理 ZIP；rar/7z/tar 不在本插件接管范围。
