import type { ShortcutConfig, ShortcutAction, ShortcutBinding } from '../services/ShortcutService'

/**
 * 默认动作定义
 * 这些动作代表应用中的常见操作
 *
 * 国际化说明：title/description 存放 i18n key（见 i18n/locales/{zh-CN,en-US}/shortcuts.json）。
 * actionId（如 'app.search'）映射为 key：去掉点并转驼峰（'app.search' -> 'shortcuts.actions.appSearch.title'）。
 * 消费处（如 ShortcutManagerDialog.vue）需用 t() 渲染这些 key；若值已是普通文本（非 key），原样显示。
 */
export const defaultActions: ShortcutAction[] = [
  // 常规操作
  {
    id: 'app.search',
    title: 'shortcuts.actions.appSearch.title',
    description: 'shortcuts.actions.appSearch.description',
    category: 'general',
    icon: 'search',
    callback: () => {
      // 触发全局搜索
      document.dispatchEvent(new CustomEvent('shortcut:global-search'))
    }
  },
  {
    id: 'app.settings',
    title: 'shortcuts.actions.appSettings.title',
    description: 'shortcuts.actions.appSettings.description',
    category: 'general',
    icon: 'settings',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:open-settings'))
    }
  },
  {
    id: 'app.help',
    title: 'shortcuts.actions.appHelp.title',
    description: 'shortcuts.actions.appHelp.description',
    category: 'general',
    icon: 'help',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:show-help'))
    }
  },
  {
    id: 'app.quit',
    title: 'shortcuts.actions.appQuit.title',
    description: 'shortcuts.actions.appQuit.description',
    category: 'system',
    icon: 'exit_to_app',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:quit-app'))
    }
  },

  // 导航操作
  {
    id: 'nav.home',
    title: 'shortcuts.actions.navHome.title',
    description: 'shortcuts.actions.navHome.description',
    category: 'navigation',
    icon: 'home',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:navigate-home'))
    }
  },
  {
    id: 'nav.activate-last-tab',
    title: 'shortcuts.actions.navActivateLastTab.title',
    description: 'shortcuts.actions.navActivateLastTab.description',
    category: 'navigation',
    icon: 'history',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:activate-last-tab'))
    }
  },
  {
    id: 'nav.reopen-closed-tab',
    title: 'shortcuts.actions.navReopenClosedTab.title',
    description: 'shortcuts.actions.navReopenClosedTab.description',
    category: 'navigation',
    icon: 'restore',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:reopen-closed-tab'))
    }
  },
  {
    id: 'nav.library',
    title: 'shortcuts.actions.navLibrary.title',
    description: 'shortcuts.actions.navLibrary.description',
    category: 'navigation',
    icon: 'video_library',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:navigate-library'))
    }
  },
  {
    id: 'nav.plugins',
    title: 'shortcuts.actions.navPlugins.title',
    description: 'shortcuts.actions.navPlugins.description',
    category: 'navigation',
    icon: 'extension',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:navigate-plugins'))
    }
  },
  {
    id: 'nav.back',
    title: 'shortcuts.actions.navBack.title',
    description: 'shortcuts.actions.navBack.description',
    category: 'navigation',
    icon: 'arrow_back',
    callback: () => {
      window.history.back()
    }
  },
  {
    id: 'nav.forward',
    title: 'shortcuts.actions.navForward.title',
    description: 'shortcuts.actions.navForward.description',
    category: 'navigation',
    icon: 'arrow_forward',
    callback: () => {
      window.history.forward()
    }
  },
  {
    id: 'nav.refresh',
    title: 'shortcuts.actions.navRefresh.title',
    description: 'shortcuts.actions.navRefresh.description',
    category: 'navigation',
    icon: 'refresh',
    callback: () => {
      location.reload()
    }
  },

  // 媒体操作
  {
    id: 'media.play-pause',
    title: 'shortcuts.actions.mediaPlayPause.title',
    description: 'shortcuts.actions.mediaPlayPause.description',
    category: 'media',
    icon: 'play_arrow',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-play-pause'))
    }
  },
  {
    id: 'media.stop',
    title: 'shortcuts.actions.mediaStop.title',
    description: 'shortcuts.actions.mediaStop.description',
    category: 'media',
    icon: 'stop',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-stop'))
    }
  },
  {
    id: 'media.next',
    title: 'shortcuts.actions.mediaNext.title',
    description: 'shortcuts.actions.mediaNext.description',
    category: 'media',
    icon: 'skip_next',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-next'))
    }
  },
  {
    id: 'media.previous',
    title: 'shortcuts.actions.mediaPrevious.title',
    description: 'shortcuts.actions.mediaPrevious.description',
    category: 'media',
    icon: 'skip_previous',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-previous'))
    }
  },
  {
    id: 'media.volume-up',
    title: 'shortcuts.actions.mediaVolumeUp.title',
    description: 'shortcuts.actions.mediaVolumeUp.description',
    category: 'media',
    icon: 'volume_up',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-volume-up'))
    }
  },
  {
    id: 'media.volume-down',
    title: 'shortcuts.actions.mediaVolumeDown.title',
    description: 'shortcuts.actions.mediaVolumeDown.description',
    category: 'media',
    icon: 'volume_down',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-volume-down'))
    }
  },
  {
    id: 'media.mute',
    title: 'shortcuts.actions.mediaMute.title',
    description: 'shortcuts.actions.mediaMute.description',
    category: 'media',
    icon: 'volume_off',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-mute'))
    }
  },
  {
    id: 'media.fullscreen',
    title: 'shortcuts.actions.mediaFullscreen.title',
    description: 'shortcuts.actions.mediaFullscreen.description',
    category: 'media',
    icon: 'fullscreen',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:media-fullscreen'))
    }
  },

  // 编辑操作
  {
    id: 'edit.select-all',
    title: 'shortcuts.actions.editSelectAll.title',
    description: 'shortcuts.actions.editSelectAll.description',
    category: 'editing',
    icon: 'select_all',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:select-all'))
    }
  },
  {
    id: 'edit.copy',
    title: 'shortcuts.actions.editCopy.title',
    description: 'shortcuts.actions.editCopy.description',
    category: 'editing',
    icon: 'content_copy',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:copy'))
    }
  },
  {
    id: 'edit.paste',
    title: 'shortcuts.actions.editPaste.title',
    description: 'shortcuts.actions.editPaste.description',
    category: 'editing',
    icon: 'content_paste',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:paste'))
    }
  },
  {
    id: 'edit.cut',
    title: 'shortcuts.actions.editCut.title',
    description: 'shortcuts.actions.editCut.description',
    category: 'editing',
    icon: 'content_cut',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:cut'))
    }
  },
  {
    id: 'edit.delete',
    title: 'shortcuts.actions.editDelete.title',
    description: 'shortcuts.actions.editDelete.description',
    category: 'editing',
    icon: 'delete',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:delete'))
    }
  },
  {
    id: 'edit.undo',
    title: 'shortcuts.actions.editUndo.title',
    description: 'shortcuts.actions.editUndo.description',
    category: 'editing',
    icon: 'undo',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:undo'))
    }
  },
  {
    id: 'edit.redo',
    title: 'shortcuts.actions.editRedo.title',
    description: 'shortcuts.actions.editRedo.description',
    category: 'editing',
    icon: 'redo',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:redo'))
    }
  },

  // 视图操作
  {
    id: 'view.zoom-in',
    title: 'shortcuts.actions.viewZoomIn.title',
    description: 'shortcuts.actions.viewZoomIn.description',
    category: 'view',
    icon: 'zoom_in',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:zoom-in'))
    }
  },
  {
    id: 'view.zoom-out',
    title: 'shortcuts.actions.viewZoomOut.title',
    description: 'shortcuts.actions.viewZoomOut.description',
    category: 'view',
    icon: 'zoom_out',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:zoom-out'))
    }
  },
  {
    id: 'view.zoom-reset',
    title: 'shortcuts.actions.viewZoomReset.title',
    description: 'shortcuts.actions.viewZoomReset.description',
    category: 'view',
    icon: 'zoom_out_map',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:zoom-reset'))
    }
  },
  {
    id: 'view.toggle-sidebar',
    title: 'shortcuts.actions.viewToggleSidebar.title',
    description: 'shortcuts.actions.viewToggleSidebar.description',
    category: 'view',
    icon: 'menu',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:toggle-sidebar'))
    }
  },
  {
    id: 'view.grid-view',
    title: 'shortcuts.actions.viewGridView.title',
    description: 'shortcuts.actions.viewGridView.description',
    category: 'view',
    icon: 'grid_view',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:grid-view'))
    }
  },
  {
    id: 'view.list-view',
    title: 'shortcuts.actions.viewListView.title',
    description: 'shortcuts.actions.viewListView.description',
    category: 'view',
    icon: 'view_list',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:list-view'))
    }
  },

  // 窗口操作 (仅Electron)
  {
    id: 'window.minimize',
    title: 'shortcuts.actions.windowMinimize.title',
    description: 'shortcuts.actions.windowMinimize.description',
    category: 'system',
    icon: 'minimize',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:window-minimize'))
    }
  },
  {
    id: 'window.maximize',
    title: 'shortcuts.actions.windowMaximize.title',
    description: 'shortcuts.actions.windowMaximize.description',
    category: 'system',
    icon: 'crop_square',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:window-maximize'))
    }
  },
  {
    id: 'tab.close-current',
    title: 'shortcuts.actions.tabCloseCurrent.title',
    description: 'shortcuts.actions.tabCloseCurrent.description',
    category: 'navigation',
    icon: 'close',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:close-current-tab'))
    }
  },

  // 开发调试
  {
    id: 'dev.devtools',
    title: 'shortcuts.actions.devDevtools.title',
    description: 'shortcuts.actions.devDevtools.description',
    category: 'system',
    icon: 'bug_report',
    callback: () => {
      document.dispatchEvent(new CustomEvent('shortcut:toggle-devtools'))
    }
  },
  {
    id: 'dev.reload',
    title: 'shortcuts.actions.devReload.title',
    description: 'shortcuts.actions.devReload.description',
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
    
    actionId: 'tab.close-current',
    enabled: true,
    description: '关闭当前标签页快捷键'
  },

	{
		shortcut: 'Delete',
		priority: 80,

		actionId: 'edit.delete',
		enabled: true,
		description: '删除快捷键'
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
