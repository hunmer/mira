import type { LibraryInfo } from '../../../../shared/types'
import { MiraSDKServiceBase } from '../MiraSDKServiceBase'

/**
 * 素材库模块 partial —— 镜像 core SDK LibraryModule
 */
export class MiraSDKLibraryPart extends MiraSDKServiceBase {
  async getLibraryStats(libraryId: string): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.libraries().stats(libraryId)
  }

  /**
   * 库管理
   */
  async getLibraries(): Promise<LibraryInfo[]> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const libs = await this.client.libraries().getAll()
      // 适配本地 LibraryInfo 类型（补充 type 字段）
      return libs.map(lib => ({ ...lib, type: 'local' } as LibraryInfo))
    } catch (error) {
      console.error('MiraSDKService: Failed to get librarys', error)
      throw error
    }
  }

  async createLibrary(name: string, description?: string): Promise<LibraryInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      await this.client.libraries().createLocal(
        name,
        '', // path - 需要根据实际需求设置
        description || ''
      )

      // 转换为 LibraryInfo 类型
      const libraryInfo: LibraryInfo = {
        id: `library_${Date.now()}`,
        name,
        description,
        type: 'user',
        path: '',
        fileCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      return libraryInfo
    } catch (error) {
      console.error('MiraSDKService: Library creation failed', error)
      throw error
    }
  }
}
