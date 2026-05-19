import { LibraryServerDataSQLite } from 'mira-storage-sqlite';
import * as path from 'path';
import * as fs from 'fs';
import { Database } from 'sqlite3';

interface SourceFile {
  id: number;
  title: string;
  size: number;
  date: number;
  birthtime: number;
  link: string;
  md5: string;
}

interface SourceFolder {
  id: number;
  title: string;
  icon: string;
  desc: string;
  meta: string;
  parent: number;
  ctime: number;
}

interface SourceTag {
  id: number;
  title: string;
  icon: string;
  desc: string;
  meta: string;
  parent: number;
  ctime: number;
}

interface UrlMeta {
  fid: number;
  url: string;
}

interface DescMeta {
  fid: number;
  desc: string;
}

interface FolderMeta {
  fid: number;
  ids: string;
}

interface TagMeta {
  fid: number;
  ids: string;
}

export class LibraryDataConverter {
  constructor(private libraryData: LibraryServerDataSQLite) {}

  async convertAndInsertData(data: {
    files: SourceFile[];
    folders: SourceFolder[];
    tags: SourceTag[];
    urlMeta: UrlMeta[];
    descMeta: DescMeta[];
    foldersMeta: FolderMeta[];
    tagsMeta: TagMeta[];
  }, options: { maxItems?: number, sourceDbPath: string, targetDir: string, importType?: string }) {
    try {
      const maxItems = options.maxItems || Infinity;
      let processed = 0;
      const totalItems = Math.min(
        data.folders.length + data.tags.length + data.files.length,
        maxItems
      );

      // 转换并插入文件夹数据
      const folderMap = new Map<number, number>();
      for (const folder of data.folders) {
        const existingFolder = await this.libraryData.getFolder(folder.id);
        if (existingFolder) {
          await this.libraryData.updateFolder(folder.id, {
            title: folder.title,
            parent_id: folder.parent || null,
          });
          folderMap.set(folder.id, folder.id);
        } else {
          const newFolderId = await this.libraryData.createFolder({
            id: folder.id,
            title: folder.title,
            parent_id: folder.parent || null,
          });
          folderMap.set(folder.id, newFolderId);
        }
        this.showProgress(processed, totalItems, 'folders');
      }

      // 转换并插入标签数据
      const tagMap = new Map<number, number>();
      for (const tag of data.tags) {
        const existingTag = await this.libraryData.getTag(tag.id);
        if (existingTag) {
          await this.libraryData.updateTag(tag.id, {
            title: tag.title,
            parent_id: tag.parent || null,
          });
          tagMap.set(tag.id, tag.id);
        } else {
          const newTagId = await this.libraryData.createTag({
            id: tag.id,
            title: tag.title,
            parent_id: tag.parent || null,
          });
          tagMap.set(tag.id, newTagId);
        }
        this.showProgress(processed, totalItems, 'tags');
      }

      // 转换并插入文件数据
      const fileMap = new Map<number, number>();
      const _getSourcePath = (md5: string, title: string) => {
        return  path.join(path.dirname(options.sourceDbPath), '/files/', `${md5.substring(0, 2)}/${md5.substring(2, 4)}/${md5}/`, title);
      }
      
      const thumbsDir = path.join(options.targetDir, 'thumbs');
      if (!fs.existsSync(thumbsDir)) {
        fs.mkdirSync(thumbsDir, { recursive: true });
      }
      for (const file of data.files) {
        if (processed >= maxItems) break;
        const extName = path.extname(file.title).toLocaleLowerCase();
        if(['.rar', '.zip'].includes(extName)) continue;
        const urlMeta = data.urlMeta.find(m => m.fid === file.id);
        const descMeta = data.descMeta.find(m => m.fid === file.id);
        const tags = this.getTagIdsForFile(file.id, data.tagsMeta, tagMap);
        const filePath = this.generateFilePath(file.title, file.link, folderMap);
        const sourcePath = filePath != null && filePath != '' ? filePath : _getSourcePath(file.md5, file.title);
        const itemData = {
          name: file.title,
          created_at: file.birthtime || file.date,
          imported_at: Date.now(),
          size: file.size,
          hash: '', // 不保留hash
          notes: descMeta?.desc,
          folder_id: this.getFolderIdsForFile(file.id, data.foldersMeta, folderMap),
          reference: urlMeta?.url,
          path: filePath,
          tags: tags != null && tags.length ? JSON.stringify(tags) : null,
        };
        try {
          if (options.importType && options.importType !== 'link') {
            // 复制或移动文件
            if(fs.existsSync(sourcePath)){
              let savePath = path.join(await this.libraryData.getItemPath(itemData), itemData.name);
              let counter = 1;
              const originalName = itemData.name;
              const extension = path.extname(originalName);
              const basename = path.basename(originalName, extension);
              
              while (fs.existsSync(savePath)) {
                itemData.name = `${basename} (${counter})${extension}`;
                savePath = path.join(await this.libraryData.getItemPath(itemData), itemData.name);
                counter++;
              }
              const saveDir = path.dirname(savePath);
              if (!fs.existsSync(saveDir)) {
                fs.mkdirSync(saveDir, { recursive: true });
              }
              if(options.importType == 'copy'){
                fs.copyFileSync(sourcePath, savePath);
              }else
              if(options.importType == 'move'){
                fs.renameSync(sourcePath, savePath);
              }
              // 更新 itemData.path 为新的相对路径
              itemData.path = path.relative(options.targetDir, savePath);
            }
          }
          // 如果是 'link' 模式，保持原有的 path 不变
        } catch(err){
          console.error(err);
        }

        const fileData = await this.libraryData.createFile(itemData);
        // 复制封面图
        const coverFile = _getSourcePath(file.md5, 'cover.jpg');
        try {
           if(fs.existsSync(coverFile)){
            let savePath = await this.libraryData.getItemThumbPath(fileData);
            if(options.importType == 'copy'){
              fs.copyFileSync(coverFile, savePath);
            }else
            if(options.importType == 'move'){
              fs.renameSync(coverFile, savePath);
            }
            // 如果是 'link' 模式，不复制缩略图文件
          }
        } catch(err){
          console.error(err);
        }
       
        if (typeof fileData === 'number') {
          fileMap.set(file.id, fileData);
        }
        processed++;
        this.showProgress(processed, totalItems, 'files');
      }

      console.log(`\nData conversion completed (${processed}/${totalItems} items processed)`);
    } catch (error) {
      console.error('Error during data conversion:', error);
      throw error;
    }
  }

  private generateFilePath(title: string, link: string, folderMap: Map<number, number>): string | null {
    if (!link) return null;
    // 如果link不为空，直接使用link作为path
    return link;
  }

  private getFolderIdsForFile(
    fileId: number, 
    foldersMeta: FolderMeta[],
    folderMap: Map<number, number>
  ): number | null {
    const meta = foldersMeta.find(m => m.fid === fileId);
    if (!meta?.ids) return null;
    
    const ids = meta.ids.split('|')
      .filter(id => id !== '')
      .map(id => folderMap.get(parseInt(id)))
      .filter(id => id !== undefined) as number[];
      
    return ids.length > 0 ? ids[0] : null;
  }

  private getTagIdsForFile(
    fileId: number,
    tagsMeta: TagMeta[],
    tagMap: Map<number, number>
  ): string[] | null {
    const meta = tagsMeta.find(m => m.fid === fileId);
    if (!meta?.ids) return null;
    
    return meta.ids.split('|')
      .filter(id => id !== '')
      .map(id => tagMap.get(parseInt(id)))
      .filter(id => id !== undefined)
      .map(id => id!.toString());
  }

  // 从SQLite源数据库读取数据的函数
  public async readFromSourceDb(sourcePath: string, targetFolders?: string, targetTags?: string): Promise<{
    files: SourceFile[];
    folders: SourceFolder[];
    tags: SourceTag[];
    urlMeta: UrlMeta[];
    descMeta: DescMeta[];
    foldersMeta: FolderMeta[];
    tagsMeta: TagMeta[];
  }> {
    const db = new Database(sourcePath);
    
    let files: SourceFile[];
    let folders: SourceFolder[];
    let tags: SourceTag[];
    let urlMeta: UrlMeta[];
    let descMeta: DescMeta[];
    let foldersMeta: FolderMeta[];
    let tagsMeta: TagMeta[];

    if (targetFolders) {
      // 如果指定了目标文件夹，只导入这些文件夹及其文件
      const folderIds = targetFolders.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      // 获取所有子文件夹ID（递归）
      const allFolderIds = await this.getAllSubFolderIds(db, folderIds);
      const folderIdList = allFolderIds.join(',');
      
      // 构建 LIKE 查询条件来匹配文件夹ID
      const folderLikeConditions = allFolderIds.map(id => 
        `(fm.ids = '${id}' OR fm.ids LIKE '${id}|%' OR fm.ids LIKE '%|${id}|%' OR fm.ids LIKE '%|${id}')`
      ).join(' OR ');
      
      [files, folders, urlMeta, descMeta, foldersMeta] = await Promise.all([
        this.queryAll<SourceFile>(db, `SELECT f.* FROM files f 
          INNER JOIN folders_meta fm ON f.id = fm.fid 
          WHERE ${folderLikeConditions}`),
        this.queryAll<SourceFolder>(db, `SELECT * FROM folders WHERE id IN (${folderIdList})`),
        this.queryAll<UrlMeta>(db, `SELECT um.* FROM url_meta um 
          INNER JOIN folders_meta fm ON um.fid = fm.fid 
          WHERE ${folderLikeConditions}`),
        this.queryAll<DescMeta>(db, `SELECT dm.* FROM desc_meta dm 
          INNER JOIN folders_meta fm ON dm.fid = fm.fid 
          WHERE ${folderLikeConditions}`),
        this.queryAll<FolderMeta>(db, `SELECT * FROM folders_meta WHERE ${folderLikeConditions.replace(/fm\./g, '')}`)
      ]);
      
      // 导入文件关联的所有标签
      const fileIds = files.map(f => f.id);
      if (fileIds.length > 0) {
        const fileIdList = fileIds.join(',');
        // 首先获取文件关联的所有标签ID
        const fileTagIds = await this.queryAll<{tag_id: number}>(db, `
          SELECT DISTINCT CAST(SUBSTR(tm.ids, 1, CASE WHEN INSTR(tm.ids, '|') > 0 THEN INSTR(tm.ids, '|') - 1 ELSE LENGTH(tm.ids) END) AS INTEGER) as tag_id
          FROM tags_meta tm WHERE tm.fid IN (${fileIdList}) AND tm.ids != ''
          UNION
          SELECT DISTINCT CAST(SUBSTR(SUBSTR(tm.ids, INSTR(tm.ids, '|') + 1), 1, 
            CASE WHEN INSTR(SUBSTR(tm.ids, INSTR(tm.ids, '|') + 1), '|') > 0 
            THEN INSTR(SUBSTR(tm.ids, INSTR(tm.ids, '|') + 1), '|') - 1 
            ELSE LENGTH(SUBSTR(tm.ids, INSTR(tm.ids, '|') + 1)) END) AS INTEGER) as tag_id
          FROM tags_meta tm WHERE tm.fid IN (${fileIdList}) AND tm.ids LIKE '%|%|%'
        `);
        
        const allFileTagIds = fileTagIds.map(row => row.tag_id).filter(id => !isNaN(id) && id > 0);
        
        if (allFileTagIds.length > 0) {
          // 确保标签的完整层级结构
          const completeTagIds = await this.ensureCompleteTagHierarchy(db, allFileTagIds);
          const completeTagIdList = completeTagIds.join(',');
          
          [tags, tagsMeta] = await Promise.all([
            this.queryAll<SourceTag>(db, `SELECT * FROM tags WHERE id IN (${completeTagIdList})`),
            this.queryAll<TagMeta>(db, `SELECT * FROM tags_meta WHERE fid IN (${fileIdList})`)
          ]);
        } else {
          tags = [];
          tagsMeta = [];
        }
      } else {
        tags = [];
        tagsMeta = [];
      }
    } else if (targetTags) {
      // 如果指定了目标标签，只导入这些标签及其文件
      const tagIds = targetTags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      // 获取完整的标签层级结构（包括所有子标签和父标签）
      const allTagIds = await this.ensureCompleteTagHierarchy(db, tagIds);
      const tagIdList = allTagIds.join(',');
      
      // 构建 LIKE 查询条件来匹配标签ID
      const tagLikeConditions = allTagIds.map(id => 
        `(tm.ids = '${id}' OR tm.ids LIKE '${id}|%' OR tm.ids LIKE '%|${id}|%' OR tm.ids LIKE '%|${id}')`
      ).join(' OR ');
      
      [files, tags, urlMeta, descMeta, tagsMeta] = await Promise.all([
        this.queryAll<SourceFile>(db, `SELECT f.* FROM files f 
          INNER JOIN tags_meta tm ON f.id = tm.fid 
          WHERE ${tagLikeConditions}`),
        this.queryAll<SourceTag>(db, `SELECT * FROM tags WHERE id IN (${tagIdList})`),
        this.queryAll<UrlMeta>(db, `SELECT um.* FROM url_meta um 
          INNER JOIN tags_meta tm ON um.fid = tm.fid 
          WHERE ${tagLikeConditions}`),
        this.queryAll<DescMeta>(db, `SELECT dm.* FROM desc_meta dm 
          INNER JOIN tags_meta tm ON dm.fid = tm.fid 
          WHERE ${tagLikeConditions}`),
        this.queryAll<TagMeta>(db, `SELECT * FROM tags_meta WHERE ${tagLikeConditions.replace(/tm\./g, '')}`)
      ]);
      
      // 不导入文件夹
      folders = [];
      foldersMeta = [];
    } else {
      // 默认导入所有数据
      [files, folders, tags, urlMeta, descMeta, foldersMeta, tagsMeta] = await Promise.all([
        this.queryAll<SourceFile>(db, 'SELECT * FROM files'),
        this.queryAll<SourceFolder>(db, 'SELECT * FROM folders'),
        this.queryAll<SourceTag>(db, 'SELECT * FROM tags'),
        this.queryAll<UrlMeta>(db, 'SELECT * FROM url_meta'),
        this.queryAll<DescMeta>(db, 'SELECT * FROM desc_meta'),
        this.queryAll<FolderMeta>(db, 'SELECT * FROM folders_meta'),
        this.queryAll<TagMeta>(db, 'SELECT * FROM tags_meta')
      ]);
    }

    db.close();
    return { files, folders, tags, urlMeta, descMeta, foldersMeta, tagsMeta };
  }

  private showProgress(current: number, total: number, type: string) {
    const percent = Math.floor((current / total) * 100);
    process.stdout.write(
      `\rProcessing ${type}: ${current}/${total} (${percent}%)` + 
      (percent === 100 ? '\n' : '')
    );
  }

  private queryAll<T>(db: Database, sql: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  // 递归获取所有子文件夹ID
  private async getAllSubFolderIds(db: Database, parentIds: number[]): Promise<number[]> {
    const allIds = new Set<number>(parentIds);
    const processQueue = [...parentIds];
    
    while (processQueue.length > 0) {
      const currentId = processQueue.shift()!;
      const children = await this.queryAll<{id: number}>(db, 
        `SELECT id FROM folders WHERE parent = ${currentId}`
      );
      
      for (const child of children) {
        if (!allIds.has(child.id)) {
          allIds.add(child.id);
          processQueue.push(child.id);
        }
      }
    }
    
    return Array.from(allIds);
  }

  // 递归获取所有子标签ID
  private async getAllSubTagIds(db: Database, parentIds: number[]): Promise<number[]> {
    const allIds = new Set<number>(parentIds);
    const processQueue = [...parentIds];
    
    while (processQueue.length > 0) {
      const currentId = processQueue.shift()!;
      const children = await this.queryAll<{id: number}>(db, 
        `SELECT id FROM tags WHERE parent = ${currentId}`
      );
      
      for (const child of children) {
        if (!allIds.has(child.id)) {
          allIds.add(child.id);
          processQueue.push(child.id);
        }
      }
    }
    
    return Array.from(allIds);
  }

  // 获取标签的所有父标签ID（递归向上查找）
  private async getAllParentTagIds(db: Database, tagIds: number[]): Promise<number[]> {
    const allIds = new Set<number>(tagIds);
    const processQueue = [...tagIds];
    
    while (processQueue.length > 0) {
      const currentId = processQueue.shift()!;
      const parents = await this.queryAll<{parent: number}>(db, 
        `SELECT parent FROM tags WHERE id = ${currentId} AND parent IS NOT NULL AND parent != 0`
      );
      
      for (const parent of parents) {
        if (!allIds.has(parent.parent)) {
          allIds.add(parent.parent);
          processQueue.push(parent.parent);
        }
      }
    }
    
    return Array.from(allIds);
  }

  // 确保标签的完整层级结构
  private async ensureCompleteTagHierarchy(db: Database, tagIds: number[]): Promise<number[]> {
    // 获取所有子标签
    const allSubTagIds = await this.getAllSubTagIds(db, tagIds);
    // 获取所有父标签
    const allParentTagIds = await this.getAllParentTagIds(db, allSubTagIds);
    
    // 合并所有标签ID并去重
    const completeTagIds = new Set([...allSubTagIds, ...allParentTagIds]);
    return Array.from(completeTagIds);
  }
}

// 使用示例
async function main() {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  let sourceDbPath = '';
  let targetDir = '';
  let targetFolders = '';
  let targetTags = '';
  let importType = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.split('=');
      switch (key) {
        case '--sourceDbPath':
          sourceDbPath = value || args[++i];
          break;
        case '--targetDir':
          targetDir = value || args[++i];
          break;
        case '--targetFolders':
          targetFolders = value || args[++i];
          break;
        case '--targetTags':
          targetTags = value || args[++i];
          break;
        case '--importType':
          importType = value || args[++i];
          break;
        default:
          console.error(`Unknown argument: ${key}`);
          process.exit(1);
      }
    } else if (!sourceDbPath) {
      sourceDbPath = arg;
    } else if (!targetDir) {
      targetDir = arg;
    }
  }

  if (!sourceDbPath || !targetDir) {
    console.error('Usage: ts-node convertLibraryData.ts --sourceDbPath=<sourceDbFile> --targetDir=<targetDir> [options]');
    console.error('Options:');
    console.error('  --targetFolders=<comma-separated folder IDs>  Import only specified folders and their files');
    console.error('  --targetTags=<comma-separated tag IDs>        Import only files with specified tags (mutually exclusive with targetFolders)');
    console.error('  --importType=<copy|move|link>                 How to import files (copy, move, or link only)');
    console.error('');
    console.error('Legacy usage: ts-node convertLibraryData.ts <sourceDbFile> <targetDir>');
    process.exit(1);
  }

  if (targetFolders && targetTags) {
    console.error('Error: --targetFolders and --targetTags are mutually exclusive');
    process.exit(1);
  }

  if (importType && !['copy', 'move', 'link'].includes(importType)) {
    console.error('Error: --importType must be one of: copy, move, link');
    process.exit(1);
  }

  if (!fs.existsSync(sourceDbPath)) {
    console.error(`Source database not found: ${sourceDbPath}`);
    process.exit(1);
  }

  // 确保目标目录存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const libraryData = new LibraryServerDataSQLite({
    id: 'library-1',
    customFields: {
      path: targetDir,
    }
  }, {});
  await libraryData.initialize();
  const converter = new LibraryDataConverter(libraryData);
  
  try {
    console.log('Reading data from source database...');
    if (targetFolders) {
      console.log(`Filtering by folder IDs: ${targetFolders}`);
    } else if (targetTags) {
      console.log(`Filtering by tag IDs: ${targetTags}`);
    }
    if (importType) {
      console.log(`Import type: ${importType}`);
    }
    
    const sourceData = await converter.readFromSourceDb(sourceDbPath, targetFolders, targetTags);
    
    console.log(`Found ${sourceData.files.length} files, ${sourceData.folders.length} folders, ${sourceData.tags.length} tags`);
    console.log('Converting and inserting data...');
    await converter.convertAndInsertData(sourceData, { 
      maxItems: undefined, 
      sourceDbPath: sourceDbPath, 
      targetDir: targetDir, 
      importType: importType || 'copy'
    });
    console.log(`Data conversion completed successfully. Database saved to: ${targetDir}`);
  } catch (error) {
    console.error('Data conversion failed:', error);
    process.exit(1);
  } finally {
    await libraryData.close();
  }
}

// 如果是直接执行此文件而不是被导入
if (require.main === module) {
  main().catch(console.error);
}
