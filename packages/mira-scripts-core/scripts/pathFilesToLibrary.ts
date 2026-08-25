import * as path from 'path';
import * as fs from 'fs';
import { LibraryServerDataSQLite } from 'mira-app-core/storage/sqlite';

interface FileImportOptions {
  maxFolderDepth?: number;
  importType?: 'copy' | 'move' | 'link';
}

export class PathFilesImporter {
  constructor(
    private libraryData: LibraryServerDataSQLite,
  ) { }

  async importFilesFromPath(
    sourcePath: string,
    options: FileImportOptions = {}
  ): Promise<void> {
    await this.libraryData.initialize();
    try {
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source path does not exist: ${sourcePath}`);
      }

      const stats = fs.statSync(sourcePath);
      if (stats.isFile()) {
        await this.importSingleFile(sourcePath, sourcePath, options);
      } else {
        await this.importDirectoryFiles(sourcePath, sourcePath, options);
      }
    } catch (error) {
      console.error('Error during file import:', error);
      throw error;
    }
  }

  private async importDirectoryFiles(
    sourcePath: string,
    dirPath: string,
    options: FileImportOptions
  ): Promise<void> {
    const files = fs.readdirSync(dirPath);
    let processed = 0;

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          await this.importDirectoryFiles(sourcePath, fullPath, options);
        } else if (stats.isFile()) {
          await this.importSingleFile(sourcePath, fullPath, options);
          processed++;
          process.stdout.write(`\rProcessed ${processed} files`);
        }
      } catch (err) {
        console.error(`Failed to process file ${fullPath}:`, err);
      }
    }
  }

  private async importSingleFile(
    sourcePath: string,
    filePath: string,
    options: FileImportOptions
  ): Promise<void> {
    const extName = path.extname(filePath).toLocaleLowerCase();
    if (['.db'].includes(extName)) return;

    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    // 处理文件夹层级
    const folderPath = this.getLimitedFolderPath(sourcePath, filePath, options.maxFolderDepth);
    const folderId = await this.getOrCreateFolder(sourcePath, folderPath);

    // 准备文件数据
    const fileData = {
      name: fileName,
      created_at: Math.floor(stats.birthtimeMs / 1000),
      imported_at: Math.floor(Date.now() / 1000),
      size: stats.size,
      hash: '',
      notes: '',
      folder_id: folderId,
      reference: '',
      path: options.importType === 'link' ? filePath : null,
      tags: null
    };

    // 插入文件记录
    await this.libraryData.createFile(fileData);

    // 处理文件移动/复制
    if (options.importType) {
      try {
        // 确保目标路径正确
        const targetDir = await this.libraryData.getItemPath(fileData);
        if (!targetDir) {
          throw new Error('Failed to get target directory path');
        }
        const savePath = path.join(targetDir, fileData.name);
        const saveDir = path.dirname(savePath);

        if (!fs.existsSync(saveDir)) {
          try {
            fs.mkdirSync(saveDir, { recursive: true });
          } catch (err) { }
        }
        console.log(filePath);
        if (options.importType === 'copy') {
          fs.copyFileSync(filePath, savePath);
        } else if (options.importType === 'move') {
          fs.renameSync(filePath, savePath);
        } else if (options.importType === 'link') {
          fs.symlinkSync(filePath, savePath, 'file');
        }
      } catch (err) {
        console.error(`Failed to ${options.importType} file: ${filePath}`, err);
      }
    }
  }

  private getLimitedFolderPath(
    sourcePath: string,
    filePath: string,
    maxDepth?: number
  ): string {
    if (maxDepth === undefined || maxDepth <= 0) {
      return path.dirname(filePath);
    }
    const parts = path.dirname(filePath).replace(sourcePath, '').split(path.sep).filter(p => p !== '.' && p !== '');
    return parts.slice(0, Math.min(maxDepth, parts.length)).join(path.sep);
  }

  private async getOrCreateFolder(sourcePath: string, folderPath: string): Promise<number | null> {
    if (!folderPath || folderPath === '.' || folderPath === path.sep) {
      return null;
    }

    // 规范化路径并分割
    const parts = folderPath.replace(sourcePath, '').split(path.sep).filter(p => p);
    let currentParentId: number | null = null;
    for (const part of parts) {
      // 检查文件夹是否已存在
      const existingFolder: Record<string, any> | null = await this.libraryData.findFolderByName(part, currentParentId);
      if (existingFolder) {
        currentParentId = existingFolder.id;
        continue;
      }

      // 创建新文件夹
      console.log({ msg: 'create_folder', part, parts })
      const newFolderId = await this.libraryData.createFolder({
        title: part,
        parent_id: currentParentId
      });
      currentParentId = newFolderId;
    }

    return currentParentId;
  }
}

// 使用示例
async function main(sourcePath: string, options?: FileImportOptions & { targetDbPath?: string }) {
  if (!sourcePath) {
    console.error('Usage: ts-node pathFilesToLibrary.ts <sourcePath> <targetDbPath> [maxFolderDepth]');
    process.exit(1);
  }

  const config = {
    id: 'library-1',
    customFields: {
          path: options?.targetDbPath
    }
  };

  const libraryData = new LibraryServerDataSQLite(config, {});
  await libraryData.initialize();
  const importer = new PathFilesImporter(libraryData);

  try {
    console.log('Importing files...');
    await importer.importFilesFromPath(sourcePath, options);
    console.log('\nFile import completed successfully.');
  } catch (error) {
    console.error('File import failed:', error);
    process.exit(1);
  } finally {
    await libraryData.close();
  }
}

// 解析命令行参数
function parseArgs(args: string[]): { sourcePath?: string; options: FileImportOptions & { targetDbPath?: string } } {
  const options: FileImportOptions & { targetDbPath?: string } = {
    importType: 'copy', // 默认为复制
  };
  let sourcePath: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      switch (key) {
        case 'source':
        case 'sourcePath':
          sourcePath = value;
          break;
        case 'target':
        case 'targetDbPath':
          options.targetDbPath = value;
          break;
        case 'importType':
          if (value === 'copy' || value === 'move') {
            options.importType = value;
          }
          break;
        case 'maxFolderDepth':
          options.maxFolderDepth = parseInt(value);
          break;
        case 'help':
          console.log(`Usage: ts-node pathFilesToLibrary.ts --source=<sourcePath> [options]
Options:
  --source=<path>          Source path to import files from (required)
  --target=<path>          Target database path
  --importType=<type>      Import type: 'copy' or 'move' (default: 'copy')
  --maxFolderDepth=<num>   Maximum folder depth to preserve
  --help                   Show this help message

Examples:
  ts-node pathFilesToLibrary.ts --source=/path/to/files --target=library.db --importType=move
  ts-node pathFilesToLibrary.ts --source=./files --maxFolderDepth=3`);
          process.exit(0);
          break;
      }
    } else if (!sourcePath) {
      // 支持旧的位置参数方式作为 fallback
      sourcePath = arg;
    }
  }

  return { sourcePath, options };
}

// 如果是直接执行此文件而不是被导入
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`Usage: ts-node pathFilesToLibrary.ts --source=<sourcePath> [options]
Options:
  --source=<path>          Source path to import files from (required)
  --target=<path>          Target database path
  --importType=<type>      Import type: 'copy' or 'move' (default: 'copy')
  --maxFolderDepth=<num>   Maximum folder depth to preserve
  --help                   Show this help message

Examples:
  ts-node pathFilesToLibrary.ts --source=/path/to/files --target=library.db --importType=move
  ts-node pathFilesToLibrary.ts --source=./files --maxFolderDepth=3`);
    process.exit(0);
  }

  const { sourcePath, options } = parseArgs(args);

  if (!sourcePath) {
    console.error('Error: Source path is required. Use --source=<path> or --help for usage information.');
    process.exit(1);
  }

  main(sourcePath, options).catch(console.error);
}
