import { ipcMain, BrowserWindow, nativeImage } from 'electron'
import { existsSync } from 'fs'
import path from 'path'
import { app } from 'electron'

/**
 * 拖拽处理器
 * 处理文件拖拽功能，支持本地文件和SMB路径
 */
export class DragDropHandler {
  // 文件扩展名到图标的映射表
  private static readonly EXTENSION_ICON_MAP = new Map<string, string>([
    // 图片文件
    ['.jpg', 'JPG.png'],
    ['.jpeg', 'JPG.png'],
    ['.png', 'PNG.png'],
    ['.gif', 'GIFF.png'],
    ['.bmp', 'BMP.png'],
    ['.tiff', 'TIFF.png'],
    ['.tif', 'TIFF.png'],
    ['.svg', 'SVG.png'],
    ['.raw', 'RAW.png'],
    ['.webp', 'PNG.png'], // 使用 PNG 图标作为 WebP 的替代

    // 视频文件
    ['.mp4', 'MP4.png'],
    ['.avi', 'AVI.png'],
    ['.mov', 'MOV.png'],
    ['.mpeg', 'MPEG.png'],
    ['.mpg', 'MPEG.png'],
    ['.flv', 'FLV.png'],
    ['.wmv', 'MP4.png'], // 使用 MP4 图标作为 WMV 的替代
    ['.mkv', 'MP4.png'], // 使用 MP4 图标作为 MKV 的替代

    // 音频文件
    ['.mp3', 'MP3.png'],
    ['.wav', 'WAV.png'],
    ['.wma', 'WMA.png'],
    ['.mid', 'MID.png'],
    ['.midi', 'MID.png'],
    ['.flac', 'WAV.png'], // 使用 WAV 图标作为 FLAC 的替代
    ['.aac', 'MP3.png'], // 使用 MP3 图标作为 AAC 的替代

    // 文档文件
    ['.pdf', 'PDF.png'],
    ['.doc', 'DOC.png'],
    ['.docx', 'DOCX.png'],
    ['.txt', 'TXT.png'],
    ['.rtf', 'TXT.png'], // 使用 TXT 图标作为 RTF 的替代
    ['.ppt', 'PPT.png'],
    ['.pptx', 'PPT.png'],
    ['.xls', 'CSV.png'], // 使用 CSV 图标作为 XLS 的替代
    ['.xlsx', 'CSV.png'], // 使用 CSV 图标作为 XLSX 的替代
    ['.csv', 'CSV.png'],

    // 网页和标记语言文件
    ['.html', 'HTML.png'],
    ['.htm', 'HTML.png'],
    ['.xml', 'XML.png'],
    ['.xsl', 'XSL.png'],
    ['.rss', 'RSS.png'],

    // 设计文件
    ['.psd', 'PSD.png'],
    ['.ai', 'AI.png'],
    ['.eps', 'EPS.png'],
    ['.dwg', 'DWG.png'],

    // 压缩文件
    ['.zip', 'ZIP.png'],
    ['.rar', 'RAR.png'],
    ['.7z', 'ZIP.png'], // 使用 ZIP 图标作为 7Z 的替代
    ['.tar', 'ZIP.png'], // 使用 ZIP 图标作为 TAR 的替代
    ['.gz', 'ZIP.png'], // 使用 ZIP 图标作为 GZ 的替代

    // 程序和系统文件
    ['.exe', 'EXE.png'],
    ['.dll', 'DLL.png'],
    ['.java', 'JAVA.png'],
    ['.js', 'HTML.png'], // 使用 HTML 图标作为 JS 的替代
    ['.css', 'HTML.png'], // 使用 HTML 图标作为 CSS 的替代

    // 数据库文件
    ['.mdb', 'MDB.png'],
    ['.db', 'MDB.png'], // 使用 MDB 图标作为 DB 的替代

    // 光盘镜像文件
    ['.iso', 'ISO.png'],

    // 其他文件
    ['.pub', 'PUB.png'],
    ['.ps', 'PS.png'],
    ['.crd', 'CRD.png']
  ])

  constructor() {
    this.registerHandlers()
  }

