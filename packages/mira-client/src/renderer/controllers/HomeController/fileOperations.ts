import { useMediaStore } from '../../stores/media'
import { useFolderStore } from '../../stores/folder'
import { useTagStore } from '../../stores/tag'
import { useLibraryStore } from '../../stores/library'
import type { FileInfo } from '../../../shared/types'

/**
 * 文件操作模块
 * 负责处理标签管理、文件夹操作、批量删除等文件操作
 */
export class HomeFileOperations {
  private mediaStore = useMediaStore()
  private folderStore = useFolderStore()
  private tagStore = useTagStore()
  private libraryStore = useLibraryStore()

  /**
   * 处理标签添加
   * @param tags - 标签数组或单个标签字符串
   * @param selectedItem - 选中的媒体项目
   */
  public handleTagAdd = async (tags: string[] | string, selectedItem?: FileInfo): Promise<void> => {
    if (selectedItem && this.libraryStore.currentLibrary) {
      const item = selectedItem
      const libraryId = this.libraryStore.currentLibrary.id
      const fileId = parseInt(item.id)

      const tagArray = Array.isArray(tags) ? tags : [tags]

      try {
        const client = (this.mediaStore as any).client || (window as any).miraSDKService?.client
        if (client) {
          await client.tags().addTagsToFile(libraryId, fileId, tagArray)

          if (!item.tags) {
            item.tags = []
          }
          const uniqueTags = [...new Set([...item.tags, ...tagArray])]
          item.tags = uniqueTags

          await this.tagStore.refreshTags(libraryId)

          console.log(`✅ Tags added to file: ${tagArray.join(', ')}`)
        }
      } catch (error) {
        console.error('❌ Failed to add tags to file:', error)
      }
    }
  }

  /**
   * 创建新标签
   * @param tagName - 标签名称
   * @param color - 标签颜色（可选）
   * @param description - 标签描述（可选）
   */
  public handleCreateTag = async (tagName: string, color?: number, description?: string): Promise<void> => {
    if (this.libraryStore.currentLibrary) {
      const libraryId = this.libraryStore.currentLibrary.id

      try {
        const client = (this.mediaStore as any).client || (window as any).miraSDKService?.client
        if (client) {
          const result = await client.tags().create({
            libraryId,
            title: tagName,
            color,
            description
          })

          if (result.success) {
            await this.tagStore.refreshTags(libraryId)
            console.log(`✅ Tag created: ${tagName}`)
          }
        }
      } catch (error) {
        console.error('❌ Failed to create tag:', error)
      }
    }
  }

  /**
   * 删除标签
   * @param tagId - 标签ID
   */
  public handleDeleteTag = async (tagId: number): Promise<void> => {
    if (this.libraryStore.currentLibrary) {
      const libraryId = this.libraryStore.currentLibrary.id

      try {
        const client = (this.mediaStore as any).client || (window as any).miraSDKService?.client
        if (client) {
          await client.tags().delete(libraryId, tagId)
          await this.tagStore.refreshTags(libraryId)
          console.log(`✅ Tag deleted: ${tagId}`)
        }
      } catch (error) {
        console.error('❌ Failed to delete tag:', error)
      }
    }
  }

  /**
   * 创建新文件夹
   * @param folderName - 文件夹名称
   * @param parentId - 父文件夹ID（可选）
   * @param color - 文件夹颜色（可选）
   * @param description - 文件夹描述（可选）
   */
  public handleCreateFolder = async (folderName: string, parentId?: number, color?: number, description?: string): Promise<void> => {
    if (this.libraryStore.currentLibrary) {
      const libraryId = this.libraryStore.currentLibrary.id

      try {
        const client = (this.mediaStore as any).client || (window as any).miraSDKService?.client
        if (client) {
          const result = await client.folders().create({
            libraryId,
            title: folderName,
            parent_id: parentId,
            color,
            description
          })

          if (result.success) {
            await this.folderStore.refreshFolders(libraryId)
            console.log(`✅ Folder created: ${folderName}`)
          }
        }
      } catch (error) {
        console.error('❌ Failed to create folder:', error)
      }
    }
  }

  /**
   * 删除文件夹
   * @param folderId - 文件夹ID
   */
  public handleDeleteFolder = async (folderId: number): Promise<void> => {
    if (this.libraryStore.currentLibrary) {
      const libraryId = this.libraryStore.currentLibrary.id

      try {
        const client = (this.mediaStore as any).client || (window as any).miraSDKService?.client
        if (client) {
          await client.folders().delete(libraryId, folderId)
          await this.folderStore.refreshFolders(libraryId)
          console.log(`✅ Folder deleted: ${folderId}`)
        }
      } catch (error) {
        console.error('❌ Failed to delete folder:', error)
      }
    }
  }

  /**
   * 移动文件到指定文件夹
   * @param fileIds - 文件ID数组
   * @param folderId - 目标文件夹ID
   * @param mediaItems - 媒体项目数组，用于更新本地状态
   */
  public handleMoveFilesToFolder = async (fileIds: string[], folderId: number, mediaItems: FileInfo[]): Promise<void> => {
    if (this.libraryStore.currentLibrary) {
      const libraryId = this.libraryStore.currentLibrary.id

      try {
        const client = (this.mediaStore as any).client || (window as any).miraSDKService?.client
        if (client) {
          const promises = fileIds.map(fileId =>
            client.folders().moveFileToFolder(libraryId, parseInt(fileId), folderId)
          )

          await Promise.all(promises)

          mediaItems.forEach(item => {
            if (fileIds.includes(item.id)) {
              item.folderId = folderId.toString()
            }
          })

          console.log(`✅ Files moved to folder: ${folderId}`)
        }
      } catch (error) {
        console.error('❌ Failed to move files to folder:', error)
      }
    }
  }

  /**
   * 批量删除文件
   * @param fileIds - 文件ID数组
   * @param onFilesDeleted - 文件删除后的回调函数
   */
  public handleDeleteFiles = async (fileIds: string[], onFilesDeleted?: (deletedIds: string[]) => void): Promise<void> => {
    if (this.libraryStore.currentLibrary) {
      const libraryId = this.libraryStore.currentLibrary.id

      try {
        const client = (this.mediaStore as any).client || (window as any).miraSDKService?.client
        if (client) {
          const promises = fileIds.map(fileId =>
            client.files().delete(libraryId, parseInt(fileId))
          )

          await Promise.all(promises)
          await this.mediaStore.refreshFiles(libraryId)

          if (onFilesDeleted) {
            onFilesDeleted(fileIds)
          }

          console.log(`✅ Files deleted: ${fileIds.length} files`)
        }
      } catch (error) {
        console.error('❌ Failed to delete files:', error)
      }
    }
  }

  /**
   * 处理标签移除
   * @param tag - 标签
   * @param selectedItem - 选中的媒体项目
   */
  public handleTagRemove = async (tag: string, selectedItem?: FileInfo): Promise<void> => {
    if (selectedItem && this.libraryStore.currentLibrary) {
      const item = selectedItem
      const libraryId = this.libraryStore.currentLibrary.id
      const fileId = parseInt(item.id)

      try {
        const client = (this.mediaStore as any).client || (window as any).miraSDKService?.client
        if (client && item.tags) {
          const updatedTags = item.tags.filter((t: string) => t !== tag)
          await client.tags().addTagsToFile(libraryId, fileId, updatedTags)
          item.tags = updatedTags
          await this.tagStore.refreshTags(libraryId)
          console.log(`✅ Tag removed from file: ${tag}`)
        }
      } catch (error) {
        console.error('❌ Failed to remove tag from file:', error)
      }
    }
  }

  /**
   * 处理文件夹变更
   * @param folderId - 文件夹ID
   * @param selectedItem - 选中的媒体项目
   */
  public handleFolderChange = async (folderId: string, selectedItem?: FileInfo): Promise<void> => {
    if (selectedItem && this.libraryStore.currentLibrary) {
      const item = selectedItem
      const libraryId = this.libraryStore.currentLibrary.id
      const fileId = parseInt(item.id)
      const folderIdNum = parseInt(folderId)

      try {
        const client = (this.mediaStore as any).client || (window as any).miraSDKService?.client
        if (client) {
          await client.folders().moveFileToFolder(libraryId, fileId, folderIdNum)
          item.folderId = folderId
          console.log(`✅ File moved to folder: ${folderId}`)
        }
      } catch (error) {
        console.error('❌ Failed to move file to folder:', error)
      }
    }
  }
}
