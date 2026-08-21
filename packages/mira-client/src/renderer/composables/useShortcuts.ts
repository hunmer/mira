import { onMounted, onUnmounted } from 'vue'
import { shortcutService } from '../services/ShortcutService'
import type { ShortcutAction, ShortcutBinding } from '../services/ShortcutService'

/**
 * 快捷键管理的组合式函数
 * 提供快捷键的注册、管理和事件处理
 */
export function useShortcuts() {
  /**
   * 初始化快捷键系统
   */
  const initializeShortcuts = async (): Promise<void> => {
    await shortcutService.initialize()

    // 注册默认的事件处理器
    registerDefaultEventHandlers()
  }

  /**
   * 注册自定义动作
   */
  const registerAction = (action: ShortcutAction): void => {
    shortcutService.registerAction(action)
  }

  /**
   * 批量注册动作
   */
  const registerActions = (actions: ShortcutAction[]): void => {
    shortcutService.registerActions(actions)
  }

  /**
   * 绑定快捷键
   */
  const bindShortcut = async (binding: ShortcutBinding): Promise<boolean> => {
    return await shortcutService.bindShortcut(binding)
  }

  /**
   * 解绑快捷键
   */
  const unbindShortcut = async (shortcut: string): Promise<void> => {
    await shortcutService.unbindShortcut(shortcut)
  }

  /**
   * 执行动作
   */
  const executeAction = async (actionId: string, ...args: any[]): Promise<boolean> => {
    return await shortcutService.executeAction(actionId, ...args)
  }

  /**
   * 获取所有动作
   */
  const getAllActions = (): ShortcutAction[] => {
    return shortcutService.getAllActions()
  }

  /**
   * 获取所有快捷键绑定
   */
  const getAllBindings = (): ShortcutBinding[] => {
    return shortcutService.getAllBindings()
  }

  /**
   * 根据类别获取动作
   */
  const getActionsByCategory = (category: string): ShortcutAction[] => {
    return shortcutService.getActionsByCategory(category)
  }

  /**
   * 搜索动作
   */
  const searchActions = (query: string): ShortcutAction[] => {
    return shortcutService.searchActions(query)
  }

  /**
   * 检查快捷键是否已被占用
   */
  const isShortcutTaken = (shortcut: string): boolean => {
    return shortcutService.isShortcutTaken(shortcut)
  }

  /**
   * 导出配置
   */
  const exportConfig = () => {
    return shortcutService.exportConfig()
  }

  /**
   * 导入配置
   */
  const importConfig = async (config: any): Promise<void> => {
    await shortcutService.importConfig(config)
  }

  /**
   * 注册默认事件处理器
   */
  const registerDefaultEventHandlers = (): void => {
    document.addEventListener('shortcut:screenshot', () => document.dispatchEvent(new CustomEvent('show-screenshot-dialog')))
    // 全局搜索
    document.addEventListener('shortcut:global-search', () => {
      // 触发全局搜索对话框显示
      const event = new CustomEvent('show-global-search')
      document.dispatchEvent(event)
    })

    // 应用设置
    document.addEventListener('shortcut:open-settings', () => {
      // 导航到设置页面
      const event = new CustomEvent('navigate-to', { detail: { path: '/settings' } })
      document.dispatchEvent(event)
    })

    // 帮助文档
    document.addEventListener('shortcut:show-help', () => {
      // 显示帮助对话框
      const event = new CustomEvent('show-help-dialog')
      document.dispatchEvent(event)
    })

    // 退出应用
    document.addEventListener('shortcut:quit-app', () => {
      if (window.electronAPI) {
        window.electronAPI.invoke('app:quit')
      }
    })

    // 导航快捷键
    document.addEventListener('shortcut:navigate-home', () => {
      const event = new CustomEvent('navigate-to', { detail: { path: '/' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:navigate-library', () => {
      const event = new CustomEvent('navigate-to', { detail: { path: '/library' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:navigate-plugins', () => {
      const event = new CustomEvent('navigate-to', { detail: { path: '/plugins' } })
      document.dispatchEvent(event)
    })

    // 媒体控制
    document.addEventListener('shortcut:media-play-pause', () => {
      const event = new CustomEvent('media-control', { detail: { action: 'play-pause' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:media-stop', () => {
      const event = new CustomEvent('media-control', { detail: { action: 'stop' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:media-next', () => {
      const event = new CustomEvent('media-control', { detail: { action: 'next' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:media-previous', () => {
      const event = new CustomEvent('media-control', { detail: { action: 'previous' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:media-volume-up', () => {
      const event = new CustomEvent('media-control', { detail: { action: 'volume-up' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:media-volume-down', () => {
      const event = new CustomEvent('media-control', { detail: { action: 'volume-down' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:media-mute', () => {
      const event = new CustomEvent('media-control', { detail: { action: 'mute' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:media-fullscreen', () => {
      const event = new CustomEvent('media-control', { detail: { action: 'fullscreen' } })
      document.dispatchEvent(event)
    })

    // 编辑操作
    document.addEventListener('shortcut:select-all', () => {
      const event = new CustomEvent('edit-action', { detail: { action: 'select-all' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:copy', () => {
      const event = new CustomEvent('edit-action', { detail: { action: 'copy' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:paste', () => {
      const event = new CustomEvent('edit-action', { detail: { action: 'paste' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:cut', () => {
      const event = new CustomEvent('edit-action', { detail: { action: 'cut' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:delete', () => {
      const event = new CustomEvent('edit-action', { detail: { action: 'delete' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:undo', () => {
      const event = new CustomEvent('edit-action', { detail: { action: 'undo' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:redo', () => {
      const event = new CustomEvent('edit-action', { detail: { action: 'redo' } })
      document.dispatchEvent(event)
    })

    // 视图操作
    document.addEventListener('shortcut:zoom-in', () => {
      const event = new CustomEvent('view-action', { detail: { action: 'zoom-in' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:zoom-out', () => {
      const event = new CustomEvent('view-action', { detail: { action: 'zoom-out' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:zoom-reset', () => {
      const event = new CustomEvent('view-action', { detail: { action: 'zoom-reset' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:toggle-sidebar', () => {
      const event = new CustomEvent('view-action', { detail: { action: 'toggle-sidebar' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:grid-view', () => {
      const event = new CustomEvent('view-action', { detail: { action: 'grid-view' } })
      document.dispatchEvent(event)
    })

    document.addEventListener('shortcut:list-view', () => {
      const event = new CustomEvent('view-action', { detail: { action: 'list-view' } })
      document.dispatchEvent(event)
    })

    // 窗口操作 (仅Electron)
    document.addEventListener('shortcut:window-minimize', () => {
      if (window.electronAPI) {
        window.electronAPI.invoke('window:minimize')
      }
    })

    document.addEventListener('shortcut:window-maximize', () => {
      if (window.electronAPI) {
        window.electronAPI.invoke('window:maximize')
      }
    })

    document.addEventListener('shortcut:window-close', () => {
      if (window.electronAPI) {
        window.electronAPI.invoke('window:close')
      }
    })

    // 开发调试
    document.addEventListener('shortcut:toggle-devtools', () => {
      if (window.electronAPI) {
        window.electronAPI.invoke('dev:toggle-devtools')
      }
    })

    document.addEventListener('shortcut:force-reload', () => {
      if (window.electronAPI) {
        window.electronAPI.invoke('dev:force-reload')
      } else {
        location.reload()
      }
    })
  }

  /**
   * 清理快捷键系统
   */
  const cleanup = (): void => {
    shortcutService.destroy()
  }

  return {
    // 初始化和清理
    initializeShortcuts,
    cleanup,

    // 动作管理
    registerAction,
    registerActions,
    getAllActions,
    getActionsByCategory,
    searchActions,

    // 快捷键管理
    bindShortcut,
    unbindShortcut,
    getAllBindings,
    isShortcutTaken,

    // 执行
    executeAction,

    // 配置
    exportConfig,
    importConfig
  }
}

/**
 * 自动设置快捷键的组合式函数
 * 在组件挂载时自动初始化快捷键，卸载时清理
 */
export function useAutoShortcuts() {
  const shortcuts = useShortcuts()

  onMounted(async () => {
    await shortcuts.initializeShortcuts()
  })

  onUnmounted(() => {
    shortcuts.cleanup()
  })

  return shortcuts
}
