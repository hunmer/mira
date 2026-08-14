import { HttpClient } from '../client/HttpClient';

/**
 * 缩略图模块
 * 缩略图生成任务与元数据扫描任务的控制和进度查询
 */
export class ThumbnailModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 开始扫描生成缩略图
     */
    async scan(libraryId: string): Promise<any> {
        return await this.httpClient.get('/api/thumb/scan', { params: { libraryId } });
    }

    /**
     * 查询缩略图生成进度
     */
    async progress(libraryId: string): Promise<any> {
        return await this.httpClient.get('/api/thumb/progress', { params: { libraryId } });
    }

    /**
     * 取消缩略图生成任务
     */
    async cancel(): Promise<any> {
        return await this.httpClient.get('/api/thumb/cancel');
    }

    /**
     * 缩略图统计信息
     */
    async stats(libraryId: string): Promise<any> {
        return await this.httpClient.get('/api/thumb/stats', { params: { libraryId } });
    }

    /**
     * 可用的缩略图生成器列表
     */
    async generators(): Promise<any> {
        return await this.httpClient.get('/api/thumb/generators');
    }

    /**
     * 同步缺失缩略图
     */
    async sync(libraryId: string): Promise<any> {
        return await this.httpClient.get('/api/thumb/sync', { params: { libraryId } });
    }

    /**
     * 元数据扫描统计
     */
    async metadataStats(libraryId: string): Promise<any> {
        return await this.httpClient.get('/api/thumb/metadata/stats', { params: { libraryId } });
    }

    /**
     * 开始元数据扫描
     */
    async metadataScan(libraryId: string): Promise<any> {
        return await this.httpClient.get('/api/thumb/metadata/scan', { params: { libraryId } });
    }

    /**
     * 查询元数据扫描进度
     */
    async metadataProgress(libraryId: string): Promise<any> {
        return await this.httpClient.get('/api/thumb/metadata/progress', { params: { libraryId } });
    }
}
