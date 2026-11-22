import i18n from '../../../i18n'
import { MiraSDKServiceBase } from '../MiraSDKServiceBase'
import type { MiraSDKService } from '../../MiraSDKService'

/**
 * 文件夹模块 partial —— 镜像 core SDK FolderModule
 */
export class MiraSDKFolderPart extends MiraSDKServiceBase {
  /**
   * 获取所有文件夹
   */
  async getAllFolders(libraryId: string): Promise<any[]> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const folders = await this.client.folders().getAll(libraryId)
      return folders
    } catch (error) {
      console.error('MiraSDKService: Failed to get folders', error)
      throw error
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(
    libraryId: string,
    title: string,
    parentId?: number,
    color?: number,
    description?: string,
    icon?: string
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.folders().createFolder(libraryId, title, parentId, color, description, icon)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to create folder', error)
      throw error
    }
  }

  /**
   * 更新文件夹
   */
  async updateFolder(
    libraryId: string,
    folderId: number,
    updates: {
      title?: string;
      color?: number;
      description?: string;
      parent_id?: number;
      icon?: string;
    }
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.folders().updateFolder(libraryId, folderId, updates)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to update folder', error)
      throw error
    }
  }

  /**
   * 删除文件夹
   * @param deleteFiles 是否同时删除文件夹内的文件（默认 false，文件移至未分类）
   */
  async deleteFolder(libraryId: string, folderId: number, deleteFiles?: boolean): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.folders().deleteFolder(libraryId, folderId, deleteFiles)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to delete folder', error)
      throw error
    }
  }

  async getFolderCovers(libraryId: string, folderIds: number[]) {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.folders().getCovers(libraryId, folderIds)
  }

  /**
   * 移动文件夹
   */
  async moveFolder(
    libraryId: string,
    folderId: number,
    newParentId: number | null
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {

      // 构建更新数据，正确处理null值
      const updateData: any = {}
      if (newParentId === null) {
        // 明确设置为null表示移动到根级别
        updateData.parent_id = null
      } else if (newParentId !== undefined) {
        // 设置具体的父级ID
        updateData.parent_id = newParentId
      }

      const result = await this.client.folders().updateFolder(libraryId, folderId, updateData)
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to move folder', error)
      throw error
    }
  }

  /**
   * 批量更新文件夹排序 index
   */
  async updateFolderSortIndex(libraryId: string, items: { id: number; sort_index: number }[]): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.folders().updateSortIndex(libraryId, items)
  }

  async moveFileToFolder(libraryId: string, fileId: number, folderId: number): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.folders().moveFileToFolder(libraryId, fileId, folderId)
  }

  /**
   * 克隆文件夹
   */
  async cloneFolder(
    libraryId: string,
    folderId: number,
    newTitle?: string,
    newParentId?: number
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      // 组合后的完整服务实例才具备跨模块方法（类型层面用断言收窄）
      const self = this as unknown as MiraSDKService

      // 首先获取原文件夹信息
      const folders = await self.getAllFolders(libraryId)
      const originalFolder = folders.find(f => f.id == folderId) // 使用 == 进行类型转换比较

      if (!originalFolder) {
        throw new Error('Original folder not found')
      }

      // 创建新文件夹
      const clonedTitle = newTitle || i18n.global.t('services.sdkService.folderCopySuffix', { name: originalFolder.title || originalFolder.label || originalFolder.name })
      const result = await self.createFolder(
        libraryId,
        clonedTitle,
        newParentId !== undefined ? newParentId : originalFolder.parent_id,
        originalFolder.color,
        originalFolder.description
      )

      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to clone folder', error)
      throw error
    }
  }
}
