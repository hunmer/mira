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

    // 检查是否已经在注入过程中
    if ((window as any).isInjectingPlugins) {
      return
    }

    ;(window as any).isInjectingPlugins = true

    try {
      // 注入已加载的插件
      for (const plugin of plugins) {
        if (plugin.status === 'loaded' && plugin.directory && plugin.config.index) {
          // 检查脚本是否已经存在
          const existingScript = document.querySelector(`script[data-plugin-id="${plugin.config.pluginId}"]`)
          if (existingScript) {
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
          } else {
            console.error(`❌ Failed to inject: ${plugin.config.pluginName}`)
          }
        } else {
        }
      }

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

      script.onload = () => {
        // 初始化插件上下文（如果需要）
        try {
          if (typeof window !== 'undefined' && (window as any).pluginSystem) {
            ;(window as any).pluginSystem.registerPlugin(plugin.config.pluginId, {
              config: plugin.config,
              context: plugin.context
            })
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
