# public-interfaces

## CLI 子命令（`index.ts` 路由）

入口实际识别的子命令仅以下两个：

### `convert` — 数据库转换工具

- 描述：从源 SQLite 数据库转换数据到目标目录，支持文件夹和标签过滤。
- 脚本：`scripts/convertLibraryData.ts`
- 入口给出的示例：
  - `npm run script convert -- --sourceDbPath=source.db --targetDir=./target`
  - `npm run script convert -- --sourceDbPath=source.db --targetDir=./target --targetFolders=1,2,3`
  - `npm run script convert -- --sourceDbPath=source.db --targetDir=./target --targetTags=5,6 --importType=move`
- 可推断参数（来自示例，完整解析逻辑位于脚本内、未深扫）：
  - `--sourceDbPath`：源 SQLite 数据库路径
  - `--targetDir`：目标目录
  - `--targetFolders`：逗号分隔的文件夹 ID 过滤
  - `--targetTags`：逗号分隔的标签 ID 过滤
  - `--importType`：导入类型，示例值为 `move`

### `import` — 文件导入工具

- 描述：将指定路径的文件导入到图书馆数据库中。
- 脚本：`scripts/pathFilesToLibrary.ts`
- 入口给出的示例：
  - `npm run script import -- --source=./files --target=library.db`
  - `npm run script import -- --source=/path/to/files --target=library.db --importType=move`
  - `npm run script import -- --source=./documents --maxFolderDepth=3`
- 可推断参数：
  - `--source`：待导入的源路径（文件或目录）
  - `--target`：目标素材库数据库路径
  - `--importType`：`copy` 或 `move`（脚本类型 `FileImportOptions.importType` 为 `'copy' | 'move'`）
  - `--maxFolderDepth`：目录递归最大深度（对应 `FileImportOptions.maxFolderDepth`）

## 全局用法

- 无参 / `--help` / `-h`：打印总用法。
- `<command> --help`：打印该命令的示例帮助。

## 程序化导出（`index.ts`）

```ts
export { scripts, runScript, showUsage, showScriptHelp };
```

- `scripts`：`Record<string, ScriptInfo>` 命令路由表。
- `runScript(name, args)`：spawn 子进程执行命令。
- `showUsage()` / `showScriptHelp(name)`：用法输出。

## 脚本内部公开符号（基于抽样）

- `scripts/pathFilesToLibrary.ts`：
  - `class PathFilesImporter`，构造参数 `libraryData: LibraryServerDataSQLite`。
  - 方法 `importFilesFromPath(sourcePath, options?: FileImportOptions): Promise<void>`。
  - 接口 `FileImportOptions { maxFolderDepth?: number; importType?: 'copy' | 'move' }`。
- `scripts/convertLibraryData.ts`：抽样仅见数据接口（`SourceFile` / `SourceFolder` / `SourceTag` / `UrlMeta` / `DescMeta` / `FolderMeta`），主转换函数与 CLI 参数解析未深扫。
