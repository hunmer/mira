/**
 * ffmpeg / ffprobe / scenedetect 命令构建与结果解析。
 *
 * 迁移自 ai-toolbox 的 Electron 主进程模块（useVideoEditor.ts / useSceneDetect.ts），
 * 命令经宿主受控执行（lib/exec）在本机运行；产物写入插件临时目录
 * （userData/plugin-temp/mira-video-editor/...），前端用 file:// URL 引用。
 */

import { runCommand, getTempDir, readDir, readTextFile, removeTempPath, statPath } from './exec'
import { pathJoin, basename, extname, fromFileUrl, shortHash } from './path'
import type { WatermarkRegion } from '@/types/video-editor'

export type Quality = 'low' | 'medium' | 'high' | 'original'

export interface ExportProgress {
  progress: number
  message: string
  timeRemaining?: number
}

export interface VideoClipOptions {
  inputPath: string
  outputPath: string
  startTime: number
  endTime: number
  quality?: Quality
  includeAudio?: boolean
  watermarkRegions?: WatermarkRegion[]
  videoWidth?: number
  videoHeight?: number
  forceReencode?: boolean
  signal?: AbortSignal
}

/** 归一化输入路径：接受绝对路径 / file:// / local-resource:// */
function normalizeInputPath(inputPath: string): string {
  if (/^(file|local-resource):\/\//i.test(inputPath)) {
    return fromFileUrl(inputPath)
  }
  return inputPath
}

/** 清理文件名：移除特殊字符并限制长度（scenedetect 产物匹配用） */
function sanitizeFileName(fileName: string): string {
  let cleaned = fileName
    .replace(/[｜|]/g, '_')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 42) + '_' + shortHash(fileName)
  }
  return cleaned || 'video'
}

/** 获取视频实际像素尺寸（不考虑 SAR，delogo 用原始像素坐标） */
export async function getVideoDimensions(inputPath: string): Promise<{ width: number; height: number } | null> {
  try {
    const path = normalizeInputPath(inputPath)
    const { stdout } = await runCommand('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path,
    ])
    const parts = stdout.trim().split(',')
    const width = parseInt(parts[0]?.trim(), 10)
    const height = parseInt(parts[1]?.trim(), 10)
    if (!isNaN(width) && !isNaN(height)) return { width, height }
  } catch (error) {
    console.warn('[video-editor] 获取视频尺寸失败:', error)
  }
  return null
}

/** ffprobe 完整元数据（duration/width/height/fps/bitrate/codec/format） */
export async function probeVideo(inputPath: string): Promise<{
  duration: number
  metadata: { width?: number; height?: number; fps?: number; bitrate?: number; codec?: string; format?: string }
}> {
  const path = normalizeInputPath(inputPath)
  const { stdout } = await runCommand('ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path,
  ])
  const info = JSON.parse(stdout)
  const videoStream = (info.streams || []).find((s: any) => s.codec_type === 'video') || {}
  const format = info.format || {}
  let fps: number | undefined
  if (typeof videoStream.r_frame_rate === 'string' && videoStream.r_frame_rate.includes('/')) {
    const [num, den] = videoStream.r_frame_rate.split('/').map(Number)
    if (den > 0 && num > 0) fps = num / den
  }
  return {
    duration: parseFloat(format.duration) || parseFloat(videoStream.duration) || 0,
    metadata: {
      width: videoStream.width,
      height: videoStream.height,
      fps,
      bitrate: parseInt(format.bit_rate, 10) || undefined,
      codec: videoStream.codec_name,
      format: (format.format_name || '').split(',')[0],
    },
  }
}

/** 构建多个 delogo 滤镜（归一化坐标 × 实际像素，保留 3 位小数） */
export function buildDelogoFilter(
  regions: WatermarkRegion[],
  videoWidth: number,
  videoHeight?: number,
): string {
  if (regions.length === 0) return ''
  const pixelRegions = regions.map((r) => ({
    x: parseFloat((r.x * videoWidth).toFixed(3)),
    y: videoHeight ? parseFloat((r.y * videoHeight).toFixed(3)) : parseFloat((r.y * videoWidth).toFixed(3)),
    w: parseFloat((r.w * videoWidth).toFixed(3)),
    h: videoHeight ? parseFloat((r.h * videoHeight).toFixed(3)) : parseFloat((r.h * videoWidth).toFixed(3)),
  }))
  return pixelRegions.map((r) => `delogo=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}`).join(',')
}

