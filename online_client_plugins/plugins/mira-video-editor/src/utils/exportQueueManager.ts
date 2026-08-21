import Queue from 'yocto-queue'
import { v4 as uuidv4 } from 'uuid'
import { exportClip as ffmpegExportClip } from '@/lib/ffmpeg'
import { isHostAvailable } from '@/lib/host'

/**
 * 导出任务类型
 */
export interface ExportTask {
  id: string
  type: 'single' | 'batch'
  inputPath: string
  clips: Array<{
    startTime: number
    endTime: number
    outputPath: string
    desc?: string
    index?: number
  }>
  options?: {
    quality?: 'low' | 'medium' | 'high' | 'original'
    includeAudio?: boolean
    ffmpegPath?: string
    watermarkRegions?: Array<{ x: number; y: number; w: number; h: number }>
    videoWidth?: number
    videoHeight?: number
    forceReencode?: boolean
  }
}

/**
 * 导出任务状态
 */
export interface ExportJob {
  task: ExportTask
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  currentIndex: number
  total: number
  progress: number
  message: string
  error?: string
  completedPaths: string[]
  startTime: number
  endTime?: number
}

/**
 * 导出进度回调
 */
export interface ExportProgressCallback {
  (progress: {
    jobId: string
    taskId: string
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
    currentIndex: number
    total: number
    progress: number
    message: string
    completedPaths: string[]
    timeRemaining?: number
  }): void
}

/**
 * 导出完成回调
 */
export interface ExportCompleteCallback {
  (result: {
    jobId: string
    taskId: string
    status: 'completed' | 'failed' | 'cancelled'
    completedPaths: string[]
    error?: string
  }): void
}

/**
 * 视频导出队列管理器
 * 使用 yocto-queue 管理并发导出任务
 */
export class ExportQueueManager {
  private static instance: ExportQueueManager

  private queue: Queue<ExportJob>
  private jobs: Map<string, ExportJob>
  private concurrent: number
  private running: number
  private isProcessing: boolean
  private isProcessingQueue: boolean
  private abortControllers: Map<string, AbortController>

  // 回调函数
  private onProgressCallbacks: Set<ExportProgressCallback>
  private onCompleteCallbacks: Set<ExportCompleteCallback>

  private constructor(concurrent: number = 1) {
    this.queue = new Queue()
    this.jobs = new Map()
    this.concurrent = concurrent
    this.running = 0
    this.isProcessing = false
    this.isProcessingQueue = false
    this.abortControllers = new Map()
    this.onProgressCallbacks = new Set()
    this.onCompleteCallbacks = new Set()
  }

  /**
   * 获取单例实例
   */
  static getInstance(concurrent: number = 1): ExportQueueManager {
    if (!ExportQueueManager.instance) {
      ExportQueueManager.instance = new ExportQueueManager(concurrent)
    }
    return ExportQueueManager.instance
  }

  /**
   * 设置并发数量
   */
  setConcurrent(concurrent: number): void {
    this.concurrent = Math.max(1, concurrent)
  }

  /**
   * 添加导出任务
   */
  async addTask(task: ExportTask): Promise<string> {
    const jobId = uuidv4()

    const job: ExportJob = {
      task,
      status: 'pending',
      currentIndex: 0,
      total: task.clips.length,
      progress: 0,
      message: '等待处理...',
      completedPaths: [],
      startTime: Date.now()
    }

    this.jobs.set(jobId, job)
    this.queue.enqueue(job)

    this.notifyProgress(job)

    // 如果未在处理，启动处理
    if (!this.isProcessing) {
      this.startProcessing()
    }

    return jobId
  }

  /**
   * 取消任务
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job) return false

    // 如果任务正在运行，中断它
    if (job.status === 'processing' || job.status === 'pending') {
      const controller = this.abortControllers.get(jobId)
      if (controller) {
        controller.abort()
        this.abortControllers.delete(jobId)
      }

      job.status = 'cancelled'
      job.message = '已取消'

      this.notifyProgress(job)
      this.notifyComplete({
        jobId,
        taskId: job.task.id,
        status: 'cancelled',
        completedPaths: job.completedPaths
      })

      return true
    }

    return false
  }

  /**
   * 获取任务状态
   */
  getJob(jobId: string): ExportJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * 获取所有任务
   */
  getAllJobs(): ExportJob[] {
    return Array.from(this.jobs.values())
  }

  /**
   * 获取队列中的任务数
   */
  getQueueSize(): number {
    return this.queue.size
  }

  /**
   * 获取正在运行的任务数
   */
  getRunningCount(): number {
    return this.running
  }

  /**
   * 添加进度监听
   */
  onProgress(callback: ExportProgressCallback): () => void {
    this.onProgressCallbacks.add(callback)
    return () => this.onProgressCallbacks.delete(callback)
  }

  /**
   * 添加完成监听
   */
  onComplete(callback: ExportCompleteCallback): () => void {
    this.onCompleteCallbacks.add(callback)
    return () => this.onCompleteCallbacks.delete(callback)
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    // 取消所有待处理任务
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'pending') {
        this.cancelJob(jobId)
      }
    }
  }

  /**
   * 启动处理队列
   */
  private startProcessing(): void {
    if (this.isProcessing && !this.isProcessingQueue) {
      this.isProcessing = true
    }
    this.processQueue()
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    // 如果已经在处理队列，直接返回（防止重复处理）
    if (this.isProcessingQueue) return

    this.isProcessingQueue = true

    try {
      while (this.queue.size > 0 || this.running > 0) {
        // 检查是否达到并发限制
        if (this.running >= this.concurrent) {
          // 等待其他任务完成
          await new Promise(resolve => setTimeout(resolve, 100))
          continue
        }

        const job = this.queue.dequeue()
        if (!job) {
          // 队列为空但还有任务在运行，等待
          await new Promise(resolve => setTimeout(resolve, 100))
          continue
        }

        // 跳过已取消的任务
        if (job.status === 'cancelled') {
          continue
        }

        this.running++
        this.processJob(job).finally(() => {
          this.running--
          // 任务完成后，不需要手动调用 processQueue
          // 因为循环会自动继续检查队列
        })
      }

      // 如果队列为空且没有运行中的任务，停止处理
      if (this.queue.size === 0 && this.running === 0) {
        this.isProcessing = false
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * 处理单个任务
   */
  private async processJob(job: ExportJob): Promise<void> {
    const jobId = Array.from(this.jobs.entries()).find(([_, j]) => j === job)?.[0]!

    job.status = 'processing'
    job.message = '正在导出...'

    const controller = new AbortController()
    this.abortControllers.set(jobId, controller)

    this.notifyProgress(job)

    try {
      // 检查宿主执行环境是否可用
      if (!isHostAvailable()) {
        throw new Error('导出功能需要在 Mira 客户端的插件窗口中使用')
      }

      // 处理每个片段
      for (let i = 0; i < job.task.clips.length; i++) {
        const clip = job.task.clips[i]

        // 检查是否已取消
        if (controller.signal.aborted) {
          job.status = 'cancelled'
          job.message = '已取消'
          throw new Error('Export cancelled')
        }

        job.currentIndex = i + 1
        job.progress = Math.round((i / job.task.clips.length) * 100)
        job.message = `正在导出 ${clip.desc || `片段 ${i + 1}`} (${i + 1}/${job.task.clips.length})`

        this.notifyProgress(job)

        try {
          // 超时保护（10 分钟）：到时 abort 底层 ffmpeg 进程
          const exportTimeout = 10 * 60 * 1000
          const timeoutTimer = setTimeout(() => controller.abort(), exportTimeout)
          try {
            const outputPath = await ffmpegExportClip({
              inputPath: job.task.inputPath,
              outputPath: clip.outputPath,
              startTime: clip.startTime,
              endTime: clip.endTime,
              quality: job.task.options?.quality || 'original',
              includeAudio: job.task.options?.includeAudio ?? true,
              watermarkRegions: job.task.options?.watermarkRegions,
              videoWidth: job.task.options?.videoWidth || 1920,
              videoHeight: job.task.options?.videoHeight || 1080,
              forceReencode: job.task.options?.forceReencode ?? false,
              signal: controller.signal,
            }, (progress) => {
              const overall = ((i + progress.progress / 100) / job.task.clips.length) * 100
              job.progress = Math.round(overall)
              this.notifyProgress(job)
            })
            job.completedPaths.push(outputPath)
          } finally {
            clearTimeout(timeoutTimer)
          }
        } catch (error) {
          console.error(`导出片段 ${i + 1} 失败:`, error)
          throw error
        }
      }

      // 所有片段导出完成
      job.status = 'completed'
      job.progress = 100
      job.message = `导出完成，共 ${job.task.clips.length} 个片段`
      job.endTime = Date.now()

      this.notifyProgress(job)
      this.notifyComplete({
        jobId,
        taskId: job.task.id,
        status: 'completed',
        completedPaths: job.completedPaths
      })

    } catch (error) {
      // 如果不是取消操作导致的错误
      if (job.status !== 'cancelled') {
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : String(error)
        job.message = `导出失败: ${job.error}`

        this.notifyProgress(job)
        this.notifyComplete({
          jobId,
          taskId: job.task.id,
          status: 'failed',
          completedPaths: job.completedPaths,
          error: job.error
        })
      }
    } finally {
      this.abortControllers.delete(jobId)
      // 队列处理循环会自动继续，无需手动调用
    }
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(job: ExportJob): void {
    const jobId = Array.from(this.jobs.entries()).find(([_, j]) => j === job)?.[0]!

    if (!jobId) return

    // 计算剩余时间（基于已处理的时间）
    let timeRemaining: number | undefined
    if (job.status === 'processing' && job.currentIndex > 0) {
      const elapsed = Date.now() - job.startTime
      const avgTimePerClip = elapsed / job.currentIndex
      const remainingClips = job.total - job.currentIndex
      timeRemaining = Math.round(avgTimePerClip * remainingClips)
    }

    this.onProgressCallbacks.forEach(callback => {
      try {
        callback({
          jobId,
          taskId: job.task.id,
          status: job.status,
          currentIndex: job.currentIndex,
          total: job.total,
          progress: job.progress,
          message: job.message,
          completedPaths: job.completedPaths,
          timeRemaining
        })
      } catch (error) {
        console.error('进度回调执行失败:', error)
      }
    })
  }

  /**
   * 通知任务完成
   */
  private notifyComplete(result: {
    jobId: string
    taskId: string
    status: 'completed' | 'failed' | 'cancelled'
    completedPaths: string[]
    error?: string
  }): void {
    this.onCompleteCallbacks.forEach(callback => {
      try {
        callback(result)
      } catch (error) {
        console.error('完成回调执行失败:', error)
      }
    })
  }

  /**
   * 清理已完成的任务
   */
  cleanupCompletedJobs(olderThanMs: number = 3600000): void {
    const now = Date.now()
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        job.endTime &&
        now - job.endTime > olderThanMs
      ) {
        this.jobs.delete(jobId)
      }
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.clearQueue()
    this.queue.clear()
    this.jobs.clear()
    this.abortControllers.clear()
    this.onProgressCallbacks.clear()
    this.onCompleteCallbacks.clear()
    this.isProcessing = false
    this.isProcessingQueue = false
    this.running = 0
  }
}

// 导出单例实例
export const exportQueueManager = ExportQueueManager.getInstance()
