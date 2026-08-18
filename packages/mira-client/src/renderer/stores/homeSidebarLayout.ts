import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ConfigStorage from '@renderer/utils/ConfigStorage'
import { ALL_MODULE_IDS, isKnownModule, type SidebarModuleId } from '@renderer/views/HomeView/sidebarModules'

/**
 * HomeSidebar 布局持久化 Store。
 *
 * 仅持久化「已启用模块 id 的有序列表」（enabledIds），其余模块视为「未启用」。
 *
 * 两个核心诉求并存，且必须正确区分：
 *   1. 用户可以禁用某个模块（持久化里没有它 → 不显示）。
 *   2. 代码里新增一个模块时，老用户升级后能自动看到新模块（默认启用）。
 *
 * 历史教训：早期版本用一个「无条件补齐缺失模块」的 sanitize，导致诉求 1 失效 ——
 * 用户刚把模块拖到「未启用」，setEnabled 写回时 sanitize 又把它补回启用区，
 * 表现为「禁用不生效、刷新后全部恢复已启用」。
 *
 * 正确做法：用持久化 `version` 区分「代码新增模块」与「用户主动禁用」。
 *   - 读取时比较存储里的 version 与当前 SCHEMA_VERSION：
 *       - 旧版本里完全没有的模块（代码新引入的）→ 视为「新模块」，默认启用，追加到末尾。
 *       - 当前版本里已有、但用户把它从 enabled 里移除的模块 → 视为「用户已禁用」，保持禁用。
 *   - 这样既能让新模块自动启用，又能保留用户的禁用意图。
 *
 * 持久化格式：`{ version: number, enabled: SidebarModuleId[] }`
 * 持久化 key：`mira-home-sidebar-layout`（与 dashboard 的 mira-dashboard-layout 区分开）。
 */

const LAYOUT_KEY = 'mira-home-sidebar-layout'

/**
 * 布局数据结构版本：每次新增 / 重命名 / 拆分模块时 +1，触发迁移。
 *
 * 版本历史：
 * - v1：shortcuts / folders / tags / history（history 是合并的「最新添加·历史查看」）
 * - v2：把 history 拆成 recent_added + recent_viewed 两个独立模块
 * - v3：新增 local_files 本地文件模块
 */
const SCHEMA_VERSION = 3

/**
 * 旧版本里存在、但当前版本已废弃的模块 id → 替换为的 id 列表（按顺序插入到原位置）。
 * 用于「拆分 / 重命名模块」的迁移：旧用户的布局里残留旧 id 时，原位展开成新 id，
 * 保持用户原本的顺序意图。
 */
const STALE_ID_REPLACEMENTS: Record<string, SidebarModuleId[]> = {
  // v1 的 history 在 v2 拆成两个模块，原位展开（保持其在侧栏中的相对位置）
  history: ['recent_added', 'recent_viewed'],
}

const MODULES_INTRODUCED_IN_VERSION: Record<number, SidebarModuleId[]> = {
  2: ['recent_added', 'recent_viewed'],
  3: ['local_files'],
}

interface PersistedLayout {
  version: number
  enabled: SidebarModuleId[]
}

