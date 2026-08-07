import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Layout, ReadonlyLayout } from 'grid-layout-plus'
import ConfigStorage from '@renderer/utils/ConfigStorage'
import { cardRegistry } from '@renderer/components/tabs/dashboard/CardRegistry'

/**
 * Dashboard 布局持久化 Store。
 *
 * 持久化策略：
 * - localStorage（经 ConfigStorage 封装）保存两份数据：
 *   1) `mira-dashboard-layout`：LayoutItem[]（位置/尺寸），key 为 instanceId
 *   2) `mira-dashboard-instances`：instanceId -> { type, props? } 映射，记录每个实例是哪类卡片
 * - 读取时合并两份：若 Layout 中存在某个 instanceId 但 instances 里没有对应 type，
 *   说明卡片类型已卸载，则忽略该项（避免渲染报错）。
 */

const LAYOUT_KEY = 'mira-dashboard-layout'
const INSTANCES_KEY = 'mira-dashboard-instances'

/** 卡片实例元数据：把 instanceId 关联到一个已注册的卡片 type */
export interface CardInstanceMeta {
  /** 卡片类型 id（对应 CardDefinition.type） */
  type: string
  /** 透传给卡片组件的 props（每实例独立） */
  props?: Record<string, any>
  /** 卡片实例的配置项（对应 CardDefinition.configFields，每实例独立） */
  config?: Record<string, any>
}

export const useDashboardLayoutStore = defineStore('dashboardLayout', () => {
  /** 当前布局项（位置/尺寸） */
  const layout = ref<Layout>([])
  /** instanceId -> 卡片实例元数据 */
  const instances = ref<Record<string, CardInstanceMeta>>({})
  /** 是否已从存储加载完成 */
  const loaded = ref(false)

  /**
   * 实际可渲染的布局项：过滤掉「type 未注册 / 已被卸载」的孤儿项，
   * 避免布局里残留了已删除卡片类型导致渲染崩溃。
   */
  const renderableLayout = computed<Layout>(() =>
    layout.value.filter((item) => {
      const meta = instances.value[item.i]
      return !!meta && cardRegistry.has(meta.type)
    }),
  )

  /** 读取 instance 元数据 */
  function getMeta(instanceId: string | number): CardInstanceMeta | undefined {
    return instances.value[String(instanceId)]
  }

  /** 从存储加载布局与实例映射 */
  async function load() {
    if (loaded.value) return
    try {
      const [layoutRaw, instancesRaw] = await Promise.all([
        ConfigStorage.getItem(LAYOUT_KEY),
        ConfigStorage.getItem(INSTANCES_KEY),
      ])
      const parsed = layoutRaw ? (JSON.parse(layoutRaw) as Layout) : []
      layout.value = sanitizeLayout(parsed)
      instances.value = instancesRaw ? (JSON.parse(instancesRaw) as Record<string, CardInstanceMeta>) : {}
      // 清洗若修正了数据，立即回写一次，避免下次再加载到坏数据
      if (layout.value !== parsed) persist()
    } catch (e) {
      console.warn('[dashboardLayout] 加载失败，使用空布局:', e)
      layout.value = []
      instances.value = {}
    } finally {
      loaded.value = true
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
  function sanitizeItem(item: Layout[number]): Layout[number] | null {
    const x = safeNonNegInt(item.x, 0)
    const y = safeNonNegInt(item.y, 0)
    const w = safeNonNegInt(item.w, 1)
    const h = safeNonNegInt(item.h, 1)
    if (x === null || y === null || w === null || h === null) return null

    // 统一克隆一份再改写，避免原地修改输入；最后判断是否真的变化过
    const next: Layout[number] = { ...item }
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
      await Promise.all([
        ConfigStorage.setItem(LAYOUT_KEY, JSON.stringify(layout.value)),
        ConfigStorage.setItem(INSTANCES_KEY, JSON.stringify(instances.value)),
      ])
    } catch (e) {
      console.warn('[dashboardLayout] 保存失败:', e)
    }
  }

  /**
   * 添加一个卡片实例。
   * @param type 卡片类型（需已在 cardRegistry 注册）
   * @param position 可选初始位置；默认追加到布局底部
   * @returns 新实例的 instanceId，失败返回 null
   */
  async function addCard(type: string, position?: { x?: number; y?: number }): Promise<string | null> {
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

    layout.value = [...layout.value, item]
    instances.value = {
      ...instances.value,
      [instanceId]: {
        type,
        props: { ...(def.defaultProps ?? {}) },
        // 用卡片类型的默认配置初始化实例配置（若有）
        config: { ...(def.defaultConfig ?? {}) },
      },
    }
    await persist()
    return instanceId
  }

  /**
   * 计算布局的「下一空行」y 坐标：取所有项 (y + h) 的最大值。
   * 空布局返回 0。
   */
  function computeNextRowY(): number {
    if (layout.value.length === 0) return 0
    return layout.value.reduce((max, item) => Math.max(max, item.y + item.h), 0)
  }

  /** 删除一个卡片实例 */
  async function removeCard(instanceId: string) {
    layout.value = layout.value.filter((item) => item.i !== instanceId)
    const next = { ...instances.value }
    delete next[instanceId]
    instances.value = next
    await persist()
  }

  /**
   * grid-layout-plus 通过 v-model:layout / @update:layout 回传新的 Layout 数组。
   * v2 的 update:layout 事件传入的是 ReadonlyLayout（深只读），这里深拷贝成可变 Layout
   * 再写入 state 并持久化（debounce 由调用方按需加）。
   */
  function applyLayout(next: ReadonlyLayout) {
    layout.value = next.map((item): Layout[number] => ({ ...item }))
    persist()
  }

  /** 更新某个实例的 props */
  async function updateInstanceProps(instanceId: string, props: Record<string, any>) {
    if (!instances.value[instanceId]) return
    instances.value = {
      ...instances.value,
      [instanceId]: { ...instances.value[instanceId], props: { ...instances.value[instanceId].props, ...props } },
    }
    await persist()
  }

  /** 整体替换某个实例的配置项（配置对话框保存时调用） */
  async function updateInstanceConfig(instanceId: string, config: Record<string, any>) {
    if (!instances.value[instanceId]) return
    instances.value = {
      ...instances.value,
      [instanceId]: { ...instances.value[instanceId], config: { ...config } },
    }
    await persist()
  }

  /** 取某个实例当前生效的配置（与类型 defaultConfig 合并，实例值优先） */
  function getConfig(instanceId: string | number): Record<string, any> {
    const meta = instances.value[String(instanceId)]
    if (!meta) return {}
    return cardRegistry.resolveConfig(meta.type, meta.config)
  }

  /** 清空所有卡片（不删除已注册的类型定义） */
  async function clearAll() {
    layout.value = []
    instances.value = {}
    await persist()
  }

  return {
    layout,
    instances,
    loaded,
    renderableLayout,
    getMeta,
    load,
    persist,
    addCard,
    removeCard,
    applyLayout,
    updateInstanceProps,
    updateInstanceConfig,
    getConfig,
    clearAll,
  }
})
