import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Layout, LayoutItem, ReadonlyLayout } from '@hunmer/grid-layout-plus'
import ConfigStorage from '@renderer/utils/ConfigStorage'
import { cardRegistry } from '@renderer/components/tabs/dashboard/CardRegistry'
import i18n from '../i18n'

/**
 * Dashboard 布局持久化 Store（多 layout 版本）。
 *
 * 数据模型：
 * - 一个 Dashboard 由若干「布局（DashboardLayout）」组成，每个布局有自己独立的
 *   卡片实例集合（layout + instances）以及标题/图标。
 * - 同一时刻只有一个布局处于「激活」状态（activeLayoutId），界面只渲染激活布局。
 *
 * 持久化策略：
 * - localStorage（经 ConfigStorage）保存一个聚合键 `mira-dashboard-layouts`，
 *   内容为 { version, activeId, layouts: DashboardLayout[] }。
 * - 旧版本（单 layout）使用扁平的两个键 `mira-dashboard-layout` / `mira-dashboard-instances`，
 *   load() 时若新键不存在则自动迁移旧数据为一个默认布局，平滑升级。
 */

/** 聚合存储的 schema 版本，便于日后再次升级 */
const STORAGE_VERSION = 2
/** 新版聚合键 */
const LAYOUTS_KEY = 'mira-dashboard-layouts'
/** 旧版扁平键（仅用于一次性迁移） */
const LEGACY_LAYOUT_KEY = 'mira-dashboard-layout'
const LEGACY_INSTANCES_KEY = 'mira-dashboard-instances'

/** 卡片实例元数据：把 instanceId 关联到一个已注册的卡片 type */
export interface CardInstanceMeta {
  /** 卡片类型 id（对应 CardDefinition.type） */
  type: string
  /** 透传给卡片组件的 props（每实例独立） */
  props?: Record<string, any>
  /** 卡片实例的配置项（对应 CardDefinition.configFields，每实例独立） */
  config?: Record<string, any>
}

/** 单个布局的数据结构 */
export interface DashboardLayout {
  /** 唯一 id */
  id: string
  /** 展示标题 */
  name: string
  /** Material icon 名（可选，用于 tab 区分） */
  icon?: string
  /** 当前布局项（位置/尺寸） */
  layout: Layout
  /** instanceId -> 卡片实例元数据 */
  instances: Record<string, CardInstanceMeta>
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
  /**
   * 是否为默认布局。默认布局不可删除，用于保证 Dashboard 永远至少有一个布局。
   * 全局内同一时刻应只有一个 isDefault=true 的布局（load 时会校正）。
   */
  isDefault?: boolean
}

/** 聚合持久化结构 */
interface DashboardLayoutsData {
  version: number
  activeId: string | null
  layouts: DashboardLayout[]
}

