# 软删除移入 `.trash/` + 文件夹删除移入 `.trash/`

## 背景（已审计确认）

当前软删除 (`deleteFile(moveToRecycleBin=true)`) 只执行 `UPDATE files SET recycled=1`，**物理文件原地不动**；只有 `emptyTrash` 才删物理文件。文件夹删除 (`deleteFolder(deleteFiles=true)`) 是直接 `unlinkSync` 物理删除文件。

审计确认的两个关键事实：
1. **客户端拿到的路径由 `getItemFilePath` 从 `folder_id + name` 推导**（`processingFiles` 调用它），**不读 `files.path` 列**。所以只移动物理文件、不改路径解析，回收站视图里的缩略图/播放会指向已不存在的旧位置 → 必须让 `getItemFilePath` 对 `recycled` 文件改读 `path` 列。
2. **`files.path` 列只有 watcher 三个 `WHERE path=?` 查询在用**（initialSync / handleUnlink / handleNewFile）。其中 `handleUnlink` 找不到行时会 **3s 后硬删 DB 记录**（`deleteFile(id)` 无 recycle 选项）。所以**必须先改 DB 的 path 再移动磁盘文件**，否则旧路径的 unlink 会误删记录。
3. 顶层 `.trash/` 目录**并没有**被 watcher 现有 `rel.includes('/.')` 忽略（顶层无前导 `/`），需显式加 `startsWith('.trash')`。

## 改动方案

### 1. `mira-app-core/.../LibraryServerDataSQLite.ts` — `getItemFilePath`
对 `recycled` 文件直接返回 `path` 列（软删时已写入 `.trash/...` 绝对路径）：
```ts
async getItemFilePath(item, options?) {
  if (options?.isUrlFile) {
    return this.getPublicURL(`api/files/file/${this.getLibraryId()}/${item.id}`);
  }
  // 回收站文件：物理位置已移到 .trash/，直接读 path 列
  if (item.recycled) return item.path || '';
  const libraryPath = await this.getLibraryPath();
  const folderName = await this.getFolderName(item.folder_id);
  return path.join(libraryPath, folderName, item.name);
}
```
这样 `processingFiles`、HTTP `/file` 路由、`emptyTrash`、`recoverFile` 在 recycled 时都能正确定位到 `.trash/`。缩略图仍在 `<lib>/thumbs/`（不动），回收站视图照常显示。

### 2. `mira-app-core/.../mixins/FileOperations.ts`

**`deleteFile` 软删分支**：先改 DB（path→`.trash`、recycled=1），再移动物理文件，顺序保证 watcher 不误删：
```ts
async deleteFile(id, options?) {
  if (options?.moveToRecycleBin) {
    const item = await this.getFile(id);
    if (!item) return false;
    const src = await this.getItemFilePath(item);            // 非回收分支：旧位置
    const libraryPath = await this.getLibraryPath();
    const trashDir = path.join(libraryPath, '.trash');
    if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
    const dest = this.getUniquePath(path.join(trashDir, item.name));
    // 先改 DB（path + recycled），再移动磁盘文件 —— 避免 watcher unlink 旧路径误删记录
    await this.runSql('UPDATE files SET recycled = 1, path = ? WHERE id = ?', [dest, id]);
    if (src && fs.existsSync(src)) {
      try {
        if (path.parse(src).root === path.parse(dest).root) fs.renameSync(src, dest);
        else { fs.copyFileSync(src, dest); fs.unlinkSync(src); }
      } catch (e) { console.error('move to trash failed:', e); }
    }
    return true;
  }
  const result = await this.runSql('DELETE FROM files WHERE id = ?', [id]); // 硬删保持不变（物理删除仍由 FileRoutes 负责）
  return result.changes > 0;
}
```

**`recoverFile`**：从 `.trash/` 移回原位置，恢复 path：
```ts
async recoverFile(id) {
  const item = await this.getFile(id);
  if (!item || !item.recycled) return false;
  const src = item.path;                                      // .trash 绝对路径
  const destDir = await this.getItemPath(item);               // 原文件夹位置（folder_id 可能已失效→根目录）
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const dest = this.getUniquePath(path.join(destDir, item.name));
  await this.runSql('UPDATE files SET recycled = 0, path = ? WHERE id = ?', [dest, id]);
  if (src && fs.existsSync(src)) {
    try { fs.renameSync(src, dest); } catch (e) { console.error('recover from trash failed:', e); }
  }
  return true;
}
```

**`emptyTrash`**：逻辑不变（`getItemFilePath(item)` 因 recycled 改读 path → 自动指向 `.trash/`，删文件 + 缩略图 + DB 行）。无代码改动，靠改动 1 自动生效。

### 3. `mira-app-core/.../mixins/FolderOperations.ts` — `deleteFolder(deleteFiles=true)`
勾选「同时删除文件」时，**把整个文件夹目录作为一个整体 `rename` 进 `.trash/`**，再更新子树所有文件记录（path→新位置、recycled=1），最后删除文件夹行：
```ts
// deleteFiles 分支改为：
const libraryPath = await this.getLibraryPath();
const folderDir = path.join(libraryPath, folderName);
const trashDir = path.join(libraryPath, '.trash');
if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
const trashFolderDir = this.getUniquePath(path.join(trashDir, path.basename(folderDir)));

// 收集子树所有文件（递归子文件夹），先改 DB：path 换前缀 + recycled=1
const allFolderIds = await collectSubtreeFolderIds(id);      // 含自身
for (const f of filesInSubtree) {
  const rel = path.relative(folderDir, path.dirname(f.path)); // 原文件夹内相对路径
  const newPath = path.join(trashFolderDir, rel, f.name);
  await this.runSql('UPDATE files SET recycled = 1, path = ? WHERE id = ?', [newPath, f.id]);
}
// 移动整个文件夹目录（一次 rename，保留结构）
if (fs.existsSync(folderDir)) fs.renameSync(folderDir, trashFolderDir);
// 删除子树文件夹行
await this.runSql('DELETE FROM folders WHERE id IN (...) OR parent_id IN (...)');
```
> 文件夹行没有 `recycled` 列（无该字段、不做 migration），文件夹容器直接从目录树移除；其文件以 recycled=1 进入回收站，可被 `emptyTrash` 清空，或在「还原」时落到根目录（原文件夹已不存在）。这符合「移动整个文件夹到 .trash」的语义。

`deleteFiles=false` 分支（文件移到根/未分类）保持不变。

### 4. `mira-app-server/src/LibraryWatcher.ts` — 显式忽略 `.trash`
在 `ignored`（line 50）和 `shouldIgnore`（line 160）的判断里加入：
```ts
rel === '.trash' || rel.startsWith('.trash') || rel.startsWith('.trash/') ||
```
（顶层 `.trash` 现有 `rel.includes('/.')` 命中不了，必须显式加。）这样移入 `.trash` 的 add 事件不触发导入，避免回收文件被当成新文件重复入库。

### 5. `FileRoutes.ts` 删除路由
硬删 (`moveToRecycleBin=false`) 的物理删除块**保持不变**（core 只删 DB 行，物理仍由路由负责，与现状一致）。软删的物理处理已下沉到 core，路由无需改动。

## 不改动 / 不影响
- 无 DB schema 变更（`files.path`、`recycled` 列已存在）。
- 缩略图不移入 `.trash`（仍在 `thumbs/`），回收站视图照常显示；`emptyTrash`/`recoverFile` 按 `getItemThumbPath` 正确处理。
- hash 去重查询已带 `recycled = 0`，回收文件不干扰重新导入。
- WS `delete` / `recover` 处理器（`FileHandler.ts`）自动受益（core 物理处理下沉后，WS 软删也会正确移入 `.trash`）。

## 影响面
- 3 个 core 文件（`LibraryServerDataSQLite.ts`、`FileOperations.ts`、`FolderOperations.ts`）
- 1 个 server 文件（`LibraryWatcher.ts`）
- 改完需 `pnpm run build:core` → 重装/重启 `mira-app-server` 验证：① 软删文件落到 `<lib>/.trash/` 且回收站可访问 ② 清空回收站才真删 ③ 删文件夹(勾选删除文件)整目录进 `.trash/`