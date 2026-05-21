import { HttpClient } from '../client/HttpClient';
import { BaseResponse } from '../types';

/**
 * 标签数据类型
 */
export interface Tag {
    id: number;
    title: string;
    parent_id?: number | undefined;
    color?: number;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * 标签查询参数
 */
export interface TagQuery {
    title?: string;
    parent_id?: number;
    color?: number;
    limit?: number;
    offset?: number;
}

/**
 * 创建标签请求
 */
export interface CreateTagRequest {
    libraryId: string;
    title: string;
    parent_id?: number;
    color?: number;
    description?: string;
}

/**
 * 更新标签请求
 */
export interface UpdateTagRequest {
    libraryId: string;
    id: number;
    title?: string;
    parent_id?: number;
    color?: number;
    description?: string;
}

/**
 * 删除标签请求
 */
export interface DeleteTagRequest {
    libraryId: string;
    id: number;
}

/**
 * 标签查询请求
 */
export interface QueryTagRequest {
    libraryId: string;
    query?: TagQuery;
}

/**
 * 文件标签设置请求
 */
export interface SetFileTagsRequest {
    libraryId: string;
    fileId: number;
    tags: string[];
}

/**
 * 获取文件标签请求
 */
export interface GetFileTagsRequest {
    libraryId: string;
    fileId: number;
}

/**
 * 标签响应
 */
export interface TagResponse extends BaseResponse<Tag> { }

/**
 * 标签列表响应
 */
export interface TagListResponse extends BaseResponse<Tag[]> { }

/**
 * 文件标签响应
 */
export interface FileTagsResponse extends BaseResponse<{ tags: string[] }> { }

/**
 * 文件标签设置响应
 */
export interface SetFileTagsResponse extends BaseResponse<{
    fileId: number;
    tags: string[];
    result: boolean;
}> { }

/**
 * 标签模块
 * 处理标签的CRUD操作和文件标签关联
 */
export class TagModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取所有标签
     * @param libraryId 素材库ID
     * @returns Promise<Tag[]>
     */
    async getAll(libraryId: string): Promise<Tag[]> {
        return await this.httpClient.get<Tag[]>(`/api/tags/all?libraryId=${libraryId}`);
    }

    /**
     * 查询标签
     * @param request 查询请求
     * @returns Promise<Tag[]>
     */
    async query(request: QueryTagRequest): Promise<Tag[]> {
        return await this.httpClient.post<Tag[]>('/api/tags/query', request);
    }

    /**
     * 创建标签
     * @param request 创建请求
     * @returns Promise<Tag>
     */
    async create(request: CreateTagRequest): Promise<Tag> {
        return await this.httpClient.post<Tag>('/api/tags/create', request);
    }

    /**
     * 更新标签
     * @param request 更新请求
     * @returns Promise<Tag>
     */
    async update(request: UpdateTagRequest): Promise<Tag> {
        return await this.httpClient.put<Tag>('/api/tags/update', request);
    }

    /**
     * 删除标签
     * @param request 删除请求
     * @returns Promise<BaseResponse>
     */
    async delete(request: DeleteTagRequest): Promise<BaseResponse> {
        // 由于服务器使用DELETE方法并通过body传递数据，我们需要使用axios实例直接调用
        const response = await this.httpClient.getAxiosInstance().delete<BaseResponse>('/api/tags/delete', {
            data: request
        });
        return response.data;
    }

    /**
     * 为文件设置标签
     * @param request 设置请求
     * @returns Promise<SetFileTagsResponse>
     */
    async setFileTags(request: SetFileTagsRequest): Promise<SetFileTagsResponse> {
        return await this.httpClient.post<SetFileTagsResponse>('/api/tags/file/set', request);
    }

    /**
     * 获取文件的标签
     * @param request 获取请求
     * @returns Promise<FileTagsResponse>
     */
    async getFileTags(request: GetFileTagsRequest): Promise<FileTagsResponse> {
        return await this.httpClient.get<FileTagsResponse>(`/api/tags/file/${request.fileId}?libraryId=${request.libraryId}`);
    }

    /**
     * 便捷方法：创建标签
     * @param libraryId 素材库ID
     * @param title 标签标题
     * @param color 标签颜色（可选，数字类型）
     * @param description 标签描述（可选）
     * @returns Promise<Tag>
     */
    async createTag(
        libraryId: string,
        title: string,
        parentId?: number,
        color?: number,
        description?: string
    ): Promise<Tag> {
        return await this.create({ libraryId, title, parent_id: parentId, color, description });
    }

    /**
     * 便捷方法：更新标签
     * @param libraryId 素材库ID
     * @param id 标签ID
     * @param updates 更新数据
     * @returns Promise<Tag>
     */
    async updateTag(
        libraryId: string,
        id: number,
        updates: { title?: string; parent_id?: number; color?: number; description?: string }
    ): Promise<Tag> {
        return await this.update({ libraryId, id, ...updates });
    }

    /**
     * 便捷方法：删除标签
     * @param libraryId 素材库ID
     * @param id 标签ID
     * @returns Promise<BaseResponse>
     */
    async deleteTag(libraryId: string, id: number): Promise<BaseResponse> {
        return await this.delete({ libraryId, id });
    }

    /**
     * 便捷方法：为文件添加标签
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @param tags 标签数组
     * @returns Promise<SetFileTagsResponse>
     */
    async addTagsToFile(
        libraryId: string,
        fileId: number,
        tags: string[]
    ): Promise<SetFileTagsResponse> {
        return await this.setFileTags({ libraryId, fileId, tags });
    }

    /**
     * 便捷方法：获取文件标签
     * @param libraryId 素材库ID
     * @param fileId 文件ID
     * @returns Promise<FileTagsResponse>
     */
    async getFileTagList(libraryId: string, fileId: number): Promise<FileTagsResponse> {
        return await this.getFileTags({ libraryId, fileId });
    }

    /**
     * 便捷方法：按标题查询标签
     * @param libraryId 素材库ID
     * @param title 标签标题
     * @returns Promise<Tag[]>
     */
    async findByTitle(libraryId: string, title: string): Promise<Tag[]> {
        return await this.query({ libraryId, query: { title } });
    }

    /**
     * 便捷方法：按颜色查询标签
     * @param libraryId 素材库ID
     * @param color 标签颜色（数字类型）
     * @returns Promise<Tag[]>
     */
    async findByColor(libraryId: string, color: number): Promise<Tag[]> {
        return await this.query({ libraryId, query: { color } });
    }

    /**
     * 便捷方法：获取子标签
     * @param libraryId 素材库ID
     * @param parentId 父标签ID
     * @returns Promise<Tag[]>
     */
    async getSubTags(libraryId: string, parentId: number): Promise<Tag[]> {
        return await this.query({ libraryId, query: { parent_id: parentId } });
    }

    /**
     * 便捷方法：获取根标签（没有父标签的标签）
     * @param libraryId 素材库ID
     * @returns Promise<Tag[]>
     */
    async getRootTags(libraryId: string): Promise<Tag[]> {
        return await this.query({ libraryId, query: { parent_id: 0 } });
    }
}
