/**
 * 插件脚本管理
 * 负责插件脚本的注入、加载和清理
 */

import type { PluginRuntime } from './types'
import { convertToScriptUrl, resolvePluginFilePath, validatePluginFile } from './utils'
import { environment } from '../utils'

/**
 * 将插件脚本注入到document中
 */
export const injectPluginsToDocument = async (plugins: PluginRuntime[]) => {
  try {
    // 清除之前注入的插件脚本
    const existingScripts = document.querySelectorAll('script[data-plugin-id]')
    existingScripts.forEach(script => script.remove())

    console.log(`🔄 Injecting ${plugins.length} plugins to document...`)

    // 检查是否已经在注入过程中
    if ((window as any).isInjectingPlugins) {
      console.log('⏭️ Plugin injection already in progress, skipping...')
      return
    }

    ;(window as any).isInjectingPlugins = true

    try {
      // 注入已加载的插件
      for (const plugin of plugins) {
        if (plugin.status === 'loaded' && plugin.directory && plugin.config.index) {
          console.log(`📦 Processing plugin: ${plugin.config.pluginName}`)

          // 检查脚本是否已经存在
          const existingScript = document.querySelector(`script[data-plugin-id="${plugin.config.pluginId}"]`)
          if (existingScript) {
            console.log(`⏭️ Script already exists for plugin: ${plugin.config.pluginName}`)
            continue
          }

          // 验证插件文件路径
          const entryFilePath = resolvePluginFilePath(plugin.directory, plugin.config.index)

          // 在开发模式下预先检查文件
          if (environment.isDevelopment) {
            const fileExists = await validatePluginFile(entryFilePath)
            if (!fileExists) {
              console.warn(`⚠️ Plugin file might not exist or be accessible: ${entryFilePath}`)
              console.warn(`⚠️ Attempting to load anyway...`)
            }
          }

          const success = await injectPluginScript(plugin)
          if (success) {
            console.log(`✅ Successfully injected: ${plugin.config.pluginName}`)
          } else {
            console.error(`❌ Failed to inject: ${plugin.config.pluginName}`)
          }
        } else {
          console.log(`⏭️ Skipping plugin: ${plugin.config.pluginName} (status: ${plugin.status}, directory: ${!!plugin.directory}, index: ${!!plugin.config.index})`)
        }
      }

      console.log(`🎉 Plugin injection process completed`)
    } finally {
      ;(window as any).isInjectingPlugins = false
    }
  } catch (err) {
    console.error('❌ Failed to inject plugins to document:', err)
    ;(window as any).isInjectingPlugins = false
  }
}

/**
 * 注入单个插件脚本
 */
export const injectPluginScript = async (plugin: PluginRuntime): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // 检查脚本是否已经存在
      const existingScript = document.querySelector(`script[data-plugin-id="${plugin.config.pluginId}"]`)
      if (existingScript) {
        console.log(`⏭️ Script already injected for plugin: ${plugin.config.pluginName}`)
        resolve(true)
        return
      }

      const script = document.createElement('script')
      script.type = 'text/javascript'

      // 构建插件入口文件的完整路径
      // plugin.directory 现在包含实际的插件目录路径
      const entryFilePath = resolvePluginFilePath(plugin.directory, plugin.config.index)

      // 使用工具函数转换路径
      const scriptSrc = convertToScriptUrl(entryFilePath)
      script.src = scriptSrc

      script.setAttribute('data-plugin-id', plugin.config.pluginId)
      script.setAttribute('data-plugin-name', plugin.config.pluginName)
      script.setAttribute('data-plugin-version', plugin.config.version)

      console.log(`🔌 Loading plugin script: ${plugin.config.pluginName}`)
      script.onload = () => {
        console.log(`✅ Plugin script loaded successfully: ${plugin.config.pluginName} v${plugin.config.version}`)

        // 初始化插件上下文（如果需要）
        try {
          console.debug('[PLUGIN-DEBUG][script:onload]', {
            pluginId: plugin.config.pluginId,
            pluginSystemExists: !!(window as any).pluginSystem,
            pluginSystemMethods: Object.keys((window as any).pluginSystem || {}).sort(),
            registerPlugin: typeof (window as any).pluginSystem?.registerPlugin,
            registerPluginInstance: typeof (window as any).pluginSystem?.registerPluginInstance
          })
          if (typeof window !== 'undefined' && (window as any).pluginSystem) {
            ;(window as any).pluginSystem.registerPlugin(plugin.config.pluginId, {
              config: plugin.config,
              context: plugin.context
            })
            console.log(`📝 Plugin registered with ID: ${plugin.config.pluginId} for ${plugin.config.pluginName}`)
          }
        } catch (contextError) {
          console.warn(`⚠️ Failed to initialize plugin context for ${plugin.config.pluginName}:`, contextError)
        }

        resolve(true)
      }

      script.onerror = (_error) => {
        console.error(`❌ Failed to load plugin script: ${plugin.config.pluginName}`)
        resolve(false)
      }

      document.head.appendChild(script)
    } catch (err) {
      console.error(`❌ Error injecting plugin script: ${plugin.config.pluginName}`, err)
      resolve(false)
    }
  })
}
