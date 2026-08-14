import { HttpClient } from '../client/HttpClient';
import { DownloadProgress } from '../types';

/**
 * 批量下载模块
 * 查询 URL 批量导入任务的进度
 */
export class DownloadModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 查询批量下载进度
     * @param batchId 批次 ID（download/start 返回）
     */
    async getProgress(batchId: string): Promise<DownloadProgress> {
        return await this.httpClient.get<DownloadProgress>(`/api/download/progress/${encodeURIComponent(batchId)}`);
    }
}
