import type { MoveFileResponse, PreviewViewer } from 'mira-app-core/shared/sdk'
import type { FileInfo, BaseResponse } from '../../../../shared/types'
import { MiraSDKServiceBase } from '../MiraSDKServiceBase'
import { appendToken, notifyDuplicateUpload, TypeAdapter } from '../support'
import { webSocketService } from '../../WebSocketService'
import { useMediaStore } from '../../../stores/media'
import { toFileUrl, } from '../../../utils/fileUtils'
import { resolveServerUrl } from '../../../utils/serverUrl'
import { environment } from '../../../utils'

/**
 * 文件模块 partial —— 镜像 core SDK FileModule
 */
export class MiraSDKFilePart extends MiraSDKServiceBase {
  /**
   * 文件操作
   */
  async listFiles(
    libraryId: string,
    filters?: {
      title?: string;
      extension?: string;
      tags?: string[] | null;
      folder?: number;
      size_min?: number;
      size_max?: number;
      created_after?: string;
      created_before?: string;
      imported_after?: string;
      imported_before?: string;
      recycled?: number;
      sort?: string;
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
      category?: string; // 媒体类别：video, audio, image
    }
  ): Promise<{ files: FileInfo[], total: number, limit: number, offset: number }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      // 保留 null：tags=null 表示未标签、folder=null 表示未分类（服务端按 null 语义过滤）
      const requestFilters = filters
        ? Object.fromEntries(
            Object.entries(filters).filter(([, value]) =>
              value !== undefined &&
              !(typeof value === 'number' && !Number.isFinite(value))
            )
          )
        : undefined


      // 获取部署环境信息
      const { useSettingsStore } = await import('../../../stores/settings')
      const settingsStore = useSettingsStore()
      if (!settingsStore.systemHealth) {
        await settingsStore.getSystemHealth()
      }
      const isDocker = settingsStore.systemHealth?.isDocker ?? false
      let smbConfig: { enabled?: boolean; smbPath?: string; mountPath?: string } | null = null
      if (isDocker) {
        const { useServerListStore } = await import('../../../stores/serverList')
        smbConfig = useServerListStore().activeServer?.smb ?? null
      }

