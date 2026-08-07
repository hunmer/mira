// 首页模块化架构入口文件

export { useHomeRouteHandler, type HomeRouteHandler } from './routeHandler'
export { useHomeTagHandler, type HomeTagHandler } from './tagHandler'
export { useHomeFolderHandler, type HomeFolderHandler } from './folderHandler'

import { useHomeRouteHandler } from './routeHandler'
import { useHomeTagHandler } from './tagHandler'
import { useHomeFolderHandler } from './folderHandler'

/**
 * 完整的首页模块化处理器
 * 
 * 🎯 **架构说明**：
 * 将HomeView.vue的庞大功能拆分为独立的模块，每个模块负责特定的业务逻辑：
 * 
 * 🔧 **模块组成**：
 * - routeHandler: 处理URL路由参数解析和跳转
 * - tagHandler: 管理标签的选择和过滤逻辑
 * - folderHandler: 管理文件夹的选择和过滤逻辑
 * 
 * 📡 **通信机制**：
 * - 模块间通过CustomEvent进行通信
 * - 支持路由参数自动处理
 * - 统一的状态管理和错误处理
 * 
 * 🔄 **使用示例**：
 * ```typescript
 * // 在HomeView.vue中
 * import { useHomeRouteHandler, useHomeTagHandler, useHomeFolderHandler } from '@renderer/modules/home'
 * 
 * const routeHandler = useHomeRouteHandler()
 * const tagHandler = useHomeTagHandler()
 * const folderHandler = useHomeFolderHandler()
 * 
 * onMounted(async () => {
 *   // 初始化路由处理
 *   await routeHandler.initialize()
 *   
 *   // 监听路由事件
 *   tagHandler.listenToRouteEvents()
 *   folderHandler.listenToRouteEvents()
 * })
 * ```
 */
export function useHomeModules() {
  const routeHandler = useHomeRouteHandler()
  const tagHandler = useHomeTagHandler()
  const folderHandler = useHomeFolderHandler()
  
  /**
   * 初始化所有模块
   */
  const initializeAll = async () => {
    console.log('🚀 初始化首页所有模块...')
    
    // 启动事件监听
    const cleanupFunctions = [
      tagHandler.listenToRouteEvents(),
      folderHandler.listenToRouteEvents()
    ]
    
    // 初始化路由处理
    const routeCleanup = await routeHandler.initialize()
    if (routeCleanup) {
      cleanupFunctions.push(routeCleanup)
    }
    
    console.log('✅ 首页模块初始化完成')
    
    // 返回清理函数
    return () => {
      console.log('🧹 清理首页模块...')
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }
  
  return {
    routeHandler,
    tagHandler,
    folderHandler,
    initializeAll
  }
}

/**
 * 首页模块类型定义
 */
export type HomeModules = ReturnType<typeof useHomeModules>
