/**
 * 管理员管理API服务
 */
import type { User, CreateAdminRequest, UpdateAdminRequest, AdminResponse } from '../../types/mira/auth';
import { miraApiClient } from './client';

/**
 * 管理员API服务类
 */
export class AdminApi {
    /**
     * 获取管理员列表
     */
    static async getAdmins(): Promise<User[]> {
        const response = await miraApiClient.get('/admins');
        return response.data;
    }

    /**
     * 创建管理员
     */
    static async createAdmin(adminData: CreateAdminRequest): Promise<AdminResponse> {
        const response = await miraApiClient.post('/admins', adminData);
        return response.data;
    }

    /**
     * 更新管理员信息
     */
    static async updateAdmin(id: string, adminData: UpdateAdminRequest): Promise<AdminResponse> {
        const response = await miraApiClient.put(`/api/admins/${id}`, adminData);
        return response.data;
    }

    /**
     * 删除管理员
     */
    static async deleteAdmin(id: string): Promise<AdminResponse> {
        const response = await miraApiClient.delete(`/api/admins/${id}`);
        return response.data;
    }
}

// 默认导出API实例
export default AdminApi;