/** 生成 id：时间戳 + 随机串 */
function genId(prefix: string): string {
  return `${prefix}__${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** 当前时间戳 */
function now(): number {
  return Date.now()
}

export const useDashboardLayoutStore = defineStore('dashboardLayout', () => {
  /** 所有布局 */
  const layouts = ref<DashboardLayout[]>([])
  /** 当前激活布局 id */
  const activeId = ref<string | null>(null)
  /** 是否已从存储加载完成 */
  const loaded = ref(false)

  /** 当前激活的布局（可能为 null，例如数据加载异常时） */
  const activeLayout = computed<DashboardLayout | null>(
    () => layouts.value.find((l) => l.id === activeId.value) ?? null,
  )

  /**
   * 实际可渲染的布局项：取激活布局，过滤掉「type 未注册 / 已被卸载」的孤儿项，
   * 避免布局里残留了已删除卡片类型导致渲染崩溃。
   * 无激活布局时返回空数组。
   */
  const renderableLayout = computed<Layout>(() => {
    const active = activeLayout.value
    if (!active) return []
    return active.layout.filter((item) => {
      const meta = active.instances[item.i]
      return !!meta && cardRegistry.has(meta.type)
    })
  })

  /** 读取 instance 元数据（基于激活布局） */
  function getMeta(instanceId: string | number): CardInstanceMeta | undefined {
    return activeLayout.value?.instances[String(instanceId)]
  }

  /** 标记激活布局为已更新（在本地修改后调用） */
  function touchActive() {
    const active = activeLayout.value
    if (active) active.updatedAt = now()
  }

  /**
   * 从存储加载布局数据。
   * - 优先读取新版聚合键；
   * - 若不存在，尝试从旧版扁平键迁移；
   * - 若都没有，初始化一个默认空布局。
   */
  async function load() {
    if (loaded.value) return
    try {
      const raw = await ConfigStorage.getItem(LAYOUTS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as DashboardLayoutsData
        layouts.value = (parsed.layouts ?? []).map((l) => ({
          ...l,
          // 对每个布局的 layout 做清洗，兼容历史脏数据
          layout: sanitizeLayout(l.layout ?? []),
          instances: l.instances ?? {},
        }))
        activeId.value =
          parsed.activeId && layouts.value.some((l) => l.id === parsed.activeId)
            ? parsed.activeId
            : layouts.value[0]?.id ?? null
      } else {
        // 尝试迁移旧版数据
        await migrateFromLegacy()
      }
      // 兜底：至少保证有一个布局
      if (layouts.value.length === 0) {
        const def = createLayout(i18n.global.t('stores.dashboardLayout.defaultLayoutName'), { isDefault: true })
        layouts.value = [def]
        activeId.value = def.id
      }
      if (!activeId.value) activeId.value = layouts.value[0].id
      // 校正默认布局标记：全局有且仅有一个 isDefault=true 的布局
      ensureSingleDefault()
      await persist()
    } catch (e) {
      console.warn('[dashboardLayout] 加载失败，使用空布局:', e)
      const def = createLayout(i18n.global.t('stores.dashboardLayout.defaultLayoutName'), { isDefault: true })
      layouts.value = [def]
      activeId.value = def.id
    } finally {
      loaded.value = true
    }
  }

  /** 从旧版扁平键迁移为一个默认布局 */
  async function migrateFromLegacy() {
    try {
      const [layoutRaw, instancesRaw] = await Promise.all([
        ConfigStorage.getItem(LEGACY_LAYOUT_KEY),
        ConfigStorage.getItem(LEGACY_INSTANCES_KEY),
      ])
      if (!layoutRaw && !instancesRaw) return
      const parsedLayout = layoutRaw ? (JSON.parse(layoutRaw) as Layout) : []
      const parsedInstances = instancesRaw
        ? (JSON.parse(instancesRaw) as Record<string, CardInstanceMeta>)
        : {}
      const def = createLayout(i18n.global.t('stores.dashboardLayout.defaultLayoutName'), {
        layout: sanitizeLayout(parsedLayout),
        instances: parsedInstances,
        isDefault: true,
      })
      layouts.value = [def]
      activeId.value = def.id
      console.info('[dashboardLayout] 已从旧版数据迁移到多布局模型')
    } catch (e) {
      console.warn('[dashboardLayout] 迁移旧数据失败:', e)
    }
  }

  /**
   * 清洗持久化的布局数据，确保满足 grid-layout-plus v2 的校验规则：
   * x/y/w/h 必须是「非负安全整数」（拒绝 Infinity / 负数 / NaN / 小数），
   * minW/minH/maxW/maxW 同理，且 maxW >= minW、maxH >= minH。
   *
   * 这尤其用于兼容从 v1.1.1 迁移过来、曾在 localStorage 里写入过 y: Infinity 的旧布局。
   * 任何字段非法的整项会被丢弃；返回新数组（与输入引用不同）表示发生过修正。
   */
  function sanitizeLayout(input: Layout): Layout {
    if (!Array.isArray(input)) return []
    let changed = false
    const out: Layout = []
    for (const item of input) {
      if (!item || typeof item.i === 'undefined') {
        changed = true
        continue
      }
      const fixed = sanitizeItem(item)
      if (!fixed) {
        changed = true
        continue
      }
      out.push(fixed)
      if (fixed !== item) changed = true
    }
    return changed ? out : input
  }

  /**
   * 校验并修正单个 LayoutItem；不可修正时返回 null。
   *
   * 对位置字段 x/y，非法值（含历史遗留的 Infinity）一律回退为 0，
   * 交由 grid-layout-plus 首次渲染时的 verticalCompactor + collisionMode='push'
   * 自动重新排布，从而保留卡片而非丢弃。
   */
  function sanitizeItem(item: LayoutItem): LayoutItem | null {
    const x = safeNonNegInt(item.x, 0)
    const y = safeNonNegInt(item.y, 0)
    const w = safeNonNegInt(item.w, 1)
    const h = safeNonNegInt(item.h, 1)
    if (x === null || y === null || w === null || h === null) return null

    // 统一克隆一份再改写，避免原地修改输入；最后判断是否真的变化过
    const next: LayoutItem = { ...item }
    next.x = x
    next.y = y
    next.w = w
    next.h = h

    // 可选约束字段：仅清洗存在的项
    for (const key of ['minW', 'minH', 'maxW', 'maxH'] as const) {
      const v = (next as any)[key]
      if (v === undefined) continue
      const cleaned = safeNonNegInt(v)
      if (cleaned === null) delete (next as any)[key]
      else (next as any)[key] = cleaned
    }
    // 保证 max >= min
    if (next.minW !== undefined && next.maxW !== undefined && next.maxW < next.minW) {
      next.maxW = next.minW
    }
    if (next.minH !== undefined && next.maxH !== undefined && next.maxH < next.minH) {
      next.maxH = next.minH
    }

    // 与原 item 逐字段对比，未变化则原样返回（保持引用相等 → 不触发 changed）
    const sameConstraints =
      next.minW === item.minW &&
      next.minH === item.minH &&
      next.maxW === item.maxW &&
      next.maxH === item.maxH
    if (
      item.x === next.x &&
      item.y === next.y &&
      item.w === next.w &&
      item.h === next.h &&
      sameConstraints
    ) {
      return item
    }
    return next
  }

  /** 返回合法的非负安全整数；非法时返回 null（fallback 仅用于 w/h 至少为 1） */
  function safeNonNegInt(v: unknown, fallback?: number): number | null {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      return fallback !== undefined ? fallback : null
    }
    return v
  }

  /** 持久化布局与实例映射 */
  async function persist() {
    try {
      const data: DashboardLayoutsData = {
        version: STORAGE_VERSION,
        activeId: activeId.value,
        layouts: layouts.value,
      }
      await ConfigStorage.setItem(LAYOUTS_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('[dashboardLayout] 保存失败:', e)
    }
  }

  /** 构造一个新的 DashboardLayout（内部使用） */
  function createLayout(
    name: string,
    init?: Partial<Pick<DashboardLayout, 'layout' | 'instances' | 'icon' | 'isDefault'>>,
  ): DashboardLayout {
    const ts = now()
    return {
      id: genId('layout'),
      name,
      icon: init?.icon,
      layout: init?.layout ?? [],
      instances: init?.instances ?? {},
      createdAt: ts,
      updatedAt: ts,
      isDefault: init?.isDefault,
    }
  }

  /**
   * 校正默认布局标记，保证全局内「有且仅有一个 isDefault=true」的布局。
   * - 若没有任何布局被标记为默认，则把第一个布局设为默认；
   * - 若有多个被标记，则只保留第一个，其余清除标记。
   * 在 load() 之后、以及任何可能改变默认布局存在性的操作后调用。
   */
  function ensureSingleDefault() {
    if (layouts.value.length === 0) return
    let found = false
    for (const l of layouts.value) {
      if (!found && l.isDefault) {
        found = true
      } else {
        l.isDefault = false
      }
    }
    if (!found) layouts.value[0].isDefault = true
  }

  /** 判断指定布局是否为（不可删除的）默认布局 */
  function isDefaultLayout(id: string): boolean {
    return !!layouts.value.find((l) => l.id === id)?.isDefault
  }

  /**
   * 添加一个卡片实例（写入激活布局）。
   * @param type 卡片类型（需已在 cardRegistry 注册）
   * @param position 可选初始位置；默认追加到布局底部
   * @returns 新实例的 instanceId，失败返回 null
   */
  async function addCard(type: string, position?: { x?: number; y?: number }): Promise<string | null> {
    const active = activeLayout.value
    if (!active) return null
    const def = cardRegistry.get(type)
    if (!def) {
      console.warn(`[dashboardLayout] 卡片类型 "${type}" 未注册`)
      return null
    }
    // 生成唯一 instanceId：type + 时间戳 + 随机
    const instanceId = `${type}__${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    // 未指定位置时，追加到现有布局最下方（y = 现有最大 y+h）。
    // grid-layout-plus v2 校验拒绝 Infinity，必须给出具体非负整数。
    const nextY = computeNextRowY()
    const item = cardRegistry.buildLayoutItem(type, instanceId, {
      x: position?.x ?? 0,
      y: position?.y ?? nextY,
    })
    if (!item) return null

    active.layout = [...active.layout, item]
    active.instances = {
      ...active.instances,
      [instanceId]: {
        type,
        props: { ...(def.defaultProps ?? {}) },
        // 用卡片类型的默认配置初始化实例配置（若有）
        config: { ...(def.defaultConfig ?? {}) },
      },
    }
    touchActive()
    await persist()
    return instanceId
  }

  /**
   * 计算激活布局的「下一空行」y 坐标：取所有项 (y + h) 的最大值。
   * 空布局返回 0。
   */
  function computeNextRowY(): number {
    const active = activeLayout.value
    if (!active || active.layout.length === 0) return 0
    return active.layout.reduce((max, item) => Math.max(max, item.y + item.h), 0)
  }

  /** 删除一个卡片实例（从激活布局） */
  async function removeCard(instanceId: string) {
    const active = activeLayout.value
    if (!active) return
    active.layout = active.layout.filter((item) => item.i !== instanceId)
    const next = { ...active.instances }
    delete next[instanceId]
    active.instances = next
    touchActive()
    await persist()
  }

  /**
   * grid-layout-plus 通过 v-model:layout / @update:layout 回传新的 Layout 数组。
   * v2 的 update:layout 事件传入的是 ReadonlyLayout（深只读），这里深拷贝成可变 Layout
   * 再写入激活布局的 state 并持久化（debounce 由调用方按需加）。
   */
  function applyLayout(next: ReadonlyLayout) {
    const active = activeLayout.value
    if (!active) return
    active.layout = next.map((item): LayoutItem => ({ ...item }))
    touchActive()
    persist()
  }

  /** 更新某个实例的 props（基于激活布局） */
  async function updateInstanceProps(instanceId: string, props: Record<string, any>) {
    const active = activeLayout.value
    if (!active || !active.instances[instanceId]) return
    const cur = active.instances[instanceId]
    active.instances = {
      ...active.instances,
      [instanceId]: { ...cur, props: { ...cur.props, ...props } },
    }
    touchActive()
    await persist()
  }

  /** 整体替换某个实例的配置项（配置对话框保存时调用，基于激活布局） */
  async function updateInstanceConfig(instanceId: string, config: Record<string, any>) {
    const active = activeLayout.value
    if (!active || !active.instances[instanceId]) return
    const cur = active.instances[instanceId]
    active.instances = {
      ...active.instances,
      [instanceId]: { ...cur, config: { ...config } },
    }
    touchActive()
    await persist()
  }

  /** 取某个实例当前生效的配置（与类型 defaultConfig 合并，实例值优先；基于激活布局） */
  function getConfig(instanceId: string | number): Record<string, any> {
    const active = activeLayout.value
    if (!active) return {}
    const meta = active.instances[String(instanceId)]
    if (!meta) return {}
    return cardRegistry.resolveConfig(meta.type, meta.config)
  }

  // ============== 布局（layout）管理 ==============

  /** 新增一个布局并切换为激活 */
  async function addLayout(name: string, icon?: string): Promise<string | null> {
    const trimmed = name.trim()
    if (!trimmed) return null
    const layout = createLayout(trimmed, { icon })
    layouts.value = [...layouts.value, layout]
    activeId.value = layout.id
    await persist()
    return layout.id
  }

  /** 重命名一个布局 */
  async function renameLayout(id: string, name: string): Promise<boolean> {
    const trimmed = name.trim()
    if (!trimmed) return false
    const target = layouts.value.find((l) => l.id === id)
    if (!target) return false
    target.name = trimmed
    target.updatedAt = now()
    await persist()
    return true
  }

  /** 更新一个布局的图标 */
  async function updateLayoutIcon(id: string, icon?: string): Promise<boolean> {
    const target = layouts.value.find((l) => l.id === id)
    if (!target) return false
    target.icon = icon
    target.updatedAt = now()
    await persist()
    return true
  }

  /**
   * 删除一个布局。
   * - 不允许删除默认布局（isDefault=true 的布局永远保留）。
   * - 删除当前激活布局时，自动切换到剩余布局中的第一个。
   * @returns 是否删除成功
   */
  async function removeLayout(id: string): Promise<boolean> {
    if (isDefaultLayout(id)) {
      console.warn('[dashboardLayout] 默认布局不可删除')
      return false
    }
    const idx = layouts.value.findIndex((l) => l.id === id)
    if (idx === -1) return false
    layouts.value = layouts.value.filter((l) => l.id !== id)
    if (activeId.value === id) {
      activeId.value = layouts.value[0].id
    }
    await persist()
    return true
  }

  /** 切换激活布局 */
  async function switchLayout(id: string) {
    if (!layouts.value.some((l) => l.id === id)) return
    if (activeId.value === id) return
    activeId.value = id
    await persist()
  }

  /** 复制一个布局（含其全部卡片与配置） */
  async function duplicateLayout(id: string, newName?: string): Promise<string | null> {
    const src = layouts.value.find((l) => l.id === id)
    if (!src) return null
    // 复制时给每个卡片实例生成新的 instanceId，避免冲突
    const idMap = new Map<string, string>()
    const newInstances: Record<string, CardInstanceMeta> = {}
    for (const [oldId, meta] of Object.entries(src.instances)) {
      const newId = genId(meta.type)
      idMap.set(oldId, newId)
      newInstances[newId] = { ...meta, props: { ...meta.props }, config: { ...meta.config } }
    }
    const newLayoutItems: Layout = src.layout.map((item) => {
      const mapped = idMap.get(String(item.i)) ?? String(item.i)
      return { ...item, i: mapped }
    })
    const layout = createLayout(newName?.trim() || (src.name + i18n.global.t('stores.dashboardLayout.duplicateLayoutSuffix')), {
      layout: newLayoutItems,
      instances: newInstances,
      icon: src.icon,
    })
    layouts.value = [...layouts.value, layout]
    activeId.value = layout.id
    await persist()
    return layout.id
  }

  /** 清空所有布局（重置为单个默认空布局） */
  async function clearAll() {
    const def = createLayout(i18n.global.t('stores.dashboardLayout.defaultLayoutName'), { isDefault: true })
    layouts.value = [def]
    activeId.value = def.id
    await persist()
  }

  return {
    // state
    layouts,
    activeId,
    loaded,
    // getters
    activeLayout,
    renderableLayout,
    isDefaultLayout,
    // 卡片实例（基于激活布局）
    getMeta,
    load,
    persist,
    addCard,
    removeCard,
    applyLayout,
    updateInstanceProps,
    updateInstanceConfig,
    getConfig,
    // 布局管理
    addLayout,
    renameLayout,
    updateLayoutIcon,
    removeLayout,
    switchLayout,
    duplicateLayout,
    clearAll,
  }
})
