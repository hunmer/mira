import { MiraServer } from '../MiraServer';

/**
 * FileRoutes 系路由的存储访问门面。
 *
 * 路由 handler 一律通过本服务访问素材库实例与库配置，
 * 不再直接触碰 backend.libraries（消除散落各处的非空断言）。
 * 参照 LibraryImportService 的 backend 注入先例。
 */
export class FileService {
    constructor(private readonly backend: MiraServer) {}

    /** 取素材库实例（含 libraryService / pluginManager / watcher 等），不存在时返回 undefined */
    getLibrary(libraryId: string): Record<string, any> | undefined {
        return this.backend.libraries?.getLibrary(libraryId);
    }

    /** 取素材库配置（权限 allowedRoles 等），不存在时返回 null */
    getLibraryConfig(libraryId: string): Record<string, any> | null {
        return this.backend.libraries?.getLibraryConfig(libraryId) ?? null;
    }
}
