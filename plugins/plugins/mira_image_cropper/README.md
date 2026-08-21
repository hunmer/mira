# mira_image_cropper 多选区裁切

单张图片上同时绘制多个矩形选区，实时预览裁切结果，批量导出 PNG/JPG，或一键保存到素材库。

## 结构

```
mira_image_cropper/
  index.ts            # 服务端入口 → dist/：注册 POST /api/image-cropper/save（裁切结果入库）
  web/                # 客户端插件（workspace 包，宿主自动发现并分发给客户端）
    plugin.json       # 客户端插件清单（pluginId: a4d2b8c6-...）
    index.js          # 宿主侧脚本：右侧栏贡献 + 媒体右键菜单「多选区裁切」
    src/              # SPA 源码（Vue3 + Vite + Pinia + Tailwind/mira-plugin-ui）
    dist/             # SPA 构建产物（由 /server-plugins/<lib>/mira_image_cropper/ 托管）
```

## 功能（MVP）

- 图片上传：点击上传 / 整窗拖拽 / Ctrl+V 粘贴 / 右键素材打开（多选时 ‹ › 切换）
- 多矩形选区：空白拖拽新建、拖拽移动、8 手柄缩放、点击选中/取消、Delete 删除、清空
- 选区标注实时坐标与尺寸（原图像素，允许越界为负）
- 滚轮缩放（指针中心）/ 中键或空格拖拽平移 / 适应窗口
- 右侧实时缩略图列表，点击联动选中
- 撤销 / 重做（选区快照栈）
- 导出：PNG/JPG（可调质量）、前缀命名、逐个下载或批量下载、批量保存到素材库

## 构建与安装

```bash
# 服务端：tsc → dist/
cd plugins/plugins/mira_image_cropper
pnpm install && pnpm build

# 客户端 SPA：vite → web/dist/（workspace 包，可在仓库根统一安装）
cd web && pnpm build
```

在目标素材库的插件目录 `plugins.json` 中登记后重启服务：

```json
[{ "name": "mira_image_cropper", "version": "1.0.0", "enabled": true, "path": "mira_image_cropper" }]
```

## API

`POST /api/image-cropper/save`（需 `Authorization: Bearer <token>`，body 需含 `libraryId`）

```jsonc
{ "libraryId": "xxx", "fileName": "photo_crop_1.png", "dataUrl": "data:image/png;base64,..." }
// → { "success": true, "file": { "id": "...", "duplicate": false } }
```
