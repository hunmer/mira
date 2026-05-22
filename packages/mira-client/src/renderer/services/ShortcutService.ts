import { electronService } from './ElectronService'
import ConfigStorage from '@renderer/utils/ConfigStorage'

/**
 * 动作定义接口
 */
export interface ShortcutAction {
  /** 动作唯一标识 */
  id: string
  /** 动作标题 */
  title: string
  /** 动作回调函数 */
  callback: (...args: any[]) => void | Promise<void>
  /** 动作描述 */
  description?: string
  /** 动作类别 */
  category?: string
  /** 图标 */
  icon?: string
}

/**
 * 快捷键定义接口
 */
export interface ShortcutBinding {
  /** 快捷键组合 (如: 'Ctrl+S', 'F1', 'Ctrl+Shift+N') */
  shortcut: string
  /** 优先级 (数值越大优先级越高) */
  priority: number
  /** 是否为全局快捷键 (仅在Electron环境生效) */
  isGlobal?: boolean
  /** 绑定的动作ID */
  actionId: string
  /** 是否启用 */
  enabled: boolean
  /** 快捷键描述 */
  description?: string
}

/**
 * 快捷键配置接口
 */
export interface ShortcutConfig {
  actions: ShortcutAction[]
  bindings: ShortcutBinding[]
}

/**
 * 快捷键管理服务类
 * 支持网页版和Electron环境的快捷键管理
 */
export class ShortcutService {
  private actions = new Map<string, ShortcutAction>()
  private bindings = new Map<string, ShortcutBinding>()
  private globalBindings = new Map<string, ShortcutBinding>()
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null
  private isInitialized = false
  private readonly STORAGE_KEY = 'mira_user_shortcuts'
  private userBindings = new Map<string, ShortcutBinding>()
  private globalListenerSetup = false

  constructor() {
    this.keydownHandler = this.handleKeyDown.bind(this)
  }

  /**
   * 初始化快捷键服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // 加载并合并配置
    await this.loadAndMergeConfigs()

    // 注册键盘事件监听 (网页版)
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.keydownHandler!)
    }

    // 如果在Electron环境，处理全局快捷键
    if (electronService.isElectron()) {
      await this.registerGlobalShortcuts()
    }

    this.isInitialized = true
  }

  /**
   * 销毁快捷键服务
   */
  destroy(): void {
    if (typeof document !== 'undefined' && this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler)
    }

    if (electronService.isElectron()) {
      this.unregisterAllGlobalShortcuts()
      // 移除全局快捷键监听器
      electronService.removeAllListeners('shortcut:triggered')
    }

    this.actions.clear()
    this.bindings.clear()
    this.globalBindings.clear()
    this.userBindings.clear()
    this.isInitialized = false
    this.globalListenerSetup = false
  }

  /**
   * 注册动作
   */
  registerAction(action: ShortcutAction): void {
    this.actions.set(action.id, action)
  }

  /**
   * 批量注册动作
   */
  registerActions(actions: ShortcutAction[]): void {
    actions.forEach(action => this.registerAction(action))
  }

  /**
   * 注销动作
   */
  async unregisterAction(actionId: string): Promise<void> {
    this.actions.delete(actionId)
    // 同时移除关联的快捷键绑定
    await this.removeBindingsByActionId(actionId)
  }

  /**
   * 绑定快捷键
   */
  async bindShortcut(binding: ShortcutBinding, isUserCustom: boolean = false): Promise<boolean> {
    if (!this.actions.has(binding.actionId)) {
      console.warn(`动作 ${binding.actionId} 不存在，无法绑定快捷键`)
      return false
    }

    // 移除已存在的相同快捷键
    await this.unbindShortcut(binding.shortcut)

    // 如果是用户自定义快捷键，还需要移除该动作的其他快捷键绑定
    if (isUserCustom) {
      await this.removeBindingsByActionId(binding.actionId)
    }

    this.bindings.set(binding.shortcut, binding)

    // 如果是用户自定义快捷键，保存到用户绑定映射中
    if (isUserCustom) {
      // 先移除该动作的其他用户绑定（按actionId覆盖）
      const existingUserBindings = Array.from(this.userBindings.entries())
      for (const [shortcut, userBinding] of existingUserBindings) {
        if (userBinding.actionId === binding.actionId && shortcut !== binding.shortcut) {
          this.userBindings.delete(shortcut)
        }
      }

      this.userBindings.set(binding.shortcut, binding)
      await this.saveUserBindings()
    }

    // 如果是全局快捷键且在Electron环境，注册到主进程
    // 只有在用户自定义时才立即注册，初始化时由registerGlobalShortcuts统一处理
    if (binding.isGlobal && electronService.isElectron() && isUserCustom) {
      try {
        const success = await electronService.invoke('shortcut:register', binding.shortcut, binding.actionId)
        if (success) {
          this.globalBindings.set(binding.shortcut, binding)
          return true
        } else {
          console.warn(`全局快捷键 ${binding.shortcut} 注册失败`)
          // 降级为本地快捷键
          binding.isGlobal = false
        }
      } catch (error) {
        console.error(`注册全局快捷键失败:`, error)
        binding.isGlobal = false
      }
    }

    return true
  }

  /**
   * 解绑快捷键
   */
  async unbindShortcut(shortcut: string): Promise<void> {
    const binding = this.bindings.get(shortcut)
    if (binding) {
      this.bindings.delete(shortcut)

      // 如果是用户自定义快捷键，也从用户绑定中删除
      if (this.userBindings.has(shortcut)) {
        this.userBindings.delete(shortcut)
        await this.saveUserBindings()
      }

      // 如果是全局快捷键，从主进程注销
      if (binding.isGlobal && electronService.isElectron()) {
        try {
          await electronService.invoke('shortcut:unregister', shortcut)
          this.globalBindings.delete(shortcut)
        } catch (error) {
          console.error(`注销全局快捷键失败:`, error)
        }
      }
    }
  }

  /**
   * 执行动作
   */
  async executeAction(actionId: string, ...args: any[]): Promise<boolean> {
    console.warn('[ShortcutService] executeAction:', actionId)
    const action = this.actions.get(actionId)
    if (!action) {
      console.warn(`动作 ${actionId} 不存在`)
      return false
    }

    try {
      await action.callback(...args)
      console.warn('[ShortcutService] executeAction done:', actionId)
      return true
    } catch (error) {
      console.error(`执行动作 ${actionId} 失败:`, error)
      return false
    }
  }

  /**
   * 获取所有动作
   */
  getAllActions(): ShortcutAction[] {
    return Array.from(this.actions.values())
  }

  /**
   * 获取所有快捷键绑定
   */
  getAllBindings(): ShortcutBinding[] {
    return Array.from(this.bindings.values())
  }

  /**
   * 根据类别获取动作
   */
  getActionsByCategory(category: string): ShortcutAction[] {
    return this.getAllActions().filter(action => action.category === category)
  }

  /**
   * 搜索动作
   */
  searchActions(query: string): ShortcutAction[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllActions().filter(action =>
      action.title.toLowerCase().includes(lowerQuery) ||
      action.description?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 获取动作的快捷键绑定
   */
  getBindingsByActionId(actionId: string): ShortcutBinding[] {
    return this.getAllBindings().filter(binding => binding.actionId === actionId)
  }

  /**
   * 检查快捷键是否已被占用
   */
  isShortcutTaken(shortcut: string): boolean {
    return this.bindings.has(shortcut)
  }

  /**
   * 导出配置
   */
  exportConfig(): ShortcutConfig {
    return {
      actions: this.getAllActions(),
      bindings: this.getAllBindings()
    }
  }

  /**
   * 导入配置
   */
  async importConfig(config: ShortcutConfig): Promise<void> {
    // 清除现有配置
    await this.clearAllBindings()
    this.actions.clear()

    // 注册新的动作
    this.registerActions(config.actions)

    // 绑定新的快捷键
    for (const binding of config.bindings) {
      if (binding.enabled) {
        await this.bindShortcut(binding)
      }
    }
  }

  /**
   * 处理键盘按下事件 (网页版)
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // 跳过已经被处理过的事件
    if (event.defaultPrevented) {
      return
    }

    const shortcut = this.formatKeyboardEvent(event)
    if (shortcut === 'Ctrl+W') {
      console.warn('[ShortcutService] Ctrl+W detected, binding exists:', this.bindings.has(shortcut))
    }
    const binding = this.bindings.get(shortcut)

    // 只处理非全局快捷键，全局快捷键由主进程处理
    if (binding && binding.enabled && !binding.isGlobal) {
      // 检查是否在输入框等元素中，如果是则不处理某些快捷键
      const target = event.target as HTMLElement
      const isInputElement = target.tagName === 'INPUT' ||
                           target.tagName === 'TEXTAREA' ||
                           target.contentEditable === 'true' ||
                           target.isContentEditable

      // 对于输入框，只处理特定的快捷键
      if (isInputElement) {
        const allowedInInput = [
          'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
        ]
        const hasOnlyModifiers = shortcut.split('+').some(key =>
          allowedInInput.includes(key) ||
          shortcut.includes('Ctrl+') ||
          shortcut.includes('Alt+') ||
          shortcut.includes('Meta+')
        )

        if (!hasOnlyModifiers && !allowedInInput.some(key => shortcut.includes(key))) {
          return
        }
      }

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      // 添加标记防止重复处理
      Object.defineProperty(event, 'defaultPrevented', { value: true, writable: false })

      this.executeAction(binding.actionId)
    }
    // 对于全局快捷键，即使在Electron环境下也不在这里处理
    // 因为它们已经在主进程中注册，会通过IPC事件触发
  }

  /**
   * 格式化键盘事件为快捷键字符串
   */
  private formatKeyboardEvent(event: KeyboardEvent): string {
    const parts: string[] = []

    if (event.ctrlKey) parts.push('Ctrl')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')
    if (event.metaKey) parts.push('Meta')

    // 处理特殊键
    let key = event.key
    if (key === ' ') key = 'Space'
    else if (key === 'Enter') key = 'Enter'
    else if (key === 'Escape') key = 'Escape'
    else if (key === 'Tab') key = 'Tab'
    else if (key === 'Backspace') key = 'Backspace'
    else if (key === 'Delete') key = 'Delete'
    else if (key.startsWith('Arrow')) key = key.replace('Arrow', '')
    else if (key.startsWith('F') && /^F\d+$/.test(key)) {
      // 功能键保持原样
    } else {
      key = key.toUpperCase()
    }

    parts.push(key)
    return parts.join('+')
  }

  /**
   * 注册全局快捷键到主进程
   */
  private async registerGlobalShortcuts(): Promise<void> {
    // 先清理现有的全局快捷键
    await this.unregisterAllGlobalShortcuts()

    const globalBindings = this.getAllBindings().filter(binding => binding.isGlobal && binding.enabled)

    for (const binding of globalBindings) {
      try {
        const success = await electronService.invoke('shortcut:register', binding.shortcut, binding.actionId)
        if (success) {
          this.globalBindings.set(binding.shortcut, binding)
        } else {
          console.warn(`全局快捷键 ${binding.shortcut} 注册失败，降级为本地快捷键`)
          binding.isGlobal = false
        }
      } catch (error) {
        console.error(`注册全局快捷键失败:`, error)
        binding.isGlobal = false
      }
    }

    // 只监听一次全局快捷键事件
    this.setupGlobalShortcutListener()
  }

  /**
   * 设置全局快捷键监听器（避免重复监听）
   */
  private setupGlobalShortcutListener(): void {
    if (electronService.isElectron() && !this.globalListenerSetup) {
      electronService.on('shortcut:triggered', (actionId: string) => {
        this.executeAction(actionId)
      })

      this.globalListenerSetup = true
    }
  }

  /**
   * 注销所有全局快捷键
   */
  private async unregisterAllGlobalShortcuts(): Promise<void> {
    if (!electronService.isElectron()) return

    for (const shortcut of this.globalBindings.keys()) {
      try {
        await electronService.invoke('shortcut:unregister', shortcut)
      } catch (error) {
        console.error(`注销全局快捷键失败:`, error)
      }
    }

    this.globalBindings.clear()
  }

  /**
   * 清除所有快捷键绑定
   */
  private async clearAllBindings(): Promise<void> {
    const shortcuts = Array.from(this.bindings.keys())
    for (const shortcut of shortcuts) {
      await this.unbindShortcut(shortcut)
    }
  }

  /**
   * 根据动作ID移除绑定
   */
  private async removeBindingsByActionId(actionId: string): Promise<void> {
    const bindingsToRemove = this.getAllBindings().filter(binding => binding.actionId === actionId)
    for (const binding of bindingsToRemove) {
      await this.unbindShortcut(binding.shortcut)
    }
  }

  /**
   * 加载并合并配置
   */
  private async loadAndMergeConfigs(): Promise<void> {
    // 加载默认配置
    const defaultConfig = await this.getDefaultConfig()

    // 注册所有动作
    this.registerActions(defaultConfig.actions)

    // 加载用户自定义快捷键
    const userBindingsArray = await this.loadUserBindingsFromStorage()

    // 创建合并后的配置，用户配置优先
    const mergedBindings = this.mergeBindings(defaultConfig.bindings, userBindingsArray)

    // 清空现有绑定
    this.bindings.clear()

    // 应用合并后的配置
    for (const binding of mergedBindings) {
      if (binding.enabled) {
        // 直接设置，不调用bindShortcut以避免触发保存
        this.bindings.set(binding.shortcut, binding)

        // 如果是用户自定义的，也保存到userBindings中
        if (userBindingsArray.some(ub => ub.shortcut === binding.shortcut && ub.actionId === binding.actionId)) {
          this.userBindings.set(binding.shortcut, binding)
        }
      }
    }

  }

  /**
   * 获取默认配置
   */
  private async getDefaultConfig(): Promise<ShortcutConfig> {
    const { defaultShortcutConfig } = await import('../config/defaultShortcuts')
    return defaultShortcutConfig
  }

  /**
   * 保存用户自定义快捷键到本地存储
   */
  private async saveUserBindings(): Promise<void> {
    try {
      const userBindingsArray = Array.from(this.userBindings.values())
      await ConfigStorage.setItem(this.STORAGE_KEY, JSON.stringify(userBindingsArray))
    } catch (error) {
      console.error('保存用户自定义快捷键失败:', error)
    }
  }

  /**
   * 从本地存储加载用户自定义快捷键
   */
  private async loadUserBindingsFromStorage(): Promise<ShortcutBinding[]> {
    try {
      const stored = await ConfigStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const userBindingsArray: ShortcutBinding[] = JSON.parse(stored)
        return userBindingsArray.filter(binding => binding.enabled)
      }
    } catch (error) {
      console.error('加载用户自定义快捷键失败:', error)
    }
    return []
  }

  /**
   * 合并默认配置和用户配置
   */
  private mergeBindings(defaultBindings: ShortcutBinding[], userBindings: ShortcutBinding[]): ShortcutBinding[] {
    // 创建一个Map来存储按actionId索引的绑定
    const actionBindingsMap = new Map<string, ShortcutBinding>()

    // 先添加默认绑定
    for (const binding of defaultBindings) {
      if (binding.enabled) {
        actionBindingsMap.set(binding.actionId, binding)
      }
    }

    // 用户绑定覆盖默认绑定（按actionId）
    for (const userBinding of userBindings) {
      if (userBinding.enabled && this.actions.has(userBinding.actionId)) {
        actionBindingsMap.set(userBinding.actionId, userBinding)
      }
    }

    // 返回合并后的绑定数组
    return Array.from(actionBindingsMap.values())
  }

  /**
   * 重置到默认快捷键
   */
  async resetToDefaults(): Promise<void> {
    // 清除所有快捷键绑定
    await this.clearAllBindings()

    // 清除用户自定义快捷键
    this.userBindings.clear()
    await ConfigStorage.removeItem(this.STORAGE_KEY)

    // 重新加载并合并配置
    await this.loadAndMergeConfigs()

    // 重新注册全局快捷键
    if (electronService.isElectron()) {
      await this.registerGlobalShortcuts()
    }
  }

  /**
   * 检查快捷键是否为用户自定义
   */
  isUserCustomBinding(shortcut: string): boolean {
    return this.userBindings.has(shortcut)
  }

  /**
   * 获取所有用户自定义快捷键
   */
  getUserBindings(): ShortcutBinding[] {
    return Array.from(this.userBindings.values())
  }
}

// 创建单例实例
export const shortcutService = new ShortcutService()