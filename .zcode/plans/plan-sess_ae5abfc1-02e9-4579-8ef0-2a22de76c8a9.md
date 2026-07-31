# 修复：未分类文件不再创建物理「未分类」子文件夹（服务端根因修复）

## 根因（已通过 curl 确认）

`packages/mira-app-core/src/storage/sqlite/LibraryServerDataSQLite.ts:248-254` 的 `getFolderName()`：
```ts
async getFolderName(folderId?: number): Promise<string> {
  if (folderId) {
    const folder = await this.getFolder(folderId);
    if (folder) return folder.title;
  }
  return '未分类';   // ← 问题所在
}
```
对 `folder_id` 为 null 的未分类文件，返回字面量 `'未分类'`。`getItemPath()` / `getItemFilePath()` 用它做 `path.join(libraryPath, '未分类')`，于是**每次上传未分类文件都会在素材库物理目录下创建「未分类」子文件夹**。

curl 实证（无 folderId 上传）：
```
"path": "I:\\game\\未分类\\followcursor-13177.mp4", "folder_id": null
```

## 修复方案（用户选择：保留已有数据 + 保留客户端修复）

把未分类文件的存储目录从「未分类」子文件夹改为**素材库根目录**。

### 改动 1（核心）：`packages/mira-app-core/src/storage/sqlite/LibraryServerDataSQLite.ts:248-254`

```ts
async getFolderName(folderId?: number): Promise<string> {
  if (folderId) {
    const folder = await this.getFolder(folderId);
    if (folder) return folder.title;
  }
  // 未分类文件（folder_id 为空）存放在素材库根目录，返回空串让 path.join 自然落到根目录
  // 不再返回字面量 '未分类'，避免每次上传未分类文件都创建物理「未分类」子文件夹
  return '';
}
```

**安全性已审计**：所有 `path.join(libraryPath, folderName)` / `path.join(libraryPath, folderName, name)` 调用点在 `folderName=''` 时都能正确落到根目录（Node 的 `path.join` 会合并空段）：
- `getItemPath` (139-143) → 根目录 ✓
- `getItemFilePath` (154-161) → `根目录/文件名` ✓
- `_moveFileToFolder` (FileImport.ts:83-105) → src/dest 比较与移动逻辑均正确，`'' === ''` 时为 no-op ✓
- `deleteFolder` (FolderOperations.ts:55-78) → 传入的是真实 id，不命中空串分支 ✓

### 改动 2（防回归）：`packages/mira-client/src/renderer/services/MiraSDKService.ts:537-539`

Docker+SMB（无 mountPath 的旧分支）原本依赖 `folder_name` 拼路径：
```ts
if (file.folder_name && file.name) {
  localFile = normalizedSmbPath + file.folder_name + sep + file.name
}
```
`folder_name` 变 `''` 后 guard 失效，未分类文件会回退到 HTTP URL（能播但丢失直连优化）。调整为：
```ts
if (file.name) {
  localFile = file.folder_name
    ? normalizedSmbPath + file.folder_name + sep + file.name
    : normalizedSmbPath + file.name
}
```
保留对有 folder_name 文件的旧行为，同时让未分类文件也能走 SMB 直连。

### 改动 3（已完成，保留）：客户端工具栏上传跟随 tab 上下文

之前已改的 3 个文件（`HomeView/index.vue`、`HomeDialogs.vue`、`FileUploadDialog/useFileUploadDialog.ts`）保留不动，与服务端修复互补。

## 对已有数据的影响（用户已知悉并选择保留）

用户素材库里已存在物理 `I:\game\未分类\` 文件夹（含文件）：
- **不会被自动迁移或删除**（符合「保留」选择）
- 下次 `LibraryWatcher.initialSync` 扫描时，`resolveFolder` 会为这个物理文件夹**创建一个真实的「未分类」文件夹记录**，里面的文件归入该文件夹（`folder_id` 不再为 null）
- 这些文件仍可正常访问和播放，只是不再出现在虚拟「未分类」tab 中（因为它们现在属于一个真实文件夹）——这是保留旧数据的自然结果
- **新建上传的未分类文件**会直接进根目录，不再创建新的「未分类」子文件夹

## 不改动的地方

- `LibraryWatcher.resolveFolder` / `FsRouter.resolveFolder`：保持现状（root → folder_id null 的映射与新模型一致）
- 前端展示层：所有「未分类」文案都是硬编码、基于 `folder_id` 判空显示，与 `folder_name` 字段无关，无需改动
- 无新增 DB migration（用户选择保留已有数据）

## 影响面

- 2 个文件的服务端/SDK 改动（核心 1 行 + 防 1 处回归）
- 不破坏现有 path.join 调用（已逐处审计）
- 新库干净（永远不产生物理「未分类」文件夹）；旧库保留（用户选择）
