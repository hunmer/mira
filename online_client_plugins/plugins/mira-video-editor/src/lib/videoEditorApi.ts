/**
 * 视频编辑器 API（本地化版本）。
 *
 * 原版（ai-toolbox）此服务走 HTTP 后端 + Electron IPC；迁移到 Mira 插件后：
 *   - 列表/片段数据 → localStorage（localVideoStorage，唯一存储通道）
 *   - 场景检测/导出 → 宿主受控 ffmpeg/scenedetect（lib/ffmpeg）
 * 方法签名与原版保持一致，composables 无需感知存储切换。
 */

import { localVideoStorage } from './localVideoStorage'
import {
  detectScenes,
  checkExistingScenes,
  clearSceneCache,
  mergeAndExportScenes,
  exportScenes,
  type Quality,
  type SceneSegmentApi,
} from './ffmpeg'
import { getTempDir } from './exec'
import type { VideoData, VideoList, VideoClip, WatermarkRegion } from '@/types/video-editor'

export class VideoEditorApi {
  async getAllLists(): Promise<VideoList[]> {
    return localVideoStorage.getLocalLists()
  }

  async createList(data: { name: string; description?: string }): Promise<VideoList> {
    return localVideoStorage.createLocalList(data.name, data.description)
  }

  async getList(listId: string): Promise<VideoList> {
    const list = localVideoStorage.getLocalList(listId)
    if (!list) throw new Error('视频列表不存在')
    return list
  }

  async updateList(listId: string, updates: Partial<VideoList>): Promise<VideoList | null> {
    return localVideoStorage.updateLocalList(listId, updates)
  }

  async deleteList(listId: string): Promise<void> {
    localVideoStorage.deleteLocalList(listId)
  }

  async removeVideo(listId: string, videoId: string): Promise<void> {
    localVideoStorage.removeVideoFromLocalList(listId, videoId)
  }

  async updateVideoClips(request: { listId: string; videoId: string; clips: Record<string, VideoClip> }): Promise<VideoData | null> {
    const list = localVideoStorage.getLocalList(request.listId)
    if (!list) throw new Error('视频列表不存在')
    const video = list.videos.find((v) => v.id === request.videoId)
    if (!video) throw new Error('视频不存在')
    localVideoStorage.updateVideoInLocalList(request.listId, request.videoId, { clips: request.clips })
    return { ...video, clips: request.clips }
  }

  async splitVideoScenes(request: {
    videoPath: string
    sensitivity?: string
    minSceneDuration?: number
    videoId?: string
    startTime?: number
    endTime?: number
    signal?: AbortSignal
  }): Promise<{ scenes: SceneSegmentApi[]; tempDir: string }> {
    const result = await detectScenes(request)
    if (!result.success || !result.scenes) {
      throw new Error(result.error || '视频场景分割失败')
    }
    return { scenes: result.scenes, tempDir: result.tempDir! }
  }

  async checkExistingScenes(request: { videoId: string; videoPath: string; minSceneDuration?: number }): Promise<{ success: boolean; scenes?: SceneSegmentApi[]; tempDir?: string; error?: string }> {
    return checkExistingScenes(request)
  }

  async clearSceneCache(request: { videoId: string }): Promise<{ success: boolean; error?: string }> {
    try {
      await clearSceneCache(request.videoId)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async exportScenes(request: {
    videoPath: string
    scenes: Array<{ startTime: number; endTime: number; outputFileName?: string }>
    options: { quality: Quality; includeAudio: boolean }
    watermarkRegions?: WatermarkRegion[]
    videoWidth?: number
    videoHeight?: number
  }, onProgress?: (p: { progress: number; message: string }) => void): Promise<{ outputPaths: string[] }> {
    const outputDir = await getTempDir('exports/scenes')
    const outputPaths = await exportScenes({ ...request, outputDir }, onProgress)
    return { outputPaths }
  }

  async mergeAndExportScenes(request: {
    videoPath: string
    mergedScene: { startTime: number; endTime: number }
    outputFileName?: string
    options: { format: string; quality: Quality; includeAudio: boolean }
    watermarkRegions?: WatermarkRegion[]
    videoWidth?: number
    videoHeight?: number
  }): Promise<{ outputPath: string; size: number }> {
    const outputDir = await getTempDir('exports/merged')
    const ext = request.options.format || 'mp4'
    const outputFileName = request.outputFileName || `merged_scene_${Date.now()}.${ext}`
    return mergeAndExportScenes({ ...request, outputDir, outputFileName })
  }
}

export const videoEditorApi = new VideoEditorApi()
export default videoEditorApi
