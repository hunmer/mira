import { ref, computed, watch } from 'vue'

export interface PluginSource {
  id: string
  name: string
  url: string
}

const SOURCES_KEY = 'mira.pluginSources'
const ACTIVE_KEY = 'mira.pluginSourceActive'
const LEGACY_KEY = 'mira.storePluginsUrl' // 旧的单 URL 字段, 一次性迁移

function readSources(): PluginSource[] {
  try {
    const raw = localStorage.getItem(SOURCES_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// 模块级单例: 所有调用方共享同一份状态
const sources = ref<PluginSource[]>(readSources())
const activeId = ref<string>(localStorage.getItem(ACTIVE_KEY) || '')

// 一次性迁移旧的 storePluginsUrl -> 作为首个源并选中
if (sources.value.length === 0 && !activeId.value) {
  const legacy = (localStorage.getItem(LEGACY_KEY) || '').trim()
  if (legacy) {
    sources.value.push({ id: 'legacy', name: '默认源', url: legacy })
    activeId.value = 'legacy'
  }
}

watch(sources, val => localStorage.setItem(SOURCES_KEY, JSON.stringify(val)), { deep: true })
watch(activeId, val => localStorage.setItem(ACTIVE_KEY, val || ''))

function genId() {
  return `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function usePluginSources() {
  // 当前选中的源
  const activeSource = computed(() => sources.value.find(s => s.id === activeId.value) || null)

  function addSource(name: string, url: string) {
    const u = (url || '').trim()
    if (!u) return null
    const src: PluginSource = { id: genId(), name: (name || '').trim() || u, url: u }
    sources.value.push(src)
    if (!activeId.value) activeId.value = src.id // 首个自动选中
    return src.id
  }

  function removeSource(id: string) {
    const idx = sources.value.findIndex(s => s.id === id)
    if (idx >= 0) sources.value.splice(idx, 1)
    if (activeId.value === id) {
      activeId.value = sources.value[0]?.id || ''
    }
  }

  function setActive(id: string) {
    if (sources.value.some(s => s.id === id)) activeId.value = id
  }

  return { sources, activeId, activeSource, addSource, removeSource, setActive }
}
