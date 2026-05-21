import type { ShortcutConfig, ShortcutAction, ShortcutBinding } from '../services/ShortcutService'

/**
 * 默认动作定义
 * 这些动作代表应用中的常见操作
 */
export const defaultActions: ShortcutAction[] = [
  // 常规操作
  {
    id: 'app.search',
    title: '全局搜索',
    description: '打开全局搜索对话框',
    category: 'general',
    icon: 'search',
    callback: () => {
      // 触发全局搜索
      document.dispatchEvent(new CustomEvent('shortcut:global-search'))
    }
  },
  {
    id: 'app.settings',
    title: '打开设置',
    description: '打开应用设置页面',
    category: 'general',
    icon: 'settings',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:open-settings'))
    }
  },
  {
    id: 'app.help',
    title: '帮助文档',
    description: '打开帮助文档',
    category: 'general',
    icon: 'help',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:show-help'))
    }
  },
  {
    id: 'app.quit',
    title: '退出应用',
    description: '关闭应用程序',
    category: 'system',
    icon: 'exit_to_app',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:quit-app'))
    }
  },

  // 导航操作
  {
    id: 'nav.home',
    title: '返回首页',
    description: '导航到首页',
    category: 'navigation',
    icon: 'home',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:navigate-home'))
    }
  },
  {
    id: 'nav.activate-last-tab',
    title: '激活上一次的tab',
    description: '切换到上一次激活的标签页',
    category: 'navigation',
    icon: 'history',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:activate-last-tab'))
    }
  },
  {
    id: 'nav.reopen-closed-tab',
    title: '打开最后关闭的tab',
    description: '重新打开最近关闭的标签页',
    category: 'navigation',
    icon: 'restore',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:reopen-closed-tab'))
    }
  },
  {
    id: 'nav.library',
    title: '媒体库',
    description: '打开媒体库页面',
    category: 'navigation',
    icon: 'video_library',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:navigate-library'))
    }
  },
  {
    id: 'nav.plugins',
    title: '插件管理',
    description: '打开插件管理页面',
    category: 'navigation',
    icon: 'extension',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:navigate-plugins'))
    }
  },
  {
    id: 'nav.back',
    title: '后退',
    description: '返回上一页',
    category: 'navigation',
    icon: 'arrow_back',
    callback: () => {
      window.history.back()
    }
  },
  {
    id: 'nav.forward',
    title: '前进',
    description: '前进到下一页',
    category: 'navigation',
    icon: 'arrow_forward',
    callback: () => {
      window.history.forward()
    }
  },
  {
    id: 'nav.refresh',
    title: '刷新页面',
    description: '重新加载当前页面',
    category: 'navigation',
    icon: 'refresh',
    callback: () => {
      location.reload()
    }
  },

  // 媒体操作
  {
    id: 'media.play-pause',
    title: '播放/暂停',
    description: '切换媒体播放状态',
    category: 'media',
    icon: 'play_arrow',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-play-pause'))
    }
  },
  {
    id: 'media.stop',
    title: '停止播放',
    description: '停止媒体播放',
    category: 'media',
    icon: 'stop',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-stop'))
    }
  },
  {
    id: 'media.next',
    title: '下一个',
    description: '播放下一个媒体文件',
    category: 'media',
    icon: 'skip_next',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-next'))
    }
  },
  {
    id: 'media.previous',
    title: '上一个',
    description: '播放上一个媒体文件',
    category: 'media',
    icon: 'skip_previous',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-previous'))
    }
  },
  {
    id: 'media.volume-up',
    title: '音量增加',
    description: '提高播放音量',
    category: 'media',
    icon: 'volume_up',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-volume-up'))
    }
  },
  {
    id: 'media.volume-down',
    title: '音量减少',
    description: '降低播放音量',
    category: 'media',
    icon: 'volume_down',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-volume-down'))
    }
  },
  {
    id: 'media.mute',
    title: '静音切换',
    description: '切换静音状态',
    category: 'media',
    icon: 'volume_off',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-mute'))
    }
  },
  {
    id: 'media.fullscreen',
    title: '全屏切换',
    description: '切换全屏模式',
    category: 'media',
    icon: 'fullscreen',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-fullscreen'))
    }
  },

  // 编辑操作
  {
    id: 'edit.select-all',
    title: '全选',
    description: '选择所有内容',
    category: 'editing',
    icon: 'select_all',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:select-all'))
    }
  },
  {
    id: 'edit.copy',
    title: '复制',
    description: '复制选中内容',
    category: 'editing',
    icon: 'content_copy',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:copy'))
    }
  },
  {
    id: 'edit.paste',
    title: '粘贴',
    description: '粘贴剪贴板内容',
    category: 'editing',
    icon: 'content_paste',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:paste'))
    }
  },
  {
    id: 'edit.cut',
    title: '剪切',
    description: '剪切选中内容',
    category: 'editing',
    icon: 'content_cut',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:cut'))
    }
  },
  {
    id: 'edit.delete',
    title: '删除',
    description: '删除选中项目',
    category: 'editing',
    icon: 'delete',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:delete'))
    }
  },
  {
    id: 'edit.undo',
    title: '撤销',
    description: '撤销上一个操作',
    category: 'editing',
    icon: 'undo',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:undo'))
    }
  },
  {
    id: 'edit.redo',
    title: '重做',
    description: '重做上一个操作',
    category: 'editing',
    icon: 'redo',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:redo'))
    }
  },

  // 视图操作
  {
    id: 'view.zoom-in',
    title: '放大',
    description: '放大视图',
    category: 'view',
    icon: 'zoom_in',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:zoom-in'))
    }
  },
  {
    id: 'view.zoom-out',
    title: '缩小',
    description: '缩小视图',
    category: 'view',
    icon: 'zoom_out',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:zoom-out'))
    }
  },
  {
    id: 'view.zoom-reset',
    title: '重置缩放',
    description: '重置到原始大小',
    category: 'view',
    icon: 'zoom_out_map',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:zoom-reset'))
    }
  },
  {
    id: 'view.toggle-sidebar',
    title: '切换侧边栏',
    description: '显示/隐藏侧边栏',
    category: 'view',
    icon: 'menu',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:toggle-sidebar'))
    }
  },
  {
    id: 'view.grid-view',
    title: '网格视图',
    description: '切换到网格视图',
    category: 'view',
    icon: 'grid_view',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:grid-view'))
    }
  },
  {
    id: 'view.list-view',
    title: '列表视图',
    description: '切换到列表视图',
    category: 'view',
    icon: 'view_list',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:list-view'))
    }
  },

  // 窗口操作 (仅Electron)
  {
    id: 'window.minimize',
    title: '最小化窗口',
    description: '最小化当前窗口',
    category: 'system',
    icon: 'minimize',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:window-minimize'))
    }
  },
  {
    id: 'window.maximize',
    title: '最大化窗口',
    description: '最大化/还原窗口',
    category: 'system',
    icon: 'crop_square',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:window-maximize'))
    }
  },
  {
    id: 'window.close',
    title: '关闭窗口',
    description: '关闭当前窗口',
    category: 'system',
    icon: 'close',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:window-close'))
    }
  },

  // 开发调试
  {
    id: 'dev.devtools',
    title: '开发者工具',
    description: '打开开发者工具',
    category: 'system',
    icon: 'bug_report',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:toggle-devtools'))
    }
  },
  {
    id: 'dev.reload',
    title: '强制刷新',
    description: '强制重新加载应用',
    category: 'system',
    icon: 'refresh',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:force-reload'))
    }
  }
]

/**
 * 默认快捷键绑定
 */
export const defaultBindings: ShortcutBinding[] = [
  // 常规操作快捷键
  {
    shortcut: 'Ctrl+K',
    priority: 90,
    isGlobal: true,
    actionId: 'app.search',
    enabled: true,
    description: '全局搜索快捷键'
  },
  {
    shortcut: 'Ctrl+Comma',
    priority: 80,
    
    actionId: 'app.settings',
    enabled: true,
    description: '设置快捷键'
  },
  {
    shortcut: 'F1',
    priority: 70,
    
    actionId: 'app.help',
    enabled: true,
    description: '帮助快捷键'
  },
  {
    shortcut: 'Ctrl+Q',
    priority: 100,
    
    actionId: 'app.quit',
    enabled: true,
    description: '退出应用快捷键'
  },

  // 导航快捷键
  {
    shortcut: 'Ctrl+H',
    priority: 60,

    actionId: 'nav.home',
    enabled: true,
    description: '首页快捷键'
  },
  {
    shortcut: 'Ctrl+Shift+Tab',
    priority: 80,
    actionId: 'nav.activate-last-tab',
    enabled: true,
    description: '激活上一次的tab快捷键'
  },
  {
    shortcut: 'Ctrl+Shift+T',
    priority: 80,
    actionId: 'nav.reopen-closed-tab',
    enabled: true,
    description: '打开最后关闭的tab快捷键'
  },
  {
    shortcut: 'Ctrl+L',
    priority: 60,
    
    actionId: 'nav.library',
    enabled: true,
    description: '媒体库快捷键'
  },
  {
    shortcut: 'Ctrl+P',
    priority: 60,
    
    actionId: 'nav.plugins',
    enabled: true,
    description: '插件管理快捷键'
  },
  {
    shortcut: 'Alt+Left',
    priority: 70,
    
    actionId: 'nav.back',
    enabled: true,
    description: '后退快捷键'
  },
  {
    shortcut: 'Alt+Right',
    priority: 70,
    
    actionId: 'nav.forward',
    enabled: true,
    description: '前进快捷键'
  },
  {
    shortcut: 'F5',
    priority: 80,
    
    actionId: 'nav.refresh',
    enabled: true,
    description: '刷新快捷键'
  },

  // 媒体控制快捷键
  {
    shortcut: 'Space',
    priority: 90,
    actionId: 'media.play-pause',
    enabled: true,
    description: '播放/暂停快捷键'
  },
  {
    shortcut: 'Ctrl+Alt+S',
    priority: 80,
    actionId: 'media.stop',
    enabled: true,
    description: '停止播放快捷键'
  },
  {
    shortcut: 'Ctrl+Right',
    priority: 80,
    
    actionId: 'media.next',
    enabled: true,
    description: '下一个快捷键'
  },
  {
    shortcut: 'Ctrl+Left',
    priority: 80,
    
    actionId: 'media.previous',
    enabled: true,
    description: '上一个快捷键'
  },
  {
    shortcut: 'Ctrl+Up',
    priority: 70,
    
    actionId: 'media.volume-up',
    enabled: true,
    description: '音量增加快捷键'
  },
  {
    shortcut: 'Ctrl+Down',
    priority: 70,
    
    actionId: 'media.volume-down',
    enabled: true,
    description: '音量减少快捷键'
  },
  {
    shortcut: 'Ctrl+M',
    priority: 80,
    
    actionId: 'media.mute',
    enabled: true,
    description: '静音快捷键'
  },
  {
    shortcut: 'F11',
    priority: 90,
    
    actionId: 'media.fullscreen',
    enabled: true,
    description: '全屏快捷键'
  },
  {
    shortcut: 'Ctrl+Z',
    priority: 90,
    
    actionId: 'edit.undo',
    enabled: true,
    description: '撤销快捷键'
  },
  {
    shortcut: 'Ctrl+Y',
    priority: 90,
    
    actionId: 'edit.redo',
    enabled: true,
    description: '重做快捷键'
  },

  // 视图快捷键
  {
    shortcut: 'Ctrl+Plus',
    priority: 70,
    
    actionId: 'view.zoom-in',
    enabled: true,
    description: '放大快捷键'
  },
  {
    shortcut: 'Ctrl+Minus',
    priority: 70,
    
    actionId: 'view.zoom-out',
    enabled: true,
    description: '缩小快捷键'
  },
  {
    shortcut: 'Ctrl+0',
    priority: 70,
    
    actionId: 'view.zoom-reset',
    enabled: true,
    description: '重置缩放快捷键'
  },
  {
    shortcut: 'Ctrl+B',
    priority: 60,
    
    actionId: 'view.toggle-sidebar',
    enabled: true,
    description: '切换侧边栏快捷键'
  },
  {
    shortcut: 'Ctrl+1',
    priority: 60,
    
    actionId: 'view.grid-view',
    enabled: true,
    description: '网格视图快捷键'
  },
  {
    shortcut: 'Ctrl+2',
    priority: 60,
    
    actionId: 'view.list-view',
    enabled: true,
    description: '列表视图快捷键'
  },

  // 窗口操作快捷键 (仅Electron)
  {
    shortcut: 'Ctrl+Shift+M',
    priority: 80,
    
    actionId: 'window.minimize',
    enabled: true,
    description: '最小化窗口快捷键'
  },
  {
    shortcut: 'Ctrl+Shift+X',
    priority: 80,
    
    actionId: 'window.maximize',
    enabled: true,
    description: '最大化窗口快捷键'
  },
  {
    shortcut: 'Ctrl+W',
    priority: 80,
    
    actionId: 'window.close',
    enabled: true,
    description: '关闭窗口快捷键'
  },

  // 开发调试快捷键
  {
    shortcut: 'F12',
    priority: 90,
    actionId: 'dev.devtools',
    enabled: true,
    description: '开发者工具快捷键'
  },
  {
    shortcut: 'Ctrl+Shift+R',
    priority: 80,
    
    actionId: 'dev.reload',
    enabled: true,
    description: '强制刷新快捷键'
  }
]

/**
 * 默认快捷键配置
 */
export const defaultShortcutConfig: ShortcutConfig = {
  actions: defaultActions,
  bindings: defaultBindings
}