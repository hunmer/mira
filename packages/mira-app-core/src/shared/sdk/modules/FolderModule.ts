import { HttpClient } from '../client/HttpClient';
import { BaseResponse } from '../types';

/**
 * 文件夹数据类型
 */
export interface Folder {
    id: number;
    title: string;
    parent_id?: number | undefined;
    path?: string;
    color?: number;
    icon?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    /** 文件夹下非回收站的文件数（后端 getAllFolders 返回） */
    file_count?: number;
}

/**
 * 文件夹查询参数
 */
export interface FolderQuery {
    title?: string;
    parent_id?: number;
    color?: number;
    limit?: number;
    offset?: number;
}

/**
 * 创建文件夹请求
 */
export interface CreateFolderRequest {
    libraryId: string;
    title: string;
    parent_id?: number;
    color?: number;
    icon?: string;
    description?: string;
}

/**
 * 更新文件夹请求
 */
export interface UpdateFolderRequest {
    libraryId: string;
    id: number;
    title?: string;
    parent_id?: number;
    color?: number;
    icon?: string;
    description?: string;
}

/**
 * 删除文件夹请求
 */
export interface DeleteFolderRequest {
    libraryId: string;
    id: number;
    deleteFiles?: boolean;
}

/**
 * 文件夹查询请求
 */
export interface QueryFolderRequest {
    libraryId: string;
    query?: FolderQuery;
}

/**
 * 文件文件夹设置请求
 */
export interface SetFileFolderRequest {
    libraryId: string;
    fileId: number;
    folder: number | null;
}

/**
 * 获取文件文件夹请求
 */
export interface GetFileFolderRequest {
    libraryId: string;
    fileId: number;
}

/**
 * 文件夹响应
 */
export interface FolderResponse extends BaseResponse<Folder> { }

/**
 * 文件夹列表响应
 */
export interface FolderListResponse extends BaseResponse<Folder[]> { }

/**
 * 文件文件夹响应
 */
export interface FileFolderResponse extends BaseResponse<{ folder: number | null }> { }

/**
 * 文件文件夹设置响应
 */
export interface SetFileFolderResponse extends BaseResponse<{
    fileId: number;
    folder: number | null;
    result: boolean;
}> { }

/**
 * 文件夹模块
 * 处理文件夹的CRUD操作和文件文件夹关联
 */
