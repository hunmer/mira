import { ref, computed } from 'vue'
import { settingsApi } from '@/api/modules/settings'
import type { PluginSourceItem } from 'mira-app-core/shared/sdk'

export type PluginSource = PluginSourceItem

// localStorage 旧键（旧版本把插件源存在本地），一次性迁移到服务端后即删除
const SOURCES_KEY = 'mira.pluginSources'
const ACTIVE_KEY = 'mira.pluginSourceActive'
const LEGACY_KEY = 'mira.storePluginsUrl'

function genId() {
  return `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

// 模块级单例: 所有调用方共享同一份状态, 持久化在服务端 settings
const sources = ref<PluginSource[]>([])
const activeId = ref('')

async function persist() {
  await settingsApi.update({
    pluginSources: sources.value,
    pluginSourceActive: activeId.value,
  })
}

// 读取旧版 localStorage 数据 (存过才算, 用于判断"从未迁移过")
function readLegacy(): { sources: PluginSource[]; activeId: string } | null {
  try {
    const raw = localStorage.getItem(SOURCES_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : []
    const legacyUrl = (localStorage.getItem(LEGACY_KEY) || '').trim()
    if (legacyUrl && !list.some((s: PluginSource) => s.url === legacyUrl)) {
      list.push({ id: 'legacy', name: '默认源', url: legacyUrl })
    }
    return { sources: list, activeId: localStorage.getItem(ACTIVE_KEY) || '' }
  } catch {
    return null
  }
}

// 初始化: 从服务端读取插件源; 若本地存有旧版数据则合并迁移
const ready = (async () => {
  try {
    const s = await settingsApi.get()
    sources.value = Array.isArray(s.pluginSources) ? s.pluginSources : []
    activeId.value = s.pluginSourceActive || ''
  } catch {
    // 读取失败保持空列表, 后续操作保存时会再暴露错误
  }

  const legacy = readLegacy()
  if (legacy) {
    let changed = false
    for (const src of legacy.sources) {
      if (src?.url && !sources.value.some(s => s.url === src.url)) {
        sources.value.push({ id: src.id || genId(), name: src.name || src.url, url: src.url })
        changed = true
      }
    }
    if (legacy.activeId && sources.value.some(s => s.id === legacy.activeId)) {
      activeId.value = legacy.activeId
      changed = true
    }
    // 迁移完成, 清掉 localStorage 旧键, 避免重复迁移
    localStorage.removeItem(SOURCES_KEY)
    localStorage.removeItem(ACTIVE_KEY)
    localStorage.removeItem(LEGACY_KEY)
    if (changed) {
      try { await persist() } catch { /* 迁移落盘失败不影响本地展示 */ }
    }
  }
  if (!activeId.value) activeId.value = sources.value[0]?.id || ''
})()

export function usePluginSources() {
  // 当前选中的源
  const activeSource = computed(() => sources.value.find(s => s.id === activeId.value) || null)

  async function addSource(name: string, url: string) {
    const u = (url || '').trim()
    if (!u) return null
    const src: PluginSource = { id: genId(), name: (name || '').trim() || u, url: u }
    sources.value.push(src)
    if (!activeId.value) activeId.value = src.id // 首个自动选中
    await persist()
    return src.id
  }

  async function removeSource(id: string) {
    const idx = sources.value.findIndex(s => s.id === id)
    if (idx >= 0) sources.value.splice(idx, 1)
    if (activeId.value === id) {
      activeId.value = sources.value[0]?.id || ''
    }
    await persist()
  }

  async function setActive(id: string) {
    if (!sources.value.some(s => s.id === id)) return
    activeId.value = id
    await persist()
  }

  return { sources, activeId, activeSource, ready, addSource, removeSource, setActive }
}
