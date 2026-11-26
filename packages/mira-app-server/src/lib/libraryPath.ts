import * as path from 'path';

/**
 * 素材库目录 = 路径 + 名称：选中的路径作为父目录，素材库位于其下的名称子目录。
 * 创建与路径迁移共用此口径。
 */
export function resolveLibraryPath(libraryPath: string, libraryName: string): string {
    return path.join(path.normalize(libraryPath), libraryName);
}