export const useHomeSidebarLayoutStore = defineStore('homeSidebarLayout', () => {
  /** 已启用模块 id（有序）；未在此列表中的模块视为「未启用」 */
  const enabledIds = ref<SidebarModuleId[]>([...ALL_MODULE_IDS])
  /** 是否已从存储加载完成 */
  const loaded = ref(false)

  /** 未启用模块 id：取 ALL_MODULE_IDS 中不在 enabledIds 的项，保持固定顺序 */
  const disabledIds = computed<SidebarModuleId[]>(() =>
    ALL_MODULE_IDS.filter((id) => !enabledIds.value.includes(id)),
  )

  /** 从存储加载并执行版本迁移 */
  async function load() {
    if (loaded.value) return
    try {
      const raw = await ConfigStorage.getItem(LAYOUT_KEY)
      if (!raw) {
        // 首次使用：全部模块默认启用
        enabledIds.value = [...ALL_MODULE_IDS]
      } else {
        const parsed: unknown = JSON.parse(raw)
        enabledIds.value = migrate(parsed)
      }
    } catch (e) {
      console.warn('[homeSidebarLayout] 加载失败，使用默认布局:', e)
      enabledIds.value = [...ALL_MODULE_IDS]
    } finally {
      loaded.value = true
    }
  }

  /**
   * 版本迁移 + 清洗：
   * 1. 兼容旧格式（裸数组 / 缺 version 的对象）。
   * 2. 仅保留已知 id、去重。
   * 3. 若存储版本落后于 SCHEMA_VERSION：把「该旧版本完全不认识的模块」
   *    （即在本版本之前的 ALL_MODULE_IDS 里都不存在的新模块）默认启用，追加到末尾。
   *    —— 这样代码新增模块能自动启用，而用户在当前版本内主动禁用的模块不会被打扰。
   */
  function migrate(parsed: unknown): SidebarModuleId[] {
    // 兼容旧格式
    let storedVersion = SCHEMA_VERSION
    let storedEnabled: unknown[] = []
    if (Array.isArray(parsed)) {
      // 极旧格式：裸数组
      storedEnabled = parsed
      storedVersion = 0
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as Partial<PersistedLayout>
      if (Array.isArray(obj.enabled)) storedEnabled = obj.enabled
      if (typeof obj.version === 'number') storedVersion = obj.version
    }

    // 先把旧版本里废弃的 id 原位展开成新 id（如 history → recent_added + recent_viewed），
    // 再做清洗。展开在 sanitize 之前，保证旧 id 被替换而非被丢弃。
    const expanded = expandStaleIds(storedEnabled)
    // 清洗用户保存的启用列表（过滤未知 id + 去重，保留顺序）
    const cleaned = sanitize(expanded)

    // 版本落后 → 追加本版本新引入的模块（默认启用）
    if (storedVersion < SCHEMA_VERSION) {
      // 注意：这里无法精确知道「旧版本认识哪些模块」，因为历史上没记录。
      // 保守策略：只有当 cleaned 非空（用户已有布局意图）时，才追加 cleaned 里缺失的模块；
      // cleaned 为空（无任何启用记录）则回退为全部启用。
      if (cleaned.length === 0) {
        return [...ALL_MODULE_IDS]
      }
      const enabled = new Set<SidebarModuleId>(cleaned)
      for (let version = Math.max(1, storedVersion + 1); version <= SCHEMA_VERSION; version++) {
        for (const id of MODULES_INTRODUCED_IN_VERSION[version] || []) {
          if (!enabled.has(id)) {
            enabled.add(id)
            cleaned.push(id)
          }
        }
      }
    }
    return cleaned
  }

  /**
   * 原位展开废弃 id：遍历输入，遇到 STALE_ID_REPLACEMENTS 里登记的旧 id 时，
   * 用其替换列表（一个或多个新 id）按顺序插入到原位置；其余原样保留。
   * 用于加载迁移路径。
   */
  function expandStaleIds(input: unknown[]): unknown[] {
    const out: unknown[] = []
    for (const item of input) {
      if (typeof item === 'string' && STALE_ID_REPLACEMENTS[item]) {
        out.push(...STALE_ID_REPLACEMENTS[item])
      } else {
        out.push(item)
      }
    }
    return out
  }

  /**
   * 仅清洗：过滤未知 id + 去重（保持首次出现位置）。
   * **不会**自动补齐缺失模块 —— 否则用户禁用某模块后会被立刻重新启用。
   * 用于用户编辑（setEnabled）路径。
   */
  function sanitize(input: unknown[]): SidebarModuleId[] {
    const seen = new Set<string>()
    const ordered: SidebarModuleId[] = []
    for (const item of input) {
      if (typeof item !== 'string' || !isKnownModule(item) || seen.has(item)) continue
      seen.add(item)
      ordered.push(item)
    }
    return ordered
  }

  /** 持久化（写当前 SCHEMA_VERSION） */
  async function persist() {
    try {
      const data: PersistedLayout = {
        version: SCHEMA_VERSION,
        enabled: enabledIds.value,
      }
      await ConfigStorage.setItem(LAYOUT_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('[homeSidebarLayout] 保存失败:', e)
    }
  }

  /** 整体替换已启用列表（对话框跨区拖拽 / 排序后调用）—— 仅清洗，不补齐 */
  async function setEnabled(next: SidebarModuleId[]) {
    enabledIds.value = sanitize(next)
    await persist()
  }

  /** 启用单个模块（追加到末尾） */
  async function enableModule(id: SidebarModuleId) {
    if (enabledIds.value.includes(id)) return
    enabledIds.value = [...enabledIds.value, id]
    await persist()
  }

  /** 禁用单个模块 */
  async function disableModule(id: SidebarModuleId) {
    enabledIds.value = enabledIds.value.filter((x) => x !== id)
    await persist()
  }

  /** 判断模块是否已启用 */
  function isEnabled(id: SidebarModuleId): boolean {
    return enabledIds.value.includes(id)
  }

  return {
    enabledIds,
    disabledIds,
    loaded,
    load,
    persist,
    setEnabled,
    enableModule,
    disableModule,
    isEnabled,
  }
})
