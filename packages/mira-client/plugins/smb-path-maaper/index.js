/**
 * SMB路径映射器插件
 * 为Mira素材库提供SMB路径映射功能，支持HTTP到本地路径转换
 */
(() => {
  class SmbPathMapper {
    constructor(context) {
      this.context = context
      this.api = context.api
      this.isActive = false
      this.smbMappings = new Map()

      // 配置项
      this.config = {
        enableSmbMapping: this.api.config.get('enableSmbMapping') || true,
        smbMappings: this.api.config.get('smbMappings') || {
          '1755239013113': {
            smbBase: 'D:/test33422',
            enabled: true
          },
        },
      }

      // 初始化SMB映射
      this.initializeSmbMappings()
    }

    /**
     * 插件初始化
     */
    async initialize() {
      this.api.log.info('SMB路径映射器插件开始初始化')

      try {
        // 注册事件监听器
        this.registerEventListeners()

        // 启用功能
        this.startSmbMapping()

        this.api.log.info('SMB路径映射器插件初始化完成')

      } catch (error) {
        this.api.log.error('SMB路径映射器插件初始化失败:', error)
        this.api.ui.showNotification('SMB路径映射器初始化失败', 'error')
        throw error
      }
    }

    /**
     * 初始化SMB映射配置
     */
    initializeSmbMappings() {
      try {
        // 从配置中加载SMB映射
        const savedMappings = this.config.smbMappings
        this.smbMappings.clear()
        for (const [libraryId, mapping] of Object.entries(savedMappings)) {
          this.smbMappings.set(libraryId, {
            smbBase: mapping.smbBase,
            enabled: mapping.enabled !== false,
            lastUpdated: mapping.lastUpdated || new Date().toISOString()
          })
        }

        this.api.log.debug('SMB映射已初始化:', this.smbMappings)
      } catch (error) {
        this.api.log.error('初始化SMB映射失败:', error)
      }
    }

    /**
     * 注册事件监听器
     */
    registerEventListeners() {
      // 监听通用HTTP请求事件
      window.addEventListener('mira_http_request', (event) => {
        this.handleHttpEvent(event)
      })
    }

    /**
     * 处理getFiles请求事件
     */
    handleGetFilesEvent(eventData) {
      if (!this.isActive || !this.config.enableSmbMapping) {
        return
      }

      // 如果是成功响应，处理文件路径映射
      if (eventData.type === 'success') {
        this.processFilesForSmbMapping(eventData)
      }
    }

    /**
     * 处理HTTP请求事件
     */
    handleHttpEvent(event) {
      const eventData = event.detail

      if (!this.isActive) {
        return
      }

      // 处理 getFiles 请求
      if (eventData.endpoint === 'api/files/getFiles') {
        this.handleGetFilesEvent(eventData)
      }
    }

    /**
     * 处理文件列表，进行SMB路径映射
     */
    processFilesForSmbMapping(eventData) {
      const { data } = eventData
      const libraryId = data.libraryId
      // 尝试多种可能的文件数据字段名
      const files = data.data

      if (!libraryId || !this.smbMappings.has(libraryId)) {
        return
      }

      const mapping = this.smbMappings.get(libraryId)
      if (!mapping.enabled) {
        return
      }

      // 直接在数据层面添加localFile字段
      if (files && Array.isArray(files)) {
        this.addLocalFilePathsToData(libraryId, mapping, files)
      }
    }

    /**
     * 通过API设置文件的本地路径映射
     */
    addLocalFilePathsToData(libraryId, mapping, files) {
      try {
        let processedCount = 0
        const filePathMap = {}

        if (this.config.logToConsole) {
          console.log(`📋 开始为数据添加本地路径映射，文件数量: ${files.length}`)
        }

        files.forEach((file, index) => {
          if (!file.id) {
            return
          }

          // 基于文件数据构建本地路径
          const localPath = this.buildLocalPath(mapping, file)
          if (localPath) {
            // 添加到批量映射对象中
            filePathMap[file.id] = localPath
            processedCount++

            if (this.config.logToConsole && index < 5) { // 只记录前5个文件的详情
              console.log(`✅ 准备为文件添加本地路径: ${file.name} -> ${localPath}`)
            }
          }
        })

        // 批量设置本地文件路径到mediaStore
        if (Object.keys(filePathMap).length > 0) {
          this.api.media.setLocalFiles(libraryId, filePathMap)

          if (this.config.logToConsole) {
            console.log(`📊 通过API设置结果: 成功为 ${processedCount} 个文件添加本地路径映射`)
          }

          if (processedCount > 0) {
            this.api.log.info(`✅ 成功为 ${processedCount} 个文件添加本地路径映射`)
          }
        }
      } catch (error) {
        this.api.log.error('添加本地路径映射失败:', error)
      }
    }

    /**
     * 基于文件数据构建本地路径
     */
    buildLocalPath(mapping, fileData) {
      try {
        const { smbBase } = mapping

        // 必须有文件数据才能构建路径
        if (!fileData) {
          return null
        }

        const folderName = fileData.folder_name || '未分类'
        const fileName = fileData.name

        if (!fileName) {
          this.api.log.warn('文件名为空，无法构建本地路径:', fileData)
          return null
        }

        // 构建完整的本地路径: smbBase/folder_name/file_name
        let localPath = smbBase

        // 确保路径以正确的分隔符结尾
        if (!localPath.endsWith('/') && !localPath.endsWith('\\')) {
          localPath += '/'
        }

        // 添加文件夹名称
        localPath += folderName + '/'
        // 添加文件名
        localPath += fileName
        // 统一使用反斜杠（Windows风格）
        localPath = localPath.replace(/\//g, '\\')

        return localPath
      } catch (error) {
        this.api.log.error('构建本地路径失败:', error)
        return null
      }
    }

    /**
     * 添加SMB映射
     */
    addSmbMapping() {
      const currentLibraryId = this.getCurrentLibraryId()
      if (!currentLibraryId) {
        this.api.ui.showNotification('无法获取当前库ID', 'error')
        return
      }

      // 简化的配置对话框
      const smbBase = prompt('请输入本地基础路径 (例如: D:\\media\\library)')
      if (!smbBase) return

      // 保存映射
      const mapping = {
        smbBase: smbBase.endsWith('\\') || smbBase.endsWith('/') ? smbBase : smbBase + '\\',
        enabled: true,
        lastUpdated: new Date().toISOString()
      }

      this.smbMappings.set(currentLibraryId, mapping)
      this.saveSmbMappings()

      this.api.ui.showNotification(`已为库 ${currentLibraryId} 添加SMB映射`, 'success')
      this.api.log.info('SMB映射已添加:', mapping)
    }

    /**
     * 显示SMB配置
     */
    showSmbConfig() {
      const currentLibraryId = this.getCurrentLibraryId()
      const mappings = Array.from(this.smbMappings.entries())

      let message = '当前SMB映射配置:\\n\\n'

      if (currentLibraryId) {
        message += `当前库ID: ${currentLibraryId}\\n\\n`
      }

      if (mappings.length === 0) {
        message += '暂无SMB映射配置\\n\\n'
      } else {
        mappings.forEach(([libraryId, mapping]) => {
          const status = mapping.enabled ? '✅' : '❌'
          message += `${status} 库ID: ${libraryId}\\n`
          message += `   本地路径: ${mapping.smbBase}\\n\\n`
        })
      }

      this.api.ui.showDialog({
        title: 'SMB路径映射配置',
        message: message,
        type: 'info'
      })
    }


    /**
     * 开始SMB映射
     */
    startSmbMapping() {
      this.isActive = true
      this.api.log.info('SMB路径映射已启动')
    }

    /**
     * 停止SMB映射
     */
    stopSmbMapping() {
      this.isActive = false
      this.api.log.info('SMB路径映射已停止')
    }

    /**
     * 保存SMB映射配置
     */
    saveSmbMappings() {
      try {
        const mappingsObj = {}
        this.smbMappings.forEach((mapping, libraryId) => {
          mappingsObj[libraryId] = mapping
        })

        this.config.smbMappings = mappingsObj
        this.api.storage.set('smbMappings', mappingsObj)
        this.api.log.debug('SMB映射配置已保存')
      } catch (error) {
        this.api.log.error('保存SMB映射配置失败:', error)
      }
    }

    /**
     * 保存配置
     */
    saveConfig() {
      try {
        Object.keys(this.config).forEach(key => {
          this.api.storage.set(key, this.config[key])
        })
        this.api.log.debug('插件配置已保存')
      } catch (error) {
        this.api.log.error('保存配置失败:', error)
      }
    }

    /**
     * 获取插件状态
     */
    getStatus() {
      return {
        name: 'SMB路径映射器',
        version: '2.0.0',
        status: this.isActive ? 'active' : 'stopped',
        isActive: this.isActive,
        smbMappingsCount: this.smbMappings.size,
        processedFilesCount: this.processedFiles.size,
        config: this.config
      }
    }

    /**
     * 清理资源
     */
    async cleanup() {
      this.api.log.info('SMB路径映射器插件开始清理')

      try {
        this.stopSmbMapping()

        // 清理数据
        this.smbMappings.clear()

        this.api.log.info('SMB路径映射器插件清理完成')
      } catch (error) {
        this.api.log.error('插件清理过程中发生错误:', error)
      }
    }
  }

  /**
   * 插件初始化函数
   */
  async function initialize(context) {
    const mapper = new SmbPathMapper(context)
    await mapper.initialize()
    return mapper
  }

  /**
   * 插件设置函数 - 注册到全局插件系统
   */
  function setup() {
    // 注册插件实例工厂到全局变量中
    if (typeof window !== 'undefined' && window.pluginSystem) {
      window.pluginSystem.registerPluginInstance(
        "a9386ff4-7310-44a6-b54b-30710f3f6247", // 使用与 plugin.json 中一致的 pluginId
        initialize
      )
      console.log('🏭 SMB Path Mapper plugin factory registered')
    } else {
      console.warn('⚠️ Plugin system not available, retrying in 100ms...')
      // 如果插件系统还未初始化，延迟注册
      setTimeout(setup, 100)
    }
  }

  // 立即执行设置
  setup()
})();