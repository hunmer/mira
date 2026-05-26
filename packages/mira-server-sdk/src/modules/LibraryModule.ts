import { HttpClient } from '../client/HttpClient';
import {
    Library,
    CreateLibraryRequest,
    UpdateLibraryRequest,
    BaseResponse,
} from '../types';

/**
 * 素材库模块
 * 处理素材库的 CRUD 操作和状态管理
 */
export class LibraryModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取所有素材库列表
     * @returns Promise<Library[]>
     */
    async getAll(): Promise<Library[]> {
        return await this.httpClient.get<Library[]>('/api/libraries');
    }

    /**
     * 根据ID获取单个素材库
     * @param id 素材库ID
     * @returns Promise<Library>
     */
    async getById(id: string): Promise<Library> {
        const libraries = await this.getAll();
        const library = libraries.find(lib => lib.id === id);
        if (!library) {
            throw new Error(`Library with id ${id} not found`);
        }
        return library;
    }

    /**
     * 创建新的素材库
     * @param libraryData 素材库数据
     * @returns Promise<BaseResponse>
     */
    async create(libraryData: CreateLibraryRequest): Promise<BaseResponse> {
        return await this.httpClient.post<BaseResponse>('/api/libraries', libraryData);
    }

    /**
     * 更新素材库信息
     * @param id 素材库ID
     * @param updateData 更新数据
     * @returns Promise<BaseResponse>
     */
    async update(id: string, updateData: UpdateLibraryRequest): Promise<BaseResponse> {
        return await this.httpClient.put<BaseResponse>(`/api/libraries/${id}`, updateData);
    }

    /**
     * 删除素材库
     * @param id 素材库ID
     * @returns Promise<BaseResponse>
     */
    async delete(id: string): Promise<BaseResponse> {
        return await this.httpClient.delete<BaseResponse>(`/api/libraries/${id}`);
    }

    /**
     * 启动素材库服务
     * @param id 素材库ID
     * @returns Promise<BaseResponse>
     */
    async start(id: string): Promise<BaseResponse> {
        return await this.httpClient.post<BaseResponse>(`/api/libraries/${id}/start`);
    }

    /**
     * 停止素材库服务
     * @param id 素材库ID
     * @returns Promise<BaseResponse>
     */
    async stop(id: string): Promise<BaseResponse> {
        return await this.httpClient.post<BaseResponse>(`/api/libraries/${id}/stop`);
    }

    /**
     * 重启素材库服务
     * @param id 素材库ID
     * @returns Promise<BaseResponse>
     */
    async restart(id: string): Promise<BaseResponse> {
        await this.stop(id);
        return await this.start(id);
    }

    /**
     * 创建素材库
     * @param name 名称
     * @param path 路径
     * @param description 描述
     * @param options 其他选项
     * @returns Promise<BaseResponse>
     */
    async createLocal(
        name: string,
        path: string,
        description: string,
        options?: Partial<CreateLibraryRequest>
    ): Promise<BaseResponse> {
        const libraryData: CreateLibraryRequest = {
            name,
            path,
            description,
            ...options,
        };
        return await this.create(libraryData);
    }

    /**
     * 获取活跃的素材库列表
     * @returns Promise<Library[]>
     */
    async getActive(): Promise<Library[]> {
        const libraries = await this.getAll();
        return libraries.filter(lib => lib.status === 'active');
    }

    /**
     * 获取本地素材库列表
     * @returns Promise<Library[]>
     */
    async getLocal(): Promise<Library[]> {
        const libraries = await this.getAll();
        return libraries.filter(lib => lib.type === 'local');
    }

    /**
     * 获取远程素材库列表
     * @returns Promise<Library[]>
     */
    async getRemote(): Promise<Library[]> {
        const libraries = await this.getAll();
        return libraries.filter(lib => lib.type === 'remote');
    }

    /**
     * 按状态筛选素材库
     * @param status 状态
     * @returns Promise<Library[]>
     */
    async getByStatus(status: Library['status']): Promise<Library[]> {
        const libraries = await this.getAll();
        return libraries.filter(lib => lib.status === status);
    }
}