/** 应用质量参数（与原版一致的码率映射） */
function applyQualityArgs(args: string[], quality: Quality, forceReencode?: boolean): void {
  if (quality === 'low') {
    args.push('-b:v', '500k', '-b:a', '64k')
  } else if (quality === 'medium') {
    args.push('-b:v', '1000k', '-b:a', '128k')
  } else if (quality === 'high') {
    args.push('-b:v', '2500k', '-b:a', '192k')
  } else if (forceReencode) {
    args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-c:a', 'aac', '-b:a', '192k')
  } else {
    // original：流复制保持原始质量与速度
    args.push('-c', 'copy')
  }
}

/** 从 ffmpeg stderr 解析 time= 并回调进度 */
function makeProgressParser(duration: number, onProgress?: (p: ExportProgress) => void): (chunk: string) => void {
  if (!onProgress) return () => undefined
  return (chunk: string) => {
    const timeMatch = chunk.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
    if (timeMatch) {
      const currentTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3])
      const progress = Math.min((currentTime / duration) * 100, 100)
      onProgress({
        progress,
        message: `正在处理: ${progress.toFixed(1)}%`,
        timeRemaining: duration - currentTime,
      })
    }
  }
}

/** 导出单个片段（裁切 + 可选 delogo 去水印） */
export async function exportClip(options: VideoClipOptions, onProgress?: (p: ExportProgress) => void): Promise<string> {
  const inputPath = normalizeInputPath(options.inputPath)
  const duration = options.endTime - options.startTime
  if (duration <= 0) throw new Error('片段时长必须大于 0')

  const args: string[] = [
    '-y',
    '-ss', options.startTime.toString(),
    '-i', inputPath,
    '-t', duration.toString(),
  ]
  applyQualityArgs(args, options.quality || 'original', options.forceReencode)

  // 水印去除（delogo 滤镜需要重编码）
  if (options.watermarkRegions && options.watermarkRegions.length > 0) {
    const actual = await getVideoDimensions(inputPath)
    const videoWidth = actual?.width || options.videoWidth
    const videoHeight = actual?.height || options.videoHeight
    if (videoWidth && videoHeight) {
      const filter = buildDelogoFilter(options.watermarkRegions, videoWidth, videoHeight)
      if (filter) {
        if (options.quality === 'original' || !options.quality) {
          const copyIndex = args.indexOf('-c')
          if (copyIndex !== -1) args.splice(copyIndex, 2)
          args.push('-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-c:a', 'aac', '-b:a', '192k')
        }
        args.push('-vf', filter)
      }
    } else {
      console.warn('[video-editor] 水印处理跳过: 缺少视频尺寸')
    }
  }

  if (options.includeAudio === false) {
    args.push('-an')
  }

  // WebM(VP9/Opus) → MP4 容器不兼容，需转码
  const isWebmInput = inputPath.toLowerCase().endsWith('.webm')
  const isMp4Output = options.outputPath.toLowerCase().endsWith('.mp4')
  const copyIndex = args.indexOf('-c')
  const usesCopyCodec = copyIndex !== -1 && args[copyIndex + 1] === 'copy'
  if (isWebmInput && isMp4Output && usesCopyCodec) {
    args.splice(copyIndex, 2)
    args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k')
  }

  args.push(options.outputPath)

  await runCommand('ffmpeg', args, { onStderr: makeProgressParser(duration, onProgress), signal: options.signal })
  onProgress?.({ progress: 100, message: '导出完成' })
  return options.outputPath
}

/** 单帧截图（片段封面；宽高缺省保持原始尺寸） */
export async function generateThumbnail(options: {
  inputPath: string
  outputPath: string
  timestamp: number
  width?: number
  height?: number
}): Promise<string> {
  const inputPath = normalizeInputPath(options.inputPath)
  const args: string[] = [
    '-y',
    '-ss', options.timestamp.toString(),
    '-i', inputPath,
    '-vframes', '1',
  ]
  if (options.width || options.height) {
    args.push('-vf', `scale=${options.width || -1}:${options.height || -1}`)
  }
  args.push(options.outputPath)
  await runCommand('ffmpeg', args)
  return options.outputPath
}

/** 生成去水印预览截图（单帧 + delogo） */
export async function generateWatermarkPreview(options: {
  inputPath: string
  outputPath: string
  timestamp: number
  width?: number
  height?: number
  regions: WatermarkRegion[]
}): Promise<string> {
  const inputPath = normalizeInputPath(options.inputPath)
  const args: string[] = [
    '-y',
    '-ss', options.timestamp.toString(),
    '-i', inputPath,
    '-vframes', '1',
  ]
  if (options.regions && options.regions.length > 0) {
    const actual = await getVideoDimensions(inputPath)
    const videoWidth = actual?.width || options.width
    const videoHeight = actual?.height || options.height
    if (videoWidth && videoHeight) {
      const filter = buildDelogoFilter(options.regions, videoWidth, videoHeight)
      if (filter) args.push('-vf', filter)
    }
  }
  args.push(options.outputPath)
  await runCommand('ffmpeg', args)
  return options.outputPath
}

/** 批量逐秒缩略图：输出 <outputDir>/1.jpg, 2.jpg ...（文件名即秒序号） */
export async function generateAllThumbnails(options: {
  inputPath: string
  outputDir: string
  fps?: number
  width?: number
  height?: number
  maxThumbnails?: number
  signal?: AbortSignal
}, onProgress?: (p: { current: number; total: number; message: string }) => void): Promise<string[]> {
  const inputPath = normalizeInputPath(options.inputPath)
  const fps = options.fps || 1
  const width = options.width || 160
  const height = options.height || 90
  const maxThumbs = options.maxThumbnails || 1000

  const args: string[] = [
    '-y',
    '-i', inputPath,
    '-vf', `fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    '-frames:v', maxThumbs.toString(),
    pathJoin(options.outputDir, '%d.jpg'),
  ]

  await runCommand('ffmpeg', args, {
    signal: options.signal,
    onStderr: (chunk: string) => {
      const frameMatch = chunk.match(/frame=\s*(\d+)/)
      if (frameMatch && onProgress) {
        const generated = parseInt(frameMatch[1], 10)
        onProgress({ current: generated, total: maxThumbs, message: `正在生成缩略图: ${generated} 帧` })
      }
    },
  })

  const files = await readDir(options.outputDir)
  return files
    .filter((f) => f.endsWith('.jpg'))
    .sort((a, b) => parseInt(a.replace('.jpg', ''), 10) - parseInt(b.replace('.jpg', ''), 10))
    .map((f) => pathJoin(options.outputDir, f))
}

// ---------- PySceneDetect 场景检测 ----------

export interface SceneSegmentApi {
  startTime: number
  endTime: number
  thumbnail?: string
}

export interface SceneDetectResult {
  success: boolean
  scenes?: SceneSegmentApi[]
  tempDir?: string
  error?: string
}

async function findSceneListFile(tempDir: string, originalVideoName: string): Promise<string | null> {
  try {
    const files = await readDir(tempDir)
    const csvFiles = files.filter((file) => file.endsWith('-Scenes.csv'))
    if (csvFiles.length === 1) return pathJoin(tempDir, csvFiles[0])
    const sanitizedName = sanitizeFileName(originalVideoName)
    const matchingFile = csvFiles.find(
      (file) => file.includes(sanitizedName) || file.includes(originalVideoName.substring(0, 10)),
    )
    if (matchingFile) return pathJoin(tempDir, matchingFile)
    if (csvFiles.length > 0) return pathJoin(tempDir, csvFiles[0])
    return null
  } catch (error) {
    console.error('[video-editor] 查找场景列表文件失败:', error)
    return null
  }
}

/** 解析 PySceneDetect 的 Scenes CSV（列 3=start 秒，列 6=end 秒） */
async function parseSceneList(sceneListPath: string): Promise<SceneSegmentApi[]> {
  const content = await readTextFile(sceneListPath)
  const lines = content.split('\n').filter((line) => line.trim())
  const scenes: SceneSegmentApi[] = []
  for (const rawLine of lines) {
    const line = rawLine.trim().replace(/\r/g, '')
    if (line.startsWith('Timecode List:') || line.startsWith('Scene Number') || line.includes('Start Frame')) continue
    const parts = line.split(',')
    if (parts.length >= 7) {
      const startTimeSeconds = parseFloat(parts[3].trim())
      const endTimeSeconds = parseFloat(parts[6].trim())
      if (!isNaN(startTimeSeconds) && !isNaN(endTimeSeconds) && endTimeSeconds > startTimeSeconds) {
        scenes.push({ startTime: startTimeSeconds, endTime: endTimeSeconds })
      }
    }
  }
  return scenes
}

/** 为过滤后的场景匹配 save-images 产物缩略图（文件名-Scene-NNN-01.jpg） */
async function matchSceneThumbnails(tempDir: string, scenes: SceneSegmentApi[]): Promise<void> {
  const files = await readDir(tempDir)
  const fallbackPattern = /-Scene-\d+-01\.jpg$/
  const fallbackFiles = files.filter((file) => fallbackPattern.test(file))
  scenes.forEach((scene, index) => {
    const sceneNumber = String(index + 1).padStart(3, '0')
    const exact = files.find((file) => new RegExp(`-Scene-${sceneNumber}-01\\.jpg$`).test(file))
    const matched = exact || fallbackFiles[index]
    if (matched) scene.thumbnail = pathJoin(tempDir, matched)
  })
}

function filterMinDuration(scenes: SceneSegmentApi[], minSceneDuration: number): SceneSegmentApi[] {
  return scenes.filter((scene) => scene.endTime - scene.startTime >= minSceneDuration)
}

/** 场景检测缓存目录 */
async function sceneCacheDir(videoId: string): Promise<string> {
  return getTempDir(`scenedetect_${videoId}`)
}

/** 执行 PySceneDetect 场景检测 */
export async function detectScenes(options: {
  videoPath: string
  minSceneDuration?: number
  videoId?: string
  startTime?: number
  endTime?: number
  signal?: AbortSignal
}): Promise<SceneDetectResult> {
  const { videoPath, minSceneDuration = 3, videoId, startTime, endTime, signal } = options
  const inputPath = normalizeInputPath(videoPath)

  const stat = await statPath(inputPath)
  if (!stat.exists || !stat.isFile) {
    return { success: false, error: `视频文件不存在或无法访问: ${inputPath}` }
  }

  try {
    const outputDir = await sceneCacheDir(videoId || String(Date.now()))
    const originalVideoName = basename(inputPath, extname(inputPath).slice(1))

    const args: string[] = ['-i', inputPath]
    if (typeof startTime === 'number' && typeof endTime === 'number') {
      args.push('time', '--start', startTime.toString(), '--end', endTime.toString())
    }
    args.push('list-scenes', 'save-images', '--output', outputDir)

    await runCommand('scenedetect', args, { cwd: outputDir, timeoutMs: 2 * 60 * 60 * 1000, signal })

    const sceneListPath = await findSceneListFile(outputDir, originalVideoName)
    if (!sceneListPath) return { success: false, error: '未找到场景列表文件' }

    const scenes = await parseSceneList(sceneListPath)
    if (scenes.length === 0) return { success: false, error: '未检测到任何场景' }

    const filtered = filterMinDuration(scenes, minSceneDuration)
    await matchSceneThumbnails(outputDir, filtered)

    return { success: true, scenes: filtered, tempDir: outputDir }
  } catch (error) {
    return { success: false, error: `场景检测失败: ${(error as Error).message}` }
  }
}

/** 读取已有场景缓存（不重新检测） */
export async function checkExistingScenes(options: {
  videoId: string
  videoPath: string
  minSceneDuration?: number
}): Promise<SceneDetectResult> {
  const { videoId, videoPath, minSceneDuration = 3 } = options
  try {
    const outputDir = await sceneCacheDir(videoId)
    const stat = await statPath(outputDir)
    if (!stat.exists) return { success: false, error: '没有找到现有的场景数据' }

    const originalVideoName = basename(normalizeInputPath(videoPath), extname(videoPath).slice(1))
    const sceneListPath = await findSceneListFile(outputDir, originalVideoName)
    if (!sceneListPath) return { success: false, error: '没有找到场景列表文件' }

    const scenes = await parseSceneList(sceneListPath)
    if (scenes.length === 0) return { success: false, error: '场景列表为空' }

    const filtered = filterMinDuration(scenes, minSceneDuration)
    await matchSceneThumbnails(outputDir, filtered)
    return { success: true, scenes: filtered, tempDir: outputDir }
  } catch (error) {
    return { success: false, error: `检查现有场景数据失败: ${(error as Error).message}` }
  }
}

/** 清除场景检测缓存目录 */
export async function clearSceneCache(videoId: string): Promise<void> {
  const dir = await sceneCacheDir(videoId)
  await removeTempPath(dir)
}

/** 合并并导出场景片段（本质上是一次跨多个场景的裁切） */
export async function mergeAndExportScenes(params: {
  videoPath: string
  mergedScene: { startTime: number; endTime: number }
  outputDir: string
  outputFileName: string
  options: { format: string; quality: Quality; includeAudio: boolean }
  watermarkRegions?: WatermarkRegion[]
  videoWidth?: number
  videoHeight?: number
}, onProgress?: (p: ExportProgress) => void): Promise<{ outputPath: string; size: number }> {
  const inputPath = normalizeInputPath(params.videoPath)
  const outputPath = pathJoin(params.outputDir, params.outputFileName)

  const args: string[] = [
    '-y',
    '-ss', params.mergedScene.startTime.toString(),
    '-i', inputPath,
    '-t', (params.mergedScene.endTime - params.mergedScene.startTime).toString(),
  ]
  if (params.options.quality === 'low') {
    args.push('-b:v', '500k', '-b:a', '64k')
  } else if (params.options.quality === 'medium') {
    args.push('-b:v', '1000k', '-b:a', '128k')
  } else if (params.options.quality === 'high') {
    args.push('-b:v', '2500k', '-b:a', '192k')
  } else {
    // original：视频流复制，音频重编码 aac（兼容 opus → mp4）
    args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k')
  }

  if (params.watermarkRegions && params.watermarkRegions.length > 0 && params.videoWidth && params.videoHeight) {
    const filter = buildDelogoFilter(params.watermarkRegions, params.videoWidth, params.videoHeight)
    if (filter) {
      if (params.options.quality === 'original' || !params.options.quality) {
        const cvIndex = args.indexOf('-c:v')
        if (cvIndex !== -1) args.splice(cvIndex, 6)
        args.push('-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-c:a', 'aac', '-b:a', '192k')
      }
      args.push('-vf', filter)
    }
  }

  if (params.options.includeAudio === false) {
    args.push('-an')
  }

  args.push(outputPath)

  const duration = params.mergedScene.endTime - params.mergedScene.startTime
  await runCommand('ffmpeg', args, { onStderr: makeProgressParser(duration, onProgress) })

  const stat = await statPath(outputPath)
  return { outputPath, size: stat.size || 0 }
}

/** 导出多个场景片段（逐段裁切到输出目录） */
export async function exportScenes(params: {
  videoPath: string
  scenes: Array<{ startTime: number; endTime: number; outputFileName?: string }>
  outputDir: string
  options: { quality: Quality; includeAudio: boolean }
  watermarkRegions?: WatermarkRegion[]
  videoWidth?: number
  videoHeight?: number
}, onProgress?: (p: ExportProgress) => void): Promise<string[]> {
  const outputPaths: string[] = []
  const total = params.scenes.length
  for (let i = 0; i < total; i++) {
    const scene = params.scenes[i]
    onProgress?.({ progress: (i / total) * 100, message: `正在导出片段 ${i + 1}/${total}` })
    const outputPath = await exportClip({
      inputPath: params.videoPath,
      outputPath: pathJoin(params.outputDir, scene.outputFileName || `scene_${i + 1}_${scene.startTime.toFixed(1)}s.mp4`),
      startTime: scene.startTime,
      endTime: scene.endTime,
      quality: params.options.quality,
      includeAudio: params.options.includeAudio,
      watermarkRegions: params.watermarkRegions,
      videoWidth: params.videoWidth,
      videoHeight: params.videoHeight,
    })
    outputPaths.push(outputPath)
  }
  onProgress?.({ progress: 100, message: '导出完成' })
  return outputPaths
}
