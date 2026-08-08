import { HttpClient } from '../client/HttpClient';
import {
    UploadFileRequest,
    UploadResponse,
    BaseResponse,
} from '../types';

/**
 * 文件查询过滤参数
 */
export interface FileFilters {
    title?: string;
    extension?: string;
    tags?: string[];
    folder_id?: number;
    size_min?: number;
    size_max?: number;
    created_after?: string;
    created_before?: string;
    limit?: number;
    offset?: number;
}

/**
 * 获取文件列表请求
 */
export interface GetFilesRequest {
    libraryId: string;
    filters?: FileFilters;
    isUrlFile?: boolean;
    clientId?: string;
}

/**
 * 文件数据类型
 */
export interface FileData {
    id: number;
    title: string;
    path: string;
    size: number;
    extension: string;
    mime_type: string;
    tags: string[];
    folder_id: number | null;
    hash?: string;
    thumbnail_path?: string;
    created_at: string;
    updated_at: string;
    imported_at: number;
}

/**
 * 文件列表响应
 */
export interface FilesListResponse extends BaseResponse<FileData[]> { }

/**
 * 文件模块
 * 处理文件上传、下载、删除等操作
 */
export class FileModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 上传文件到指定素材库
     * @param uploadRequest 上传请求数据
     * @returns Promise<UploadResponse>
     */
    async upload(uploadRequest: UploadFileRequest): Promise<UploadResponse> {
        const formData = new FormData();

        // 添加文件
        if (uploadRequest.files instanceof FileList) {
            Array.from(uploadRequest.files).forEach((file, index) => {
                formData.append('files', file);
            });
        } else {
            uploadRequest.files.forEach((file, index) => {
                formData.append('files', file);
            });
        }

        // 添加其他字段
        formData.append('libraryId', uploadRequest.libraryId);

        if (uploadRequest.sourcePath) {
            formData.append('sourcePath', uploadRequest.sourcePath);
        }

        if (uploadRequest.clientId) {
            formData.append('clientId', uploadRequest.clientId);
        }

        if (uploadRequest.fields) {
            formData.append('fields', JSON.stringify(uploadRequest.fields));
        }

        if (uploadRequest.payload) {
            formData.append('payload', JSON.stringify(uploadRequest.payload));
        }

        return await this.httpClient.upload<UploadResponse>('/api/files/upload', formData);
    }

    /**
     * 下载文件
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @returns Promise<Blob>
     */
    async download(libraryId: string, fileId: string): Promise<Blob> {
        return await this.httpClient.download(`/api/files/download/${libraryId}/${fileId}`);
    }

    /**
     * 覆盖写入文件内容（保留文件 ID、目录和元数据）。
     */
    async writeFile(
        libraryId: string,
        fileId: string | number,
        content: Blob | string | ArrayBuffer,
        options: { name?: string; contentType?: string } = {}
    ): Promise<UploadResponse> {
        const blob = content instanceof Blob
            ? content
            : new Blob([content], { type: options.contentType || 'application/octet-stream' });
        const file = new File([blob], options.name || 'file', {
            type: options.contentType || blob.type || 'application/octet-stream'
        });
        const formData = new FormData();
        formData.append('files', file);
        formData.append('libraryId', libraryId);
        formData.append('fileId', String(fileId));
        formData.append('name', options.name || file.name);
        return await this.httpClient.upload<UploadResponse>('/api/files/upload', formData);
    }

    /**
     * 删除文件
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @param options.moveToRecycleBin 是否移动到回收站（默认 true）
     * @returns Promise<BaseResponse>
     */
    async delete(libraryId: string, fileId: string, options?: { moveToRecycleBin?: boolean }): Promise<BaseResponse> {
        const params = new URLSearchParams();
        if (options?.moveToRecycleBin !== undefined) {
            params.set('moveToRecycleBin', String(options.moveToRecycleBin));
        }
        const query = params.toString() ? `?${params.toString()}` : '';
        return await this.httpClient.delete<BaseResponse>(`/api/files/${libraryId}/${fileId}${query}`);
    }

    /**
     * 上传单个文件
     * @param file 文件对象
     * @param libraryId 素材库ID
     * @param options 可选参数
     * @returns Promise<UploadResponse>
     */
    async uploadFile(
        file: File,
        libraryId: string,
        options?: {
            sourcePath?: string;
            clientId?: string;
            tags?: string[];
            folderId?: string;
        }
    ): Promise<UploadResponse> {
        const uploadRequest: UploadFileRequest = {
            files: [file],
            libraryId,
            sourcePath: options?.sourcePath,
            clientId: options?.clientId,
        };

        if (options?.tags || options?.folderId) {
            uploadRequest.payload = {
                data: {
                    tags: options.tags,
                    folder_id: options.folderId,
                },
            };
        }

        return await this.upload(uploadRequest);
    }

    /**
     * 上传多个文件
     * @param files 文件数组或FileList
     * @param libraryId 素材库ID
     * @param options 可选参数
     * @returns Promise<UploadResponse>
     */
    async uploadFiles(
        files: File[] | FileList,
        libraryId: string,
        options?: {
            sourcePath?: string;
            clientId?: string;
            tags?: string[];
            folderId?: string;
        }
    ): Promise<UploadResponse> {
        const uploadRequest: UploadFileRequest = {
            files,
            libraryId,
            sourcePath: options?.sourcePath,
            clientId: options?.clientId,
        };

        if (options?.tags || options?.folderId) {
            uploadRequest.payload = {
                data: {
                    tags: options.tags,
                    folder_id: options.folderId,
                },
            };
        }

        return await this.upload(uploadRequest);
    }

    /**
     * 上传文件到指定文件夹
     * @param file 文件对象
     * @param libraryId 素材库ID
     * @param folderId 文件夹ID
     * @param tags 标签数组
     * @returns Promise<UploadResponse>
     */
    async uploadToFolder(
        file: File,
        libraryId: string,
        folderId: string,
        tags?: string[]
    ): Promise<UploadResponse> {
        return await this.uploadFile(file, libraryId, { folderId, tags });
    }

    /**
     * 上传文件并添加标签
     * @param file 文件对象
     * @param libraryId 素材库ID
     * @param tags 标签数组
     * @returns Promise<UploadResponse>
     */
    async uploadWithTags(
        file: File,
        libraryId: string,
        tags: string[]
    ): Promise<UploadResponse> {
        return await this.uploadFile(file, libraryId, { tags });
    }

    /**
     * 下载文件并保存为指定文件名
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @param filename 保存的文件名
     * @returns Promise<void>
     */
    async downloadAndSave(
        libraryId: string,
        fileId: string,
        filename: string
    ): Promise<void> {
        const blob = await this.download(libraryId, fileId);

        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // 清理
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * 批量删除文件
     * @param libraryId 素材库ID
     * @param fileIds 文件ID数组
     * @returns Promise<BaseResponse[]>
     */
    async deleteMultiple(libraryId: string, fileIds: string[]): Promise<BaseResponse[]> {
        return await Promise.all(fileIds.map(fileId => this.delete(libraryId, fileId)));
    }

    /**
     * 清空回收站
     * @param libraryId 素材库ID
     * @returns Promise<{ success: boolean; deletedCount: number; errors?: string[] }>
     */
    async emptyTrash(libraryId: string): Promise<{ success: boolean; deletedCount: number; errors?: string[] }> {
        return await this.httpClient.delete(`/api/files/${libraryId}/trash`);
    }

    /**
     * 恢复文件（从回收站还原）
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @returns Promise<BaseResponse>
     */
    async restoreFile(libraryId: string, fileId: string | number): Promise<BaseResponse> {
        return await this.httpClient.post<BaseResponse>('/api/files/recover', {
            libraryId,
            fileId: fileId.toString(),
        });
    }

    /**
     * 获取文件列表（支持过滤）
     * @param request 获取文件请求
     * @returns Promise<FileData[]>
     */
    async getFiles(request: GetFilesRequest): Promise<FileData[]> {
        return await this.httpClient.post<FileData[]>('/api/files/getFiles', request);
    }

    /**
     * 获取单个文件信息
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @returns Promise<FileData>
     */
    async getFile(libraryId: string, fileId: string | number, clientId?: string): Promise<FileData> {
        return await this.httpClient.post<FileData>('/api/files/getFile', {
            libraryId,
            fileId: fileId.toString(),
            clientId
        });
    }

    /**
     * 便捷方法：获取所有文件
     * @param libraryId 素材库ID
     * @param isUrlFile 是否为URL文件
     * @returns Promise<FilesListResponse>
     */
    async getAllFiles(libraryId: string, isUrlFile?: boolean): Promise<FileData[]> {
        return await this.getFiles({ libraryId, isUrlFile });
    }

    /**
     * 便捷方法：按标签筛选文件
     * @param libraryId 素材库ID
     * @param tags 标签数组
     * @returns Promise<FilesListResponse>
     */
    async getFilesByTags(libraryId: string, tags: string[]): Promise<FileData[]> {
        return await this.getFiles({ libraryId, filters: { tags } });
    }

    /**
     * 便捷方法：按文件夹筛选文件
     * @param libraryId 素材库ID
     * @param folderId 文件夹ID
     * @returns Promise<FilesListResponse>
     */
    async getFilesByFolder(libraryId: string, folderId: number): Promise<FileData[]> {
        return await this.getFiles({ libraryId, filters: { folder_id: folderId } });
    }

    /**
     * 便捷方法：按文件标题搜索文件
     * @param libraryId 素材库ID
     * @param title 文件标题（支持模糊搜索）
     * @returns Promise<FilesListResponse>
     */
    async searchFilesByTitle(libraryId: string, title: string): Promise<FileData[]> {
        return await this.getFiles({ libraryId, filters: { title } });
    }

    /**
     * 便捷方法：按扩展名筛选文件
     * @param libraryId 素材库ID
     * @param extension 文件扩展名
     * @returns Promise<FilesListResponse>
     */
    async getFilesByExtension(libraryId: string, extension: string): Promise<FileData[]> {
        return await this.getFiles({ libraryId, filters: { extension } });
    }

    /**
     * 便捷方法：按大小范围筛选文件
     * @param libraryId 素材库ID
     * @param minSize 最小大小（字节）
     * @param maxSize 最大大小（字节）
     * @returns Promise<FilesListResponse>
     */
    async getFilesBySize(
        libraryId: string,
        minSize?: number,
        maxSize?: number
    ): Promise<FileData[]> {
        return await this.getFiles({
            libraryId,
            filters: { size_min: minSize, size_max: maxSize }
        });
    }

    /**
     * 便捷方法：按创建时间范围筛选文件
     * @param libraryId 素材库ID
     * @param afterDate 开始日期（ISO字符串）
     * @param beforeDate 结束日期（ISO字符串）
     * @returns Promise<FilesListResponse>
     */
    async getFilesByDateRange(
        libraryId: string,
        afterDate?: string,
        beforeDate?: string
    ): Promise<FileData[]> {
        return await this.getFiles({
            libraryId,
            filters: { created_after: afterDate, created_before: beforeDate }
        });
    }

    /**
     * 便捷方法：分页获取文件
     * @param libraryId 素材库ID
     * @param page 页码（从1开始）
     * @param pageSize 每页大小
     * @param filters 其他过滤条件
     * @returns Promise<FilesListResponse>
     */
    async getFilesPaginated(
        libraryId: string,
        page: number = 1,
        pageSize: number = 20,
        filters?: Omit<FileFilters, 'limit' | 'offset'>
    ): Promise<FileData[]> {
        const offset = (page - 1) * pageSize;
        return await this.getFiles({
            libraryId,
            filters: {
                ...filters,
                limit: pageSize,
                offset
            }
        });
    }

    /**
     * 重命名文件（同名时自动追加序号后缀）
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @param name 新文件名
     * @returns Promise<FileData>
     */
    async renameFile(libraryId: string, fileId: string | number, name: string): Promise<FileData> {
        return await this.httpClient.post<FileData>('/api/files/rename', {
            libraryId,
            fileId: fileId.toString(),
            name,
        });
    }

    /**
     * 更新文件元数据（website 等）
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @param data 更新数据
     * @returns Promise<FileData>
     */
    async updateFile(libraryId: string, fileId: string | number, data: Record<string, any>): Promise<FileData> {
        return await this.httpClient.post<FileData>('/api/files/update', {
            libraryId,
            fileId: fileId.toString(),
            data,
        });
    }
}
