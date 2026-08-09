import type { Component } from 'vue'
import type { LayoutItem } from 'grid-layout-plus'
import type { z } from 'zod'
import type { SchemaField } from '@/renderer/components/business/SchemaForm'
import i18n from '../../../i18n'

/**
 * 卡片注册表 —— Dashboard 可自由添加卡片的「管理器」。
 *
 * 设计参考了 TabRegistry：单例 + register/getAll 模式，第三方模块（含插件）
 * 可在运行时注册自定义卡片类型；HomeTabView 仅消费已注册的定义。
 *
 * 一个 CardDefinition 描述「这类卡片长什么样、默认多大」，但并不保存布局位置。
 * 实际的位置/尺寸（x/y/w/h）由 dashboardLayout store 按 instanceId 持久化。
 */

/** 卡片默认尺寸建议（grid 单位） */
export interface CardSizeSuggestion {
  /** 默认宽（列数） */
  defaultW: number
  /** 默认高（行数） */
  defaultH: number
  /** 最小宽 */
  minW?: number
  /** 最小高 */
  minH?: number
  /** 最大宽 */
  maxW?: number
  /** 最大高 */
  maxH?: number
}

/** 卡片点击行为描述，供卡片自身或外部决定如何响应点击 */
export type CardClickBehavior = 'none' | 'refresh' | 'navigate' | 'custom'

/**
 * 卡片配置字段描述。
 *
 * 直接复用 SchemaForm 的 SchemaField（与 PlaygroundPanel 的声明式表单一致），
 * 这样「打开小组件配置窗口」对话框可直接把 configFields 喂给 <SchemaForm>，
 * 无需在卡片侧重复定义控件渲染逻辑。字段联动可借助 zod refine / SchemaField 的
 * description 说明。
 */
export type CardConfigField = SchemaField

/**
 * 卡片类型定义。
 * - `component` 既可以是已注册的全局组件名（string），也可以是直接 import 的组件对象。
 *   使用异步组件 / defineAsyncComponent 可实现按需加载。
 */
export interface CardDefinition {
  /** 唯一类型 id，例如 'hitokoto' */
  type: string
  /** 展示名（用于「添加卡片」菜单） */
  title: string
  /** 描述（菜单副标题） */
  description?: string
  /** Material icon 名（与项目其余 UI 一致使用 <span class="material-icons">） */
  icon?: string
  /** 图标颜色（hex/rgb），可选 */
  iconColor?: string
  /** 是否在「添加卡片」菜单中展示（隐藏卡片仍可存在于布局中） */
  visibleInMenu?: boolean
  /** 默认尺寸约束 */
  size: CardSizeSuggestion
  /** 点击行为 */
  clickBehavior?: CardClickBehavior
  /** 渲染组件：组件对象或已注册的全局组件名 */
  component: Component | string
  /** 默认透传给卡片组件的 props（每个实例共享，注意不要传响应式引用） */
  defaultProps?: Record<string, any>

  /**
   * 卡片可配置项的字段定义（SchemaField[]）。声明后，「打开小组件配置窗口」
   * 对话框会把这些字段直接喂给 SchemaForm 自动渲染控件。
   * 未声明 configFields 的卡片在配置窗口里只展示「无可用配置」。
   */
  configFields?: CardConfigField[]
  /**
   * 配置项的 zod schema：数据类型 + 校验规则的单一真源，与 configFields 的 name 对齐。
   * 未提供时配置对话框退化为不做校验的宽松提交。
   */
  configSchema?: z.ZodType
  /** 配置项的默认值，新建卡片实例时会与 defaultProps 合并写入实例 */
  defaultConfig?: Record<string, any>
}

/** 注册结果 */
export interface CardRegistryResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 卡片注册表单例。
 *
 * 使用方式：
 * ```ts
 * import { cardRegistry } from '@renderer/components/tabs/dashboard/CardRegistry'
 * cardRegistry.register({ type: 'hitokoto', title: '一言', ... })
 * ```
 */
export class CardRegistry {
  private static instance: CardRegistry
  private definitions = new Map<string, CardDefinition>()

  private constructor() {}

  static getInstance(): CardRegistry {
    if (!CardRegistry.instance) {
      CardRegistry.instance = new CardRegistry()
    }
    return CardRegistry.instance
  }