      // 使用 SDK 的文件模块获取文件列表
      let files: any;
      if (requestFilters && Object.keys(requestFilters).length > 0) {
        // 清理 undefined 值（保留 null：tags=null/folder=null 有过滤语义）
        const cleanedFilters = Object.fromEntries(
          Object.entries(requestFilters).filter(([, v]) =>
            v !== undefined &&
            !(typeof v === 'number' && !Number.isFinite(v))
          )
        )
        // 使用带过滤器的方法
        files = await (this.client.files() as any).getFiles({
          libraryId,
          filters: cleanedFilters,
          clientId: webSocketService.getClientId()
        })
      } else {
        // 使用获取所有文件的方法
        files = await (this.client.files() as any).getFiles({
          libraryId,
          clientId: webSocketService.getClientId()
        })
      }
      // 转换为 FileInfo 类型
      const fileInfos: FileInfo[] = files.result.map((file: any) => {
        let localFile: string | undefined
        let thumbnailPath: string | undefined

        if (isDocker) {
          // Docker 环境：需要 SMB 映射才能访问本地路径，否则用 HTTP URL
          if (smbConfig?.enabled && smbConfig.smbPath) {
            const smbPath = smbConfig.smbPath
            const sep = smbPath.includes('/') ? '/' : '\\'
            const normalizedSmbPath = smbPath.endsWith(sep) ? smbPath : smbPath + sep

            if (smbConfig.mountPath && file.file_path) {
              const mountPrefix = smbConfig.mountPath.endsWith('/') ? smbConfig.mountPath : smbConfig.mountPath + '/'
              localFile = file.file_path.replace(mountPrefix, normalizedSmbPath).replace(/\//g, sep)
              if (file.thumb_path) {
                thumbnailPath = file.thumb_path.replace(mountPrefix, normalizedSmbPath).replace(/\//g, sep)
              }
            } else {
              // folder_name 为空串时表示未分类文件（存放在素材库根目录），直接拼根路径
              if (file.name) {
                localFile = file.folder_name
                  ? normalizedSmbPath + file.folder_name + sep + file.name
                  : normalizedSmbPath + file.name
              }
              const thumbFileName = file.hash ? `${file.hash}.png` : `${file.id}.png`
              thumbnailPath = normalizedSmbPath + 'thumbs' + sep + thumbFileName
            }
          }
          // Docker 无 SMB：localFile 和 thumbnailPath 都留空，回退到 HTTP URL
        } else if (environment.isElectron) {
          // 本地部署 + Electron：服务端路径就是本机路径，可直接 file:// 访问，省一次 HTTP
          localFile = file.file_path
          thumbnailPath = file.thumb_path
        }
        // 网页端：localFile/thumbnailPath 留空，回退到 HTTP URL（file.path / file.thumb）

        return {
          id: file.id.toString(),
          name: file.name,
          path: toFileUrl(appendToken(resolveServerUrl(file.path, this.connectionConfig?.serverUrl) as string | undefined)),
          size: file.size,
          extension: file.extension || this.getFileExtension(file.name),
          mimeType: file.mime_type || this.getMimeTypeFromExtension(file.name),
          createdAt: file.created_at,
          updatedAt: file.updated_at || file.imported_at || file.created_at,
          tags: typeof file.tags === 'string' ? JSON.parse(file.tags || '[]') : (file.tags || []),
          folderId: file.folder_id?.toString(),
          website: file.website || '',
          stars: Number(file.stars ?? file.rating ?? 0),
          notes: file.notes || '',
          recycled: Number(file.recycled) || 0,
          hash: file.hash || '',
          thumbnailPath: toFileUrl(appendToken(thumbnailPath || (resolveServerUrl(file.thumb, this.connectionConfig?.serverUrl) as string | undefined))),
          libraryId,
          localFile: localFile || file.localFile || (() => {
            try {
              const mediaStore = useMediaStore()
              return mediaStore.getLocalFile(libraryId, file.id.toString())
            } catch (error) {
              return undefined
            }
          })()
        }
      })


      // 发布HTTP请求成功事件
      this.emitHttpEvent('api/files/getFiles', 'success', {
        libraryId,
        filters,
        data: fileInfos,
        fileCount: fileInfos.length,
        total: files.total || fileInfos.length,
        timestamp: new Date().toISOString()
      })

      // 返回完整的分页信息
      const result = {
        files: fileInfos,
        total: files.total || fileInfos.length,
        limit: files.limit || filters?.limit || 999,
        offset: files.offset || filters?.offset || 0
      }

      return result
    } catch (error) {
      console.error('MiraSDKService: Failed to list files', error)
      throw error
    }
  }

  /**
   * 获取单个文件信息
   */
  async getFile(libraryId: string, fileId: string | number): Promise<FileInfo> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {

      // 使用 SDK 的文件模块获取单个文件信息
      const file = await (this.client.files() as any).getFile(libraryId, fileId, webSocketService.getClientId())

      // 转换为 FileInfo 类型
      // 网页端不使用本地路径（浏览器禁止 file:// 访问）：
      //   - path 字段已是 HTTP URL（toFileUrl 对 http 原样返回），Electron/网页均安全
      //   - 缩略图：Electron 用本地 thumbnail_path 走 file://；网页回退到 HTTP thumb
      const useLocalThumb = environment.isElectron
      const localFile = environment.isElectron ? file.file_path : undefined
      const fileInfo: FileInfo = {
        id: file.id.toString(),
        name: file.title || file.name, // 优先使用 title，如果没有则使用 name
        path: toFileUrl(appendToken(file.path)),
        size: file.size,
        extension: file.extension || this.getFileExtension(file.title || file.name),
        mimeType: file.mime_type || this.getMimeTypeFromExtension(file.title || file.name),
        createdAt: file.created_at,
        updatedAt: file.updated_at || file.imported_at || file.created_at,
        tags: typeof file.tags === 'string' ? JSON.parse(file.tags || '[]') : (file.tags || []),
        folderId: file.folder_id?.toString(),
        website: file.website || '',
        stars: Number(file.stars ?? file.rating ?? 0),
        notes: file.notes || '',
        recycled: Number(file.recycled) || 0,
        hash: file.hash || '',
        thumbnailPath: toFileUrl(appendToken(useLocalThumb ? file.thumbnail_path : (file.thumb || undefined))),
        libraryId,
        localFile,
      }

      return fileInfo
    } catch (error) {
      console.error('MiraSDKService: Failed to get file', error)
      throw error
    }
  }

  /** 批量获取文件 metadata，供瀑布流等布局计算使用。 */
  async getFileMetadataByIds(
    libraryId: string,
    fileIds: Array<string | number>
  ): Promise<Array<{ id: string; metadata?: Record<string, any>; width?: number; height?: number }>> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().getMetadataByIds(libraryId, fileIds)
  }

  async getFileExifByIds(libraryId: string, fileIds: Array<string | number>) {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().getExifByIds(libraryId, fileIds, webSocketService.getClientId())
  }

  /** 获取当前文件可用的插件预览器。 */
  async getPreviewViewers(libraryId: string, fileId: string | number): Promise<PreviewViewer[]> {
    if (!this.client) throw new Error('Not connected to Mira server')
    const response = await (this.client.files() as any).getPreviewViewers(
      libraryId,
      fileId,
      webSocketService.getClientId()
    )
    return response?.viewers || []
  }

  async uploadFile(file: File, libraryId: string, metadata?: any): Promise<BaseResponse & { duplicate?: true }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const { sourcePath, ...uploadMetadata } = metadata || {}
      const result = await this.client.files().uploadFile(file, libraryId, {
        ...uploadMetadata,
        silent: true,
        ...(sourcePath ? { sourcePath } : {}),
      })
      const uploaded = result.results?.[0] as (NonNullable<typeof result.results>[number] & {
        operation?: string
      }) | undefined
      if (uploaded?.operation === 'duplicate') {
        notifyDuplicateUpload(uploaded.result?.name || file.name)
        return {
          success: true,
          message: 'File already exists, skipped upload',
          duplicate: true,
          data: uploaded.result,
        }
      }
      if (!uploaded?.success || !uploaded.result) {
        throw new Error(uploaded?.error || 'File upload failed')
      }
      return { success: true, message: 'File uploaded successfully', data: uploaded.result }
    } catch (error) {
      console.error('MiraSDKService: File upload failed', error)
      throw error
    }
  }

  /**
   * 本地素材库内文件直接按绝对路径导入，避免把文件字节再次传到本机服务端。
   */
  async importLocalFilePath(
    libraryId: string,
    filePath: string,
    options?: { folderId?: string; tags?: string[] }
  ): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')
    const result = await (this.client.files() as any).importFilePath(libraryId, filePath, options)
    // HttpClient.post 会自动解包顶层 data，因此这里通常直接得到文件对象。
    const file = result?.data ?? result
    if (!file || result?.success === false) {
      throw new Error(result?.error || result?.message || 'Local file import failed')
    }
    // 文件可能已被 watcher 并发入库，此时服务端返回空数组，仍视为导入完成。
    return { success: true, message: 'Local file imported successfully', data: file || { path: filePath } }
  }

  async downloadFile(libraryId: string, fileId: string): Promise<Blob> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.files().download(libraryId, fileId)
      return result
    } catch (error) {
      console.error('MiraSDKService: File download failed', error)
      throw error
    }
  }

  async moveFile(sourceLibraryId: string, targetLibraryId: string, fileId: string | number): Promise<MoveFileResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      return await this.client.files().moveFile(sourceLibraryId, targetLibraryId, fileId)
    } catch (error) {
      console.error('MiraSDKService: File move failed', error)
      throw error
    }
  }

  /**
   * 从 URL 批量下载并入库（走后端下载执行器，按 host 匹配用户 cookie 站点）。
   * 返回 { batchId, total }。进度通过 WebSocket 事件 download::progress / download::item 推送。
   */
  async startDownloadFromUrl(
    libraryId: string,
    urls: string[],
    folderId?: number | null,
    tagIds?: string[],
  ): Promise<{ batchId: string; total: number }> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return this.client.files().batchImportFromUrls(libraryId, urls, {
      folderId,
      tagIds,
      clientId: webSocketService.getClientId(),
    })
  }

  async getExtraFileList(libraryId: string, fileId: string): Promise<string[]> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().getExtraFileList(libraryId, fileId)
  }

  async getExtraFile(libraryId: string, fileId: string, fileName: string): Promise<Blob> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().getExtraFile(libraryId, fileId, fileName)
  }

  getExtraFileUrl(libraryId: string, fileId: string, fileName: string): string {
    if (!this.client) throw new Error('Not connected to Mira server')
    return this.client.files().getExtraFileUrl(libraryId, fileId, fileName)
  }

  async writeFile(
    libraryId: string,
    fileId: string,
    content: Blob | string | ArrayBuffer,
    options?: { name?: string; contentType?: string }
  ): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().writeFile(libraryId, fileId, content, options)
  }

  async setFileCover(libraryId: string, fileId: string, cover: Blob): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().setCover(libraryId, fileId, cover)
  }

  async deleteFile(libraryId: string, fileId: string, moveToRecycleBin: boolean = true): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.files().delete(libraryId, fileId, { moveToRecycleBin })
      return TypeAdapter.normalizeBaseResponse(result)
    } catch (error) {
      console.error('MiraSDKService: File deletion failed', error)
      throw error
    }
  }

  async batchDeleteFiles(
    libraryId: string,
    fileIds: (string | number)[],
    moveToRecycleBin: boolean = true
  ): Promise<{ success: boolean; message: string; deletedCount: number; deletedIds: number[]; failedIds: number[] }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      return await this.client.files().batchDelete(libraryId, fileIds, { moveToRecycleBin })
    } catch (error) {
      console.error('MiraSDKService: Batch file deletion failed', error)
      throw error
    }
  }

  async emptyTrash(libraryId: string): Promise<{ success: boolean; deletedCount: number; errors?: string[] }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.files().emptyTrash(libraryId)
      return result
    } catch (error) {
      console.error('MiraSDKService: Empty trash failed', error)
      throw error
    }
  }

  async restoreFile(libraryId: string, fileId: string): Promise<BaseResponse> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      const result = await this.client.files().restoreFile(libraryId, fileId)
      return TypeAdapter.normalizeBaseResponse(result)
    } catch (error) {
      console.error('MiraSDKService: File restore failed', error)
      throw error
    }
  }

  async batchRestoreFiles(
    libraryId: string,
    fileIds: (string | number)[]
  ): Promise<{ success: boolean; message: string; recoveredCount: number; recoveredIds: number[]; failedIds: number[] }> {
    if (!this.client) throw new Error('Not connected to Mira server')

    try {
      return await this.client.files().batchRestoreFiles(libraryId, fileIds)
    } catch (error) {
      console.error('MiraSDKService: Batch file restore failed', error)
      throw error
    }
  }

  async renameFile(libraryId: string, fileId: string | number, name: string): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().renameFile(libraryId, fileId, name)
  }

  async updateFile(libraryId: string, fileId: string | number, data: Record<string, any>): Promise<any> {
    if (!this.client) throw new Error('Not connected to Mira server')
    return await this.client.files().updateFile(libraryId, fileId, data)
  }
}