  /**
   * 注册拖拽相关的IPC处理器
   */
  registerHandlers(): void {
    // 开始单个文件拖拽
    ipcMain.handle('drag-drop:start', this.handleStartDrag.bind(this))

    // 开始多个文件拖拽
    ipcMain.handle('drag-drop:start-multiple', this.handleStartDragMultiple.bind(this))
  }

  /**
   * 处理单个文件拖拽 - 使用 Electron 原生拖放 API
   */
  private async handleStartDrag(event: any, filePath: string, iconInfo?: { iconPath?: string; iconType?: string }): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('🖱️ 开始 Electron 原生文件拖拽:', filePath)
      console.log('📋 接收到的图标信息:', iconInfo)

      // 验证文件路径
      const validatedPath = this.validateAndConvertPath(filePath)
      if (!validatedPath) {
        return {
          success: false,
          message: `无效的文件路径: ${filePath}`
        }
      }

      // 获取发送请求的窗口（更准确）
      const senderWindow = BrowserWindow.fromWebContents(event.sender)
      const targetWindow = senderWindow ?? BrowserWindow.getFocusedWindow()
      if (!targetWindow) {
        return { success: false, message: '没有找到目标窗口' }
      }

      const icon = this.resolveDragIcon(validatedPath, iconInfo) ?? this.getRequiredIcon(validatedPath)
      targetWindow.webContents.startDrag({ file: validatedPath, icon })

