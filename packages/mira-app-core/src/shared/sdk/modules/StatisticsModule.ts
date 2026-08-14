import { HttpClient } from '../client/HttpClient';

/**
 * 统计模块
 * 素材库上传量与文件类型统计
 */
export class StatisticsModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 上传统计
     */
    async upload(libraryId: string, days?: number): Promise<any> {
        return await this.httpClient.get(`/api/statistics/${encodeURIComponent(libraryId)}/upload`, {
            params: days ? { days } : undefined,
        });
    }

    /**
     * 按日上传统计
     */
    async uploadDaily(libraryId: string, days?: number): Promise<any> {
        return await this.httpClient.get(`/api/statistics/${encodeURIComponent(libraryId)}/upload/daily`, {
            params: days ? { days } : undefined,
        });
    }

    /**
     * 文件类型统计
     */
    async fileTypes(libraryId: string, days?: number): Promise<any> {
        return await this.httpClient.get(`/api/statistics/${encodeURIComponent(libraryId)}/file-types`, {
            params: days ? { days } : undefined,
        });
    }

    /**
     * 最近上传的文件
     */
    async recentUploads(libraryId: string, days = 7): Promise<any> {
        return await this.httpClient.get(`/api/statistics/${encodeURIComponent(libraryId)}/recent-uploads`, {
            params: { days },
        });
    }
}