  /** 注册一种卡片类型（重复注册同 type 会覆盖旧定义） */
  register(def: CardDefinition): CardRegistryResult {
    const validation = this.validate(def)
    if (!validation.success) return validation
    this.definitions.set(def.type, { visibleInMenu: true, ...def })
    return { success: true }
  }

  /** 批量注册 */
  registerAll(defs: CardDefinition[]): CardRegistryResult {
    for (const def of defs) {
      const r = this.register(def)
      if (!r.success) return r
    }
    return { success: true }
  }

  /** 取消注册 */
  unregister(type: string): CardRegistryResult {
    if (this.definitions.has(type)) {
      this.definitions.delete(type)
      return { success: true }
    }
    return { success: false, error: i18n.global.t('tabs.cardRegistry.typeNotFound', { type }) }
  }

  /** 是否已注册 */
  has(type: string): boolean {
    return this.definitions.has(type)
  }

  /** 获取单个定义 */
  get(type: string): CardDefinition | null {
    return this.definitions.get(type) ?? null
  }

  /** 获取所有定义 */
  getAll(): CardDefinition[] {
    return Array.from(this.definitions.values())
  }

  /** 获取所有在菜单中可见的定义 */
  getMenuVisible(): CardDefinition[] {
    return this.getAll().filter((d) => d.visibleInMenu !== false)
  }

  /** 某类卡片是否支持配置（声明了 configFields） */
  hasConfig(type: string): boolean {
    const def = this.get(type)
    return !!(def && def.configFields && def.configFields.length > 0)
  }

  /**
   * 取某类卡片某个实例当前生效的配置：实例自身 config 与类型 defaultConfig 合并，
   * 实例值优先。用于卡片渲染与配置对话框回填。
   */
  resolveConfig(type: string, instanceConfig?: Record<string, any>): Record<string, any> {
    const def = this.get(type)
    if (!def) return { ...(instanceConfig ?? {}) }
    return { ...(def.defaultConfig ?? {}), ...(instanceConfig ?? {}) }
  }

  /**
   * 基于卡片类型定义，构造一个可放入 Layout 的 LayoutItem。
   *
   * 注意：position 未提供时 y 默认为 0 —— grid-layout-plus v2 不再接受 Infinity，
   * 「追加到布局最下方」需要调用方根据现有 Layout 计算 nextY 后传入。
   * 调用方负责保证 x/y 不与现有项冲突（v2 默认 collisionMode='push' 会自动避让）。
   */
  buildLayoutItem(type: string, instanceId: string, position?: { x?: number; y?: number }): LayoutItem | null {
    const def = this.get(type)
    if (!def) return null
    const { defaultW, defaultH, minW, minH, maxW, maxH } = def.size
    const item: LayoutItem = {
      i: instanceId,
      x: position?.x ?? 0,
      y: position?.y ?? 0,
      w: defaultW,
      h: defaultH,
    }
    if (minW !== undefined) item.minW = minW
    if (minH !== undefined) item.minH = minH
    if (maxW !== undefined) item.maxW = maxW
    if (maxH !== undefined) item.maxH = maxH
    return item
  }

  /** 校验卡片定义 */
  validate(def: CardDefinition): CardRegistryResult {
    if (!def || !def.type || typeof def.type !== 'string') {
      return { success: false, error: i18n.global.t('tabs.cardRegistry.missingType') }
    }
    if (!def.title || typeof def.title !== 'string') {
      return { success: false, error: i18n.global.t('tabs.cardRegistry.missingTitle', { type: def.type }) }
    }
    if (!def.component) {
      return { success: false, error: i18n.global.t('tabs.cardRegistry.missingComponent', { type: def.type }) }
    }
    if (!def.size || typeof def.size.defaultW !== 'number' || typeof def.size.defaultH !== 'number') {
      return { success: false, error: i18n.global.t('tabs.cardRegistry.missingSize', { type: def.type }) }
    }
    return { success: true }
  }

  /** 清空（主要用于测试） */
  clear(): void {
    this.definitions.clear()
  }
}

/** 导出单例 */
export const cardRegistry = CardRegistry.getInstance()