      console.log('✅ Electron 原生拖拽操作已启动:', validatedPath)
      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Electron 原生拖拽操作失败:', errorMessage)
      return {
        success: false,
        message: errorMessage
      }
    }
  }

  /**
   * 处理多个文件拖拽 - 使用 Electron 原生拖放 API
   */
  private async handleStartDragMultiple(event: any, filePaths: string[], iconInfo?: { iconPath?: string; iconType?: string }): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('🖱️ 开始 Electron 原生多文件拖拽:', filePaths)
      console.log('📋 接收到的图标信息:', iconInfo)

      // 验证所有文件路径
      const validatedPaths = filePaths
        .map(path => this.validateAndConvertPath(path))
        .filter(path => path !== null) as string[]

      if (validatedPaths.length === 0) {
        return {
          success: false,
          message: '没有有效的文件路径'
        }
      }

      // 获取发送请求的窗口（更准确）
      const senderWindow = BrowserWindow.fromWebContents(event.sender)
      const targetWindow = senderWindow ?? BrowserWindow.getFocusedWindow()
      if (!targetWindow) {
        return { success: false, message: '没有找到目标窗口' }
      }

      const icon = this.resolveDragIcon(validatedPaths[0], iconInfo) ?? this.getRequiredIcon(validatedPaths[0])

      if (validatedPaths.length === 1) {
        targetWindow.webContents.startDrag({ file: validatedPaths[0], icon })
      } else {
        targetWindow.webContents.startDrag({ files: validatedPaths, icon })
      }

      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Electron 原生多文件拖拽操作失败:', errorMessage)
      return {
        success: false,
        message: errorMessage
      }
    }
  }


  /**
   * 验证并转换文件路径
   */
  private validateAndConvertPath(filePath: string): string | null {
    try {
      let normalizedPath = filePath

      // 处理 file:// URL：解码并转为本地路径
      if (normalizedPath.startsWith('file://')) {
        normalizedPath = decodeURIComponent(normalizedPath.slice('file://'.length))
        // file://192.168.1.200/path -> \\192.168.1.200\path (UNC)
        if (/^file:\/\/[^/]/i.test(filePath)) {
          normalizedPath = normalizedPath.replace(/\//g, '\\')
          if (!normalizedPath.startsWith('\\\\')) {
            normalizedPath = '\\\\' + normalizedPath
          }
        }
        // file:///C:/path -> C:\path (本地)
        else if (/^file:\/\/\/[A-Za-z]:/i.test(filePath)) {
          normalizedPath = normalizedPath.replace(/\//g, '\\')
        }
      }

      // 处理SMB路径
      if (normalizedPath.startsWith('\\\\') || normalizedPath.startsWith('smb://')) {
        return this.convertSmbToLocalPath(normalizedPath)
      }

      // 处理本地路径
      if (existsSync(normalizedPath)) {
        return path.resolve(normalizedPath)
      }

      // 处理相对路径
      const absolutePath = path.resolve(normalizedPath)
      if (existsSync(absolutePath)) {
        return absolutePath
      }

      console.warn('⚠️ 文件不存在:', normalizedPath)
      return null

    } catch (error) {
      console.error('❌ 路径验证失败:', error)
      return null
    }
  }

  /**
   * 将 file:// URL 转为本地路径（处理 URL 编码和 UNC 路径）
   */
  private fileUrlToLocalPath(fileUrl: string): string | null {
    try {
      let localPath = decodeURIComponent(fileUrl.slice('file://'.length))
      // file://host/path -> \\host\path
      if (/^file:\/\/[^/]/i.test(fileUrl)) {
        localPath = localPath.replace(/\//g, '\\')
        if (!localPath.startsWith('\\\\')) {
          localPath = '\\\\' + localPath
        }
      }
      // file:///C:/path -> C:\path
      else if (/^file:\/\/\/[A-Za-z]:/i.test(fileUrl)) {
        localPath = localPath.replace(/\//g, '\\')
      }
      return localPath
    } catch {
      return null
    }
  }

  /**
   * 转换SMB路径为本地路径
   */
  private convertSmbToLocalPath(smbPath: string): string | null {
    try {
      let convertedPath = smbPath

      // 转换smb://格式到UNC格式
      if (smbPath.startsWith('smb://')) {
        convertedPath = smbPath.replace('smb://', '\\\\').replace(/\//g, '\\')
      }

      // 在Windows上，UNC路径应该可以直接使用
      if (process.platform === 'win32') {
        // Windows UNC路径
        return convertedPath
      } else {
        // 在macOS和Linux上，需要检查是否已挂载
        // 这里可以添加更复杂的挂载点检测逻辑
        console.warn('⚠️ 非Windows平台的SMB路径支持有限:', smbPath)
        return null
      }

    } catch (error) {
      console.error('❌ SMB路径转换失败:', error)
      return null
    }
  }

  /**
   * 解析拖拽图标 - 支持从元素提取或使用默认图标
   */
  private resolveDragIcon(filePath: string, iconInfo?: { iconPath?: string; iconType?: string }): string | undefined {
    try {
      // 1. 优先使用从元素中提取的图标
      if (iconInfo?.iconPath) {
        console.log(`🎯 使用检测到的${iconInfo.iconType}图标:`, iconInfo.iconPath)

        // 处理不同类型的图标路径
        if (iconInfo.iconPath.startsWith('data:')) {
          // Base64 图片数据，创建临时文件或直接使用
          const result = this.handleBase64Icon(iconInfo.iconPath)
          if (result) return result
          // 如果处理失败（如 SVG 不支持），继续尝试默认图标
        } else if (iconInfo.iconPath.startsWith('http://') || iconInfo.iconPath.startsWith('https://')) {
          // 网络图片，需要下载或使用缓存
          return this.handleNetworkIcon(iconInfo.iconPath)
        } else if (iconInfo.iconPath.startsWith('file://')) {
          // 本地文件 URL - 需要解码并处理 UNC 路径
          const localPath = this.fileUrlToLocalPath(iconInfo.iconPath)
          if (localPath && existsSync(localPath)) {
            console.log('📁 使用本地文件URL图标:', localPath)
            return this.resizeIconForDrag(localPath)
          }
        } else {
          // 相对路径或绝对路径
          const absolutePath = path.resolve(iconInfo.iconPath)
          if (existsSync(absolutePath)) {
            console.log('📁 使用本地文件路径图标:', absolutePath)
            return this.resizeIconForDrag(absolutePath)
          }
        }
      }

      // 2. 回退到基于文件类型的默认图标
      return this.getDefaultDragIcon(filePath)

    } catch (error) {
      console.error('❌ 解析拖拽图标失败:', error)
      return this.getDefaultDragIcon(filePath)
    }
  }

  /**
   * 处理 Base64 图标
   */
  private handleBase64Icon(base64Data: string): string | undefined {
    try {
      // SVG data URI 不被 nativeImage 支持，直接跳过使用默认图标
      if (base64Data.startsWith('data:image/svg')) {
        console.log('⚠️ SVG data URI 不被支持，使用默认图标')
        return undefined
      }

      // 创建 NativeImage 并保存为临时文件
      const image = nativeImage.createFromDataURL(base64Data)
      if (image.isEmpty()) {
        console.warn('⚠️ Base64 图片数据无效')
        return undefined
      }

      // 获取图片尺寸
      const imageSize = image.getSize()
      console.log(`🖼️ Base64图标尺寸: ${imageSize.width}x${imageSize.height}`)

      // 缩放到合适的拖拽尺寸
      const targetSize = 48
      let finalImage = image

      if (imageSize.width > targetSize || imageSize.height > targetSize) {
        const scale = Math.min(targetSize / imageSize.width, targetSize / imageSize.height)
        const newWidth = Math.round(imageSize.width * scale)
        const newHeight = Math.round(imageSize.height * scale)

        console.log(`🔄 缩放Base64图标到: ${newWidth}x${newHeight}`)
        finalImage = image.resize({ width: newWidth, height: newHeight })
      }

      // 保存到临时目录
      const tempDir = app.getPath('temp')
      const tempIconPath = path.join(tempDir, `mira-drag-icon-base64-${Date.now()}.png`)

      require('fs').writeFileSync(tempIconPath, finalImage.toPNG())
      console.log('💾 Base64图标已保存到临时文件:', tempIconPath)

      return tempIconPath
    } catch (error) {
      console.error('❌ 处理Base64图标失败:', error)
      return undefined
    }
  }

  /**
   * 处理网络图标
   */
  private handleNetworkIcon(iconUrl: string): string | undefined {
    try {
      // 对于网络图片，我们可以尝试下载或使用缓存
      // 目前先返回 undefined，让系统使用默认图标
      console.log('🌐 网络图片暂不支持，使用默认图标:', iconUrl)
      return this.getDefaultDragIcon(iconUrl)
    } catch (error) {
      console.error('❌ 处理网络图标失败:', error)
      return undefined
    }
  }

  /**
   * 缩放图标到拖拽合适的尺寸
   */
  private resizeIconForDrag(iconPath: string, targetSize: number = 48): string | undefined {
    try {
      // 创建 NativeImage 对象
      const originalImage = nativeImage.createFromPath(iconPath)

      if (originalImage.isEmpty()) {
        console.warn('⚠️ 无法加载图标文件:', iconPath)
        return undefined
      }

      // 获取原始尺寸
      const originalSize = originalImage.getSize()
      console.log(`🖼️ 原始图标尺寸: ${originalSize.width}x${originalSize.height}`)

      // 如果图标尺寸已经合适，直接返回原路径
      if (originalSize.width <= targetSize && originalSize.height <= targetSize) {
        console.log('✅ 图标尺寸已经合适，无需缩放')
        return iconPath
      }

      // 计算缩放比例，保持宽高比
      const scale = Math.min(targetSize / originalSize.width, targetSize / originalSize.height)
      const newWidth = Math.round(originalSize.width * scale)
      const newHeight = Math.round(originalSize.height * scale)

      console.log(`🔄 缩放图标到: ${newWidth}x${newHeight} (目标: ${targetSize}px)`)

      // 创建缩放后的图像
      const resizedImage = originalImage.resize({ width: newWidth, height: newHeight })

      // 保存到临时文件
      const tempDir = app.getPath('temp')
      const tempIconPath = path.join(tempDir, `mira-drag-icon-resized-${Date.now()}.png`)

      require('fs').writeFileSync(tempIconPath, resizedImage.toPNG())
      console.log('💾 缩放后的图标已保存到:', tempIconPath)

      return tempIconPath

    } catch (error) {
      console.error('❌ 缩放图标失败:', error)
      return undefined
    }
  }

  /**
   * 获取一个保证非空的拖拽图标（Electron startDrag 要求 icon 必填）
   */
  private getRequiredIcon(filePath: string): Electron.NativeImage {
    const iconPath = this.getDefaultDragIcon(filePath)
    if (iconPath) {
      return nativeImage.createFromPath(iconPath)
    }
    // 最终兜底：1x1 透明像素
    return nativeImage.createEmpty()
  }

  /**
   * 获取资源目录路径 - 兼容开发环境和打包后环境
   */
  private getResourcesPath(): string {
    if (app.isPackaged) {
      // 打包后使用 process.resourcesPath
      return process.resourcesPath
    } else {
      // 开发环境：使用 app.getAppPath() 或 __dirname 来定位
      // __dirname 指向编译后的 main 进程目录
      const appPath = app.getAppPath()
      console.log('📁 开发环境资源路径:', appPath)
      return appPath
    }
  }

  /**
   * 获取默认拖拽图标 - 基于 assets/ext_icons 文件夹的图标映射
   */
  private getDefaultDragIcon(filePath: string): string | undefined {
    try {
      const ext = path.extname(filePath).toLowerCase()

      // 从 Map 中获取对应的图标文件名
      const iconFileName = DragDropHandler.EXTENSION_ICON_MAP.get(ext) || 'FILE.png'

      // 使用正确的资源路径(开发环境和打包后都能正常工作)
      const resourcesPath = this.getResourcesPath()
      const iconAbsolutePath = path.join(resourcesPath, 'assets', 'ext_icons', iconFileName)

      // 检查图标文件是否存在
      if (existsSync(iconAbsolutePath)) {
        console.log(`📂 找到 assets/ext_icons 图标 [${ext}]: ${iconAbsolutePath}`)
        // 缩放图标到拖拽合适的尺寸
        return this.resizeIconForDrag(iconAbsolutePath)
      } else {
        // 如果找不到特定图标，尝试使用默认的 FILE.png
        const defaultIconPath = path.join(resourcesPath, 'assets', 'ext_icons', 'FILE.png')
        if (existsSync(defaultIconPath)) {
          console.log(`📂 使用默认 FILE.png 图标: ${defaultIconPath}`)
          // 缩放默认图标到拖拽合适的尺寸
          return this.resizeIconForDrag(defaultIconPath)
        } else {
          console.log('⚠️ assets/ext_icons 图标文件不存在，创建占位图标')
          console.log(`   资源路径: ${resourcesPath}`)
          console.log(`   isPackaged: ${app.isPackaged}`)
          // 创建一个简单的占位图标
          return this.createPlaceholderIcon()
        }
      }

    } catch (error) {
      console.error('❌ 获取默认拖拽图标失败:', error)
      return this.createPlaceholderIcon()
    }
  }

  /**
   * 创建占位图标 - 当无法找到图标文件时使用
   */
  private createPlaceholderIcon(): string | undefined {
    try {
      // 尝试创建一个简单的纯色图标
      // 使用一个预定义的小型 PNG 图标数据（48x48 灰色方块）
      const tempDir = app.getPath('temp')
      const tempIconPath = path.join(tempDir, `mira-drag-placeholder.png`)

      // 如果已存在，直接返回
      if (existsSync(tempIconPath)) {
        return tempIconPath
      }

      // 创建一个简单的 48x48 灰色 PNG 图标
      // 这是一个最小的有效 PNG 文件（1x1 灰色像素）
      const grayPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA' +
        'B3RJTUUH4QcIDignCoM9NQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUH' +
        'AAAAa0lEQVRo3u3YwQ2AIBAEUOr/1mBjdZWwYQMhAQihPnZ+8i/z8sK+AwAAAAAAAPA/OnJ7cqIn' +
        'R+7sKCc3Gh49k5/+TPy9Fx8yfGrmyP4z8evGzR0a8+7fGgAAAAAAAAAA4Hc93AEWlUj2UQAAAAAS' +
        'UVORK5CYII='

      const buffer = Buffer.from(grayPngBase64, 'base64')
      require('fs').writeFileSync(tempIconPath, buffer)
      console.log('💾 已创建占位图标:', tempIconPath)
      return tempIconPath
    } catch (error) {
      console.error('❌ 创建占位图标失败:', error)
      return undefined
    }
  }


  /**
   * 清理资源
   */
  cleanup(): void {
    // 移除IPC处理器
    ipcMain.removeHandler('drag-drop:start')
    ipcMain.removeHandler('drag-drop:start-multiple')

    console.log('🧹 Electron 原生拖拽处理器已清理')
  }
}