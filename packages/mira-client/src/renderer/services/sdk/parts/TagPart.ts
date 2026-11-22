import { MiraSDKServiceBase } from '../MiraSDKServiceBase'

/**
 * 标签模块 partial —— 镜像 core SDK TagModule
 */
export class MiraSDKTagPart extends MiraSDKServiceBase {
  /**
   * 创建标签
   */
  async createTag(
    libraryId: string,
    name: string,
    color?: number,
    description?: string,
    icon?: string
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.tags().create({
        libraryId,
        title: name,
        color,
        description,
        icon
      })
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to create tag', error)
      throw error
    }
  }

  async updateTag(libraryId: string, tagId: string | number, updates: { name?: string; color?: number; description?: string; icon?: string }): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      // 标签树节点 id 形如 "tag-123"，去掉前缀后才能转换为数字 ID
      const numericId = Number(String(tagId).replace(/^tag-/, ''))
      if (!Number.isFinite(numericId)) {
        throw new Error(`Invalid tag id: ${tagId}`)
      }
      const result = await this.client.tags().updateTag(libraryId, numericId, {
        title: updates.name,
        color: updates.color,
        description: updates.description,
        icon: updates.icon,
      })
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to update tag', error)
      throw error
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(libraryId: string, tagId: number): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.tags().delete({ libraryId, id: tagId })
      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to delete tag', error)
      throw error
    }
  }

  /**
   * 批量更新标签排序 index
   */
  async updateTagSortIndex(libraryId: string, items: { id: number; sort_index: number }[]): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.tags().updateSortIndex(libraryId, items)
  }

  async addTagsToFile(libraryId: string, fileId: number, tags: string[]): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.tags().addTagsToFile(libraryId, fileId, tags)
  }
}
