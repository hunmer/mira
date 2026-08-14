import { HttpClient } from '../client/HttpClient';
import { FsDirNode } from '../types';

/**
 * 服务器文件系统模块
 * 浏览服务器磁盘目录、库目录内文件管理、库与磁盘一致性检查
 */
export class FileSystemModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 在服务器磁盘上创建目录
     */
    async mkdir(parentPath: string, name: string): Promise<{ label: string; value: string; isLeaf: boolean }> {
        return await this.httpClient.post('/api/fs/mkdir', { path: parentPath, name });
    }

    /**
     * 列出服务器目录树（仅目录，供路径选择组件使用）
     * @param dirPath 父目录；不传时返回根（Windows 为盘符列表）
     */
    async getDirs(dirPath?: string): Promise<FsDirNode[]> {
        return await this.httpClient.get<FsDirNode[]>('/api/fs/dirs', {
            params: dirPath ? { path: dirPath } : undefined,
        });
    }

    /**
     * 列出素材库目录内的文件
     */
    async list(params: { libraryId: string; path?: string; offset?: number; limit?: number }): Promise<any> {
        return await this.httpClient.get('/api/fs/list', { params });
    }

    /**
     * 在库目录内移动文件
     */
    async move(data: { libraryId: string; source: string; destination: string }): Promise<any> {
        return await this.httpClient.post('/api/fs/move', data);
    }

    /**
     * 在库目录内删除文件（磁盘级）
     */
    async remove(data: { libraryId: string; paths: string[] }): Promise<any> {
        return await this.httpClient.post('/api/fs/remove', data);
    }

    /**
     * 同步库目录与数据库
     */
    async sync(libraryId: string): Promise<any> {
        return await this.httpClient.post('/api/fs/sync', { libraryId });
    }

    /**
     * 扫描库中缺失文件的数据库记录
     */
    async scanMissing(libraryId: string): Promise<any> {
        return await this.httpClient.get('/api/fs/database/missing', { params: { libraryId } });
    }

    /**
     * 清除缺失文件的数据库记录
     */
    async clearMissing(libraryId: string): Promise<any> {
        return await this.httpClient.delete('/api/fs/database/missing', { data: { libraryId } });
    }

    /**
     * 扫描库目录中的新文件（未入库）
     */
    async findNewFiles(libraryId: string): Promise<any> {
        return await this.httpClient.post('/api/fs/database/new', { libraryId });
    }

    /**
     * 将新文件导入数据库
     */
    async importNewFiles(libraryId: string, paths: string[]): Promise<any> {
        return await this.httpClient.post('/api/fs/database/new/import', { libraryId, paths });
    }

    /**
     * 删除新文件扫描记录
     */
    async deleteNewFiles(libraryId: string, paths: string[]): Promise<any> {
        return await this.httpClient.delete('/api/fs/database/new', { data: { libraryId, paths } });
    }

    /**
     * 扫描数据库中的重复文件记录
     */
    async scanDuplicates(libraryId: string): Promise<any> {
        return await this.httpClient.post('/api/fs/database/duplicates', { libraryId });
    }

    /**
     * 删除重复文件记录
     */
    async removeDuplicateRecords(libraryId: string, fileIds: number[]): Promise<any> {
        return await this.httpClient.delete('/api/fs/database/duplicates', { data: { libraryId, fileIds } });
    }

    /**
     * 打包下载库内文件（返回 zip Blob）
     */
    async download(data: { libraryId: string; paths: string[] }): Promise<Blob> {
        return await this.httpClient.post('/api/fs/download', data, { responseType: 'blob' });
    }
}