export class FolderModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取所有文件夹
     * @param libraryId 素材库ID
     * @returns Promise<Folder[]>
     */
    async getAll(libraryId: string): Promise<Folder[]> {
        return await this.httpClient.get<Folder[]>(`/api/folders/all?libraryId=${libraryId}`);
    }

    /**
     * 查询文件夹
     * @param request 查询请求
     * @returns Promise<Folder[]>
     */
    async query(request: QueryFolderRequest): Promise<Folder[]> {
        return await this.httpClient.post<Folder[]>('/api/folders/query', request);
    }

    /**
     * 创建文件夹
     * @param request 创建请求
     * @returns Promise<Folder>
     */
    async create(request: CreateFolderRequest): Promise<Folder> {
        return await this.httpClient.post<Folder>('/api/folders/create', request);
    }

    /**
     * 更新文件夹
     * @param request 更新请求
     * @returns Promise<Folder>
     */
    async update(request: UpdateFolderRequest): Promise<Folder> {
        return await this.httpClient.put<Folder>('/api/folders/update', request);
    }

    /**
     * 删除文件夹
     * @param request 删除请求
     * @returns Promise<BaseResponse>
     */
    async delete(request: DeleteFolderRequest): Promise<BaseResponse> {
        // 由于服务器使用DELETE方法并通过body传递数据，我们需要使用axios实例直接调用
        const response = await this.httpClient.getAxiosInstance().delete<BaseResponse>('/api/folders/delete', {
            data: request
        });
        return response.data;
    }

    /**
     * 为文件设置文件夹
     * @param request 设置请求
     * @returns Promise<SetFileFolderResponse>
     */
    async setFileFolder(request: SetFileFolderRequest): Promise<SetFileFolderResponse> {
        return await this.httpClient.post<SetFileFolderResponse>('/api/folders/file/set', request);
    }

    /**
     * 获取文件的文件夹
     * @param request 获取请求
     * @returns Promise<FileFolderResponse>
     */
    async getFileFolder(request: GetFileFolderRequest): Promise<FileFolderResponse> {
        return await this.httpClient.get<FileFolderResponse>(`/api/folders/file/${request.fileId}?libraryId=${request.libraryId}`);
    }

    /**
     * 便捷方法：创建文件夹
     * @param libraryId 素材库ID
     * @param title 文件夹标题
     * @param parentId 父文件夹ID（可选）
     * @param color 文件夹颜色（可选，数字类型）
     * @param description 文件夹描述（可选）
     * @param icon 文夹夹图标（可选，Material Icons 图标名）
     * @returns Promise<Folder>
     */
    async createFolder(
        libraryId: string,
        title: string,
        parentId?: number,
        color?: number,
        description?: string,
        icon?: string
    ): Promise<Folder> {
        return await this.create({ libraryId, title, parent_id: parentId, color, icon, description });
    }

    /**
     * 便捷方法：更新文件夹
     * @param libraryId 素材库ID
     * @param id 文件夹ID
     * @param updates 更新数据
     * @returns Promise<Folder>
     */
    async updateFolder(
        libraryId: string,
        id: number,
        updates: { title?: string; parent_id?: number; color?: number; icon?: string; description?: string }
    ): Promise<Folder> {
        return await this.update({ libraryId, id, ...updates });
    }

    /**
     * 批量更新文件夹排序 index
     */
    async updateSortIndex(libraryId: string, items: { id: number; sort_index: number }[]): Promise<any> {
        return await this.httpClient.put('/api/folders/sort-index', { libraryId, items });
    }

    /**
     * 便捷方法：删除文件夹
     * @param libraryId 素材库ID
     * @param id 文件夹ID
     * @returns Promise<BaseResponse>
     */
    async deleteFolder(libraryId: string, id: number, deleteFiles?: boolean): Promise<BaseResponse> {
        return await this.delete({ libraryId, id, deleteFiles });
    }

    /**
     * 便捷方法：将文件移动到文件夹
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @param folderId 文件夹ID
     * @returns Promise<SetFileFolderResponse>
     */
    async moveFileToFolder(
        libraryId: string,
        fileId: number,
        folderId: number
    ): Promise<SetFileFolderResponse> {
        return await this.setFileFolder({ libraryId, fileId, folder: folderId });
    }

    /**
     * 便捷方法：将文件移出文件夹（移到根目录）
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @returns Promise<SetFileFolderResponse>
     */
    async removeFileFromFolder(
        libraryId: string,
        fileId: number
    ): Promise<SetFileFolderResponse> {
        return await this.setFileFolder({ libraryId, fileId, folder: null });
    }

    /**
     * 便捷方法：获取文件所在文件夹
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @returns Promise<FileFolderResponse>
     */
    async getFileFolderInfo(libraryId: string, fileId: number): Promise<FileFolderResponse> {
        return await this.getFileFolder({ libraryId, fileId });
    }

    /**
     * 便捷方法：按标题查询文件夹
     * @param libraryId 素材库ID
     * @param title 文件夹标题
     * @returns Promise<Folder[]>
     */
    async findByTitle(libraryId: string, title: string): Promise<Folder[]> {
        return await this.query({ libraryId, query: { title } });
    }

    /**
     * 便捷方法：按颜色查询文件夹
     * @param libraryId 素材库ID
     * @param color 文件夹颜色（数字类型）
     * @returns Promise<Folder[]>
     */
    async findByColor(libraryId: string, color: number): Promise<Folder[]> {
        return await this.query({ libraryId, query: { color } });
    }

    /**
     * 便捷方法：获取子文件夹
     * @param libraryId 素材库ID
     * @param parentId 父文件夹ID
     * @returns Promise<Folder[]>
     */
    async getSubFolders(libraryId: string, parentId: number): Promise<Folder[]> {
        return await this.query({ libraryId, query: { parent_id: parentId } });
    }

    /**
     * 便捷方法：获取根文件夹（没有父文件夹的文件夹）
     * @param libraryId 素材库ID
     * @returns Promise<Folder[]>
     */
    async getRootFolders(libraryId: string): Promise<Folder[]> {
        return await this.query({ libraryId, query: { parent_id: 0 } });
    }
}
