<script setup lang="ts">
/**
 * 素材库文件过滤栏:桌面端 mira-client FilterBar 的组件库自包含版。
 *
 * 功能与原版一致:
 * - 全选开关(isAllSelected 传入才显示;MediaBrowser 启用选择时接 SelectionBox 全选)
 * - 7 类筛选器:folders(树单选)/tags(树多选)/category(单选)/urls/title(文本)/
 *   size(预设+自定义范围)/metadata(尺寸/时长双子模式,预设+自定义范围)
 * - 已保存的过滤器:应用/编辑/删除/新增(数据与持久化归宿主,savedFilters 传入才显示)
 * - 排序器:字段×方向 + 重置默认
 *
 * 与原版的差异(宿主环境适配,功能不减):
 * - Dropdown/Checkbox/RadioGroup/ToggleGroup → 包内 Popover + 原生控件(tailwind 样式)
 * - material icons → @lucide/vue(按 filter.type 内置映射)
 * - LibraryPrefs 持久化 / useToast / vue-i18n → savedFilters props + save/delete 事件 + t 注入
 */
import { computed, ref, watch, useId } from 'vue'
import type { Component } from 'vue'
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  ArrowUpDown,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  FileAudio,
  FilterX,
  Image as ImageIcon,
  ListFilter,
  Pencil,
  Plus,
  Settings,
  Star,
  Trash2,
  Video as VideoIcon,
} from '@lucide/vue'
// 相对路径:library 子入口以源码供宿主直接消费(宿主的 @ 别名指向其自身 src)
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import SavedFilterDialog from './SavedFilterDialog.vue'
import { createLibraryTreeT } from './i18n'
import { applySnapshotToRule, filterIconOf, resetFilterRule } from './filterBar'
import { filterTree } from './tree'
import type {
  FilterBarSortOption,
  FilterRule,
  LibraryTreeNode,
  LibraryTreeT,
  SavedFilter,
} from './types'

interface SizePreset {
  id: string
  label: string
  min?: number
  max?: number
}

const props = withDefaults(
  defineProps<{
    /** 过滤规则(组件内直接改动规则字段后抛 filter-change,与桌面端一致) */
    filters: FilterRule[]
    /** 全选状态;传入(含 false)才显示全选开关 */
    isAllSelected?: boolean
    /** 文件夹树(宿主可用 buildTree 组装);缺省则 folders 筛选器显示空树 */
    folderTreeItems?: LibraryTreeNode[]
    /** 标签树 */
    tagTreeItems?: LibraryTreeNode[]
    sort?: string
    order?: 'asc' | 'desc'
    /** 排序选项;缺省用内置 8 项(与桌面端一致) */
    sortOptions?: FilterBarSortOption[]
    /** 已保存的过滤器;传入(可为空数组)才显示已保存过滤器入口,持久化归宿主 */
    savedFilters?: SavedFilter[]
    /** 当前已应用的过滤器 id(精准匹配,用于入口处展示名称) */
    appliedFilterId?: string | null
    /** 文案函数,缺省用内置中文 */
    t?: LibraryTreeT
  }>(),
  {
    isAllSelected: undefined,
    folderTreeItems: () => [],
    tagTreeItems: () => [],
    sort: 'imported_at',
    order: 'desc',
    sortOptions: undefined,
    savedFilters: undefined,
    appliedFilterId: null,
    t: undefined,
  },
)

const emit = defineEmits<{
  /** 全选开关切换(切换到何种状态由宿主决定,组件只报事件) */
  selectAll: []
  /** 单条筛选器值变化 */
  filterChange: [filter: FilterRule]
  /** 单条筛选器清除 */
  filterClear: [filter: FilterRule]
  /** 排序变化 */
  sortChange: [field: string, order: 'asc' | 'desc']
  /** 应用已保存的过滤器(整套替换当前条件) */
  applySavedFilter: [filterId: string, rules: FilterRule[]]
  /** 清除全部筛选条件(重置显示由宿主调 resetFilterRule/applySnapshotToRule 完成) */
  clearFilters: []
  /** 新建/编辑已保存的过滤器(宿主持久化;editingId 为 null 表示新建) */
  saveSavedFilter: [name: string, rules: FilterRule[], editingId: string | null]
  /** 删除已保存的过滤器(宿主持久化) */
  deleteSavedFilter: [filterId: string]
}>()

const fallbackT = createLibraryTreeT()
const tt = (key: string, params?: Record<string, unknown>) => {
  if (!props.t) return fallbackT(key, params)
  const r = props.t(key, params)
  return r === key ? fallbackT(key, params) : r
}

// ---- Popover 开关状态(同一时刻只开一个面板) ----
const openPanelId = ref<string | null>(null)
function setPanelOpen(id: string, open: boolean) {
  if (open) openPanelId.value = id
  else if (openPanelId.value === id) openPanelId.value = null
}

// radio 组 name 前缀(同页多实例隔离)
const uid = useId()

// ============================================
// 已保存的过滤器
// ============================================
const savedDialogOpen = ref(false)
const editingSavedFilter = ref<SavedFilter | null>(null)
// 打开对话框时快照的当前筛选条件(保存/更新以此为准)
const savedDialogRules = ref<FilterRule[]>([])

const snapshotCurrentRules = (): FilterRule[] => JSON.parse(JSON.stringify(props.filters))

const activeSavedFilter = computed<SavedFilter | null>(() => {
  if (!props.appliedFilterId || !props.savedFilters) return null
  return props.savedFilters.find(f => f.id === props.appliedFilterId) || null
})

const hasActiveConditions = computed(() => props.filters.some(filter => hasActiveFilters(filter)))

function handleApplySaved(saved: SavedFilter) {
  emit('applySavedFilter', saved.id, saved.rules)
}

function handleCreateSaved(close: () => void) {
  editingSavedFilter.value = null
  savedDialogRules.value = snapshotCurrentRules()
  close()
  savedDialogOpen.value = true
}

function handleEditSaved(saved: SavedFilter) {
  editingSavedFilter.value = saved
  savedDialogRules.value = snapshotCurrentRules()
  savedDialogOpen.value = true
}

function handleDeleteSaved(saved: SavedFilter) {
  emit('deleteSavedFilter', saved.id)
}

function handleSavedDialogSave(name: string, editingId: string | null) {
  emit('saveSavedFilter', name, savedDialogRules.value, editingId)
}

// ============================================
// 排序器
// ============================================
const sortOptions = computed<FilterBarSortOption[]>(() =>
  props.sortOptions ?? [
    { value: 'imported_at', label: tt('filterBar.sortFieldImportedAt') },
    { value: 'id', label: tt('filterBar.sortFieldId') },
    { value: 'name', label: tt('filterBar.sortFieldName') },
    { value: 'size', label: tt('filterBar.sortFieldSize') },
    { value: 'stars', label: tt('filterBar.sortFieldStars') },
    { value: 'folder_id', label: tt('filterBar.sortFieldFolder') },
    { value: 'tags', label: tt('filterBar.sortFieldTags') },
    { value: 'custom_fields', label: tt('filterBar.sortFieldCustomFields') },
  ],
)

const sortField = ref<string>(props.sort || 'imported_at')
const sortOrder = ref<'asc' | 'desc'>(props.order || 'desc')

watch(() => props.sort, newSort => {
  if (newSort) sortField.value = newSort
})
watch(() => props.order, newOrder => {
  if (newOrder) sortOrder.value = newOrder
})

function updateSort(field: string, order: string) {
  sortField.value = field
  sortOrder.value = order as 'asc' | 'desc'
  emit('sortChange', field, sortOrder.value)
}

function resetSort() {
  updateSort('imported_at', 'desc')
}

function getSortDisplayText() {
  const option = sortOptions.value.find(opt => opt.value === sortField.value)
  const orderText = sortOrder.value === 'asc' ? '↑' : '↓'
  return option ? `${option.label} ${orderText}` : tt('filterBar.sortDefault')
}

// ============================================
// 预设选项
// ============================================
const sizePresets = computed<SizePreset[]>(() => [
  { id: 'small', label: tt('filterBar.sizePresetSmall'), max: 1024 * 1024 },
  { id: 'medium', label: tt('filterBar.sizePresetMedium'), min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { id: 'large', label: tt('filterBar.sizePresetLarge'), min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { id: 'huge', label: tt('filterBar.sizePresetHuge'), min: 100 * 1024 * 1024 },
])

// metadata 过滤预设:按最长边(px)
const dimensionPresets = computed<SizePreset[]>(() => [
  { id: 'small', label: tt('filterBar.dimensionPresetSmall'), max: 720 },
  { id: 'medium', label: tt('filterBar.dimensionPresetMedium'), min: 720, max: 1080 },
  { id: 'large', label: tt('filterBar.dimensionPresetLarge'), min: 1080, max: 2160 },
  { id: 'huge', label: tt('filterBar.dimensionPresetHuge'), min: 2160 },
])

// metadata 过滤预设:按时长(秒)
const durationPresets = computed<SizePreset[]>(() => [
  { id: 'short', label: tt('filterBar.durationPresetShort'), max: 60 },
  { id: 'medium', label: tt('filterBar.durationPresetMedium'), min: 60, max: 600 },
  { id: 'long', label: tt('filterBar.durationPresetLong'), min: 600, max: 3600 },
  { id: 'huge', label: tt('filterBar.durationPresetHuge'), min: 3600 },
])

const categoryOptions = computed(() => [
  { value: '', label: tt('filterBar.categoryAll'), icon: null },
  { value: 'video', label: tt('filterBar.categoryVideo'), icon: VideoIcon },
  { value: 'audio', label: tt('filterBar.categoryAudio'), icon: FileAudio },
  { value: 'image', label: tt('filterBar.categoryImage'), icon: ImageIcon },
])

// 排序字段图标(对应桌面端 material icons 的 schedule/tag/sort_by_alpha/storage/star/folder/label/settings)
const sortOptionIcons: Record<string, Component> = {
  imported_at: Clock,
  id: filterIconOf('tags'),
  name: ArrowDownAZ,
  size: filterIconOf('size'),
  stars: Star,
  folder_id: filterIconOf('folders'),
  tags: filterIconOf('tags'),
  custom_fields: Settings,
}

// ============================================
// 筛选器状态判定
// ============================================
function hasActiveFilters(filter: FilterRule) {
  switch (filter.type) {
    case 'folders':
    case 'tags':
      return !!filter.selectedValues?.length
    case 'urls':
    case 'title':
      return !!filter.value?.trim()
    case 'size':
      return !!filter.selectedPreset
    case 'category':
      return !!filter.selectedCategory
    case 'metadata':
      return !!(filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax)
    default:
      return false
  }
}

function getActiveFilterCount(filter: FilterRule) {
  switch (filter.type) {
    case 'folders':
    case 'tags':
      return filter.selectedValues?.length || 0
    case 'urls':
    case 'title':
      return filter.value?.trim() ? 1 : 0
    case 'size':
      return filter.selectedPreset ? 1 : 0
    case 'category':
      return filter.selectedCategory ? 1 : 0
    case 'metadata':
      return (filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax) ? 1 : 0
    default:
      return 0
  }
}

function getFilterButtonClass(filter: FilterRule, isOpen: boolean) {
  if (isOpen || hasActiveFilters(filter)) return 'rounded-lg bg-primary/10 text-primary'
  return 'rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-foreground'
}

// ============================================
// 筛选器值更新(直接改动规则字段后抛事件,与桌面端一致)
// ============================================
function updateFilterValues(filter: FilterRule, values: (string | number)[]) {
  if (JSON.stringify(filter.selectedValues) === JSON.stringify(values)) return
  filter.selectedValues = values
  filter.active = values.length > 0
  emit('filterChange', filter)
}

function handleTagFilterSelect(filter: FilterRule, node: { id: number | string }) {
  const values = [...(filter.selectedValues || [])]
  const id = String(node.id)
  const index = values.indexOf(id)
  if (index >= 0) values.splice(index, 1)
  else values.push(id)
  updateFilterValues(filter, values)
}

function handleFilterInput(filter: FilterRule, newValue: string) {
  if (filter.value === newValue) return
  filter.value = newValue
  filter.active = newValue.trim().length > 0
  emit('filterChange', filter)
}

function handleSizePresetChange(filter: FilterRule, value: string) {
  if (value === 'custom') {
    filter.selectedPreset = 'custom'
    filter.active = !!(filter.customMin || filter.customMax)
  } else {
    const preset = sizePresets.value.find(p => p.id === value)
    if (preset) {
      filter.selectedPreset = preset.id
      filter.sizeMin = preset.min
      filter.sizeMax = preset.max
      filter.active = true
    }
  }
  emit('filterChange', filter)
}

function updateCustomSizeRange(filter: FilterRule) {
  if (filter.selectedPreset === 'custom') {
    filter.sizeMin = filter.customMin
    filter.sizeMax = filter.customMax
    filter.active = !!(filter.customMin || filter.customMax)
    emit('filterChange', filter)
  }
}

function selectCategory(filter: FilterRule, value: string) {
  filter.selectedCategory = value
  filter.active = value !== ''
  emit('filterChange', filter)
}

/** 切换 metadata 子模式(dimension / duration),清空另一模式的范围字段 */
function handleMetaFieldChange(filter: FilterRule, mode: 'dimension' | 'duration') {
  if (filter.metaField === mode) return
  filter.metaField = mode
  // 重置当前模式的预设与范围(保留另一模式的 custom 输入值以便切回)
  filter.selectedMetaPreset = ''
  if (mode === 'dimension') {
    filter.metaDurMin = undefined
    filter.metaDurMax = undefined
  } else {
    filter.metaDimMin = undefined
    filter.metaDimMax = undefined
  }
  filter.active = !!(filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax)
  emit('filterChange', filter)
}

/** 选 metadata 预设(预设 id 时直接写范围到 meta*Min/Max) */
function handleMetaPresetChange(filter: FilterRule, value: string) {
  const presets = filter.metaField === 'duration' ? durationPresets.value : dimensionPresets.value
  if (value === 'custom') {
    filter.selectedMetaPreset = 'custom'
    // 切到自定义时以当前 custom 输入值为准
    if (filter.metaField === 'duration') {
      filter.metaDurMin = filter.customDurMin
      filter.metaDurMax = filter.customDurMax
    } else {
      filter.metaDimMin = filter.customDimMin
      filter.metaDimMax = filter.customDimMax
    }
  } else {
    const preset = presets.find(p => p.id === value)
    if (preset) {
      filter.selectedMetaPreset = preset.id
      if (filter.metaField === 'duration') {
        filter.metaDurMin = preset.min
        filter.metaDurMax = preset.max
      } else {
        filter.metaDimMin = preset.min
        filter.metaDimMax = preset.max
      }
    }
  }
  filter.active = !!(filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax)
  emit('filterChange', filter)
}

/** 自定义 metadata 范围输入变化 */
function updateCustomMetaRange(filter: FilterRule) {
  if (filter.selectedMetaPreset === 'custom') {
    if (filter.metaField === 'duration') {
      filter.metaDurMin = filter.customDurMin
      filter.metaDurMax = filter.customDurMax
    } else {
      filter.metaDimMin = filter.customDimMin
      filter.metaDimMax = filter.customDimMax
    }
    filter.active = !!(filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax)
    emit('filterChange', filter)
  }
}

function clearFilter(filter: FilterRule) {
  resetFilterRule(filter)
  emit('filterClear', filter)
}

// ============================================
// 文件夹/标签树选择(folders 单选,tags 多选 toggle)
// ============================================
interface TreeRow {
  id: number
  title: string
  level: number
  hasChildren: boolean
  color?: number
}

// 折叠集合:缺省全展开,点击折叠(collapsed 为空时树数据变化无需同步初始化)
const collapsed = ref(new Set<string>())
function isCollapsed(kind: 'folder' | 'tag', id: number) {
  return collapsed.value.has(`${kind}:${id}`)
}
function toggleCollapse(kind: 'folder' | 'tag', id: number) {
  const key = `${kind}:${id}`
  const next = new Set(collapsed.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsed.value = next
}

/** 深度优先展平行(跳过折叠节点的子树),供树面板渲染;forceExpand 搜索态忽略折叠 */
function toTreeRows(kind: 'folder' | 'tag', nodes: LibraryTreeNode[], forceExpand = false): TreeRow[] {
  const rows: TreeRow[] = []
  const walk = (list: LibraryTreeNode[], level: number) => {
    for (const n of list) {
      rows.push({ id: n.id, title: n.title, level, hasChildren: n.children.length > 0, color: n.color })
      if (n.children.length && (forceExpand || !isCollapsed(kind, n.id))) walk(n.children, level + 1)
    }
  }
  walk(nodes, 0)
  return rows
}

// 树面板搜索(命中节点保留祖先链;搜索态强制展开全部命中分支)
const treeQueries = ref<{ folders: string, tags: string }>({ folders: '', tags: '' })

function queryTreeRows(kind: 'folders' | 'tags', nodes: LibraryTreeNode[]): TreeRow[] {
  const query = treeQueries.value[kind].trim()
  const tree = query ? filterTree(nodes, query).tree : nodes
  return toTreeRows(kind === 'folders' ? 'folder' : 'tag', tree, !!query)
}

const folderRows = computed(() => queryTreeRows('folders', props.folderTreeItems || []))
const tagRows = computed(() => queryTreeRows('tags', props.tagTreeItems || []))

// Eagle 风格标签色板(color 为色板下标)
const TAG_PALETTE = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffc107', '#ff9800', '#ff5722',
]
function tagDotColor(color?: number) {
  if (color === undefined || color === null) return undefined
  return TAG_PALETTE[Math.abs(Number(color)) % TAG_PALETTE.length]
}

/** folders 单选:点已选中的取消,否则选中;点「根目录」行清空 */
function handleFolderSelect(filter: FilterRule, row: TreeRow | null) {
  const current = filter.selectedValues?.[0]
  if (!row || current === String(row.id)) updateFilterValues(filter, [])
  else updateFilterValues(filter, [row.id])
}

function isRowSelected(filter: FilterRule, row: TreeRow) {
  return !!filter.selectedValues?.some(v => String(v) === String(row.id))
}

defineExpose({
  /** 用快照整套回填规则显示(应用已保存过滤器/清除全部由宿主编排后同步显示) */
  applyRules(rules: FilterRule[]) {
    const byId = new Map(rules.map(rule => [rule.id, rule]))
    props.filters.forEach(rule => applySnapshotToRule(rule, byId.get(rule.id)))
  },
  /** 重置全部规则显示 */
  resetRules() {
    props.filters.forEach(rule => resetFilterRule(rule))
  },
})
</script>

<template>
  <div class="filter-bar flex items-center gap-4 overflow-x-auto text-muted-foreground">
    <!-- 全选控制 -->
    <label v-if="props.isAllSelected !== undefined" class="flex shrink-0 cursor-pointer select-none items-center">
      <input
        type="checkbox"
        class="size-4 cursor-pointer accent-primary"
        :checked="props.isAllSelected"
        @change="emit('selectAll')"
      />
    </label>

    <div v-if="props.isAllSelected !== undefined" class="h-5 shrink-0 border-l border-border"></div>

    <!-- 筛选器 -->
    <div class="flex shrink-0 items-center gap-3">
      <Popover
        v-for="filter in props.filters"
        :key="filter.id"
        :open="openPanelId === filter.id"
        @update:open="(v: boolean) => setPanelOpen(filter.id, v)"
      >
        <PopoverTrigger as-child>
          <Button
            variant="ghost"
            size="icon-xs"
            :class="getFilterButtonClass(filter, openPanelId === filter.id)"
            :title="filter.label"
          >
            <span class="relative flex">
              <component :is="filterIconOf(filter.type)" class="size-3.5" />
              <span
                v-if="hasActiveFilters(filter)"
                class="absolute -right-1.5 -bottom-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] leading-none font-medium text-primary-foreground"
              >
                {{ getActiveFilterCount(filter) }}
              </span>
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" :side-offset="8" class="w-72 p-0">
          <!-- 文件夹筛选器(单选) -->
          <template v-if="filter.type === 'folders'">
            <div class="border-b border-border p-2">
              <Input
                class="h-7 text-xs"
                :model-value="treeQueries.folders"
                :placeholder="tt('filterBar.treeSearch')"
                @update:model-value="(v) => (treeQueries.folders = String(v))"
              />
            </div>
            <div class="max-h-[300px] overflow-y-auto p-2">
              <div
                class="flex cursor-pointer items-center rounded px-1.5 py-1 hover:bg-accent"
                :class="!filter.selectedValues?.length && 'bg-primary/10 text-primary'"
                @click="handleFolderSelect(filter, null)"
              >
                <span class="w-3.5"></span>
                <span class="truncate text-sm">{{ tt('filterBar.treeRoot') }}</span>
              </div>
              <div
                v-for="row in folderRows"
                :key="row.id"
                class="flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 hover:bg-accent"
                :class="isRowSelected(filter, row) && 'bg-primary/10 text-primary'"
                :style="{ paddingLeft: `${row.level * 14 + 6}px` }"
                @click="handleFolderSelect(filter, row)"
              >
                <button
                  v-if="row.hasChildren"
                  type="button"
                  class="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  @click.stop="toggleCollapse('folder', row.id)"
                >
                  <ChevronDown v-if="!isCollapsed('folder', row.id)" class="size-3.5" />
                  <ChevronRight v-else class="size-3.5" />
                </button>
                <span v-else class="w-4 shrink-0"></span>
                <span class="truncate text-sm">{{ row.title }}</span>
                <Check v-if="isRowSelected(filter, row)" class="ml-auto size-3.5 shrink-0" />
              </div>
              <p v-if="!folderRows.length" class="px-1.5 py-4 text-center text-sm text-muted-foreground">
                {{ tt('filterBar.treeEmptyFolder') }}
              </p>
            </div>
          </template>

          <!-- 标签筛选器(多选 toggle) -->
          <template v-else-if="filter.type === 'tags'">
            <div class="border-b border-border p-2">
              <Input
                class="h-7 text-xs"
                :model-value="treeQueries.tags"
                :placeholder="tt('filterBar.treeSearch')"
                @update:model-value="(v) => (treeQueries.tags = String(v))"
              />
            </div>
            <div class="max-h-[300px] overflow-y-auto p-2">
              <div
                v-for="row in tagRows"
                :key="row.id"
                class="flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 hover:bg-accent"
                :class="isRowSelected(filter, row) && 'bg-primary/10 text-primary'"
                :style="{ paddingLeft: `${row.level * 14 + 6}px` }"
                @click="handleTagFilterSelect(filter, row)"
              >
                <button
                  v-if="row.hasChildren"
                  type="button"
                  class="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  @click.stop="toggleCollapse('tag', row.id)"
                >
                  <ChevronDown v-if="!isCollapsed('tag', row.id)" class="size-3.5" />
                  <ChevronRight v-else class="size-3.5" />
                </button>
                <span v-else class="w-4 shrink-0"></span>
                <span
                  v-if="tagDotColor(row.color)"
                  class="size-2 shrink-0 rounded-full"
                  :style="{ backgroundColor: tagDotColor(row.color) }"
                ></span>
                <span class="truncate text-sm">{{ row.title }}</span>
                <Check v-if="isRowSelected(filter, row)" class="ml-auto size-3.5 shrink-0" />
              </div>
              <p v-if="!tagRows.length" class="px-1.5 py-4 text-center text-sm text-muted-foreground">
                {{ tt('filterBar.treeEmptyTag') }}
              </p>
            </div>
          </template>

          <!-- 网址筛选器 -->
          <div v-else-if="filter.type === 'urls'" class="p-3">
            <h3 class="mb-3 font-medium text-foreground">{{ tt('filterBar.urlFilterTitle') }}</h3>
            <Input
              :model-value="filter.value"
              :placeholder="tt('filterBar.urlPlaceholder')"
              @update:model-value="(val) => handleFilterInput(filter, String(val))"
            />
          </div>

          <!-- 标题筛选器 -->
          <div v-else-if="filter.type === 'title'" class="p-3">
            <h3 class="mb-3 font-medium text-foreground">{{ tt('filterBar.titleFilterTitle') }}</h3>
            <Input
              :model-value="filter.value"
              :placeholder="tt('filterBar.titlePlaceholder')"
              @update:model-value="(val) => handleFilterInput(filter, String(val))"
            />
          </div>

          <!-- 大小筛选器 -->
          <div v-else-if="filter.type === 'size'" class="p-3">
            <h3 class="mb-3 font-medium text-foreground">{{ tt('filterBar.sizeTitle') }}</h3>
            <div class="space-y-2">
              <label v-for="preset in sizePresets" :key="preset.id" class="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  class="size-4 accent-primary"
                  :name="uid + '-' + filter.id + '-size'"
                  :value="preset.id"
                  :checked="filter.selectedPreset === preset.id"
                  @change="handleSizePresetChange(filter, preset.id)"
                />
                <span class="cursor-pointer text-sm">{{ preset.label }}</span>
              </label>

              <div class="border-t border-border pt-3">
                <label class="mb-3 flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    class="size-4 accent-primary"
                    :name="uid + '-' + filter.id + '-size'"
                    value="custom"
                    :checked="filter.selectedPreset === 'custom'"
                    @change="handleSizePresetChange(filter, 'custom')"
                  />
                  <span class="cursor-pointer text-sm">{{ tt('filterBar.sizeCustom') }}</span>
                </label>

                <div v-if="filter.selectedPreset === 'custom'" class="grid grid-cols-2 gap-2">
                  <div>
                    <Label class="mb-1 block text-xs text-muted-foreground">{{ tt('filterBar.sizeMinLabel') }}</Label>
                    <Input
                      type="number"
                      :model-value="filter.customMin?.toString() ?? ''"
                      placeholder="0"
                      @update:model-value="(val) => { filter.customMin = val ? Number(val) : undefined; updateCustomSizeRange(filter) }"
                    />
                  </div>
                  <div>
                    <Label class="mb-1 block text-xs text-muted-foreground">{{ tt('filterBar.sizeMaxLabel') }}</Label>
                    <Input
                      type="number"
                      :model-value="filter.customMax?.toString() ?? ''"
                      :placeholder="tt('filterBar.sizeMaxPlaceholder')"
                      @update:model-value="(val) => { filter.customMax = val ? Number(val) : undefined; updateCustomSizeRange(filter) }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 类别筛选器 -->
          <div v-else-if="filter.type === 'category'" class="p-3">
            <h3 class="mb-3 font-medium text-foreground">{{ tt('filterBar.categoryTitle') }}</h3>
            <div class="space-y-1">
              <label
                v-for="category in categoryOptions"
                :key="category.value"
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted"
              >
                <input
                  type="radio"
                  class="size-4 accent-primary"
                  :name="uid + '-' + filter.id + '-category'"
                  :value="category.value"
                  :checked="(filter.selectedCategory || '') === category.value"
                  @change="selectCategory(filter, category.value)"
                />
                <component
                  :is="category.icon"
                  v-if="category.icon"
                  class="size-3.5 text-muted-foreground"
                />
                <span class="cursor-pointer text-sm">{{ category.label }}</span>
              </label>
            </div>
          </div>

          <!-- 元数据筛选器(尺寸 / 时长) -->
          <div v-else-if="filter.type === 'metadata'" class="p-3">
            <h3 class="mb-3 font-medium text-foreground">{{ tt('filterBar.metadataTitle') }}</h3>

            <!-- 子模式切换:尺寸 / 时长 -->
            <div class="bg-muted mb-4 flex gap-0.5 rounded-lg p-0.5" role="group">
              <button
                v-for="mode in (['dimension', 'duration'] as const)"
                :key="mode"
                type="button"
                class="flex-1 cursor-pointer rounded-md px-2 py-1 text-xs leading-none font-medium transition-colors duration-100"
                :class="(filter.metaField || 'dimension') === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'"
                @click="handleMetaFieldChange(filter, mode)"
              >
                {{ mode === 'dimension' ? tt('filterBar.metadataFieldDimension') : tt('filterBar.metadataFieldDuration') }}
              </button>
            </div>

            <div class="space-y-2">
              <label
                v-for="preset in (filter.metaField === 'duration' ? durationPresets : dimensionPresets)"
                :key="preset.id"
                class="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  class="size-4 accent-primary"
                  :name="uid + '-' + filter.id + '-meta'"
                  :value="preset.id"
                  :checked="filter.selectedMetaPreset === preset.id"
                  @change="handleMetaPresetChange(filter, preset.id)"
                />
                <span class="cursor-pointer text-sm">{{ preset.label }}</span>
              </label>

              <div class="border-t border-border pt-3">
                <label class="mb-3 flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    class="size-4 accent-primary"
                    :name="uid + '-' + filter.id + '-meta'"
                    value="custom"
                    :checked="filter.selectedMetaPreset === 'custom'"
                    @change="handleMetaPresetChange(filter, 'custom')"
                  />
                  <span class="cursor-pointer text-sm">{{ tt('filterBar.sizeCustom') }}</span>
                </label>

                <!-- 尺寸自定义范围(最长边 px) -->
                <div v-if="filter.selectedMetaPreset === 'custom' && filter.metaField !== 'duration'" class="grid grid-cols-2 gap-2">
                  <div>
                    <Label class="mb-1 block text-xs text-muted-foreground">{{ tt('filterBar.dimensionCustomMin') }}</Label>
                    <Input
                      type="number"
                      :model-value="filter.customDimMin?.toString() ?? ''"
                      placeholder="0"
                      @update:model-value="(val) => { filter.customDimMin = val ? Number(val) : undefined; updateCustomMetaRange(filter) }"
                    />
                  </div>
                  <div>
                    <Label class="mb-1 block text-xs text-muted-foreground">{{ tt('filterBar.dimensionCustomMax') }}</Label>
                    <Input
                      type="number"
                      :model-value="filter.customDimMax?.toString() ?? ''"
                      :placeholder="tt('filterBar.sizeMaxPlaceholder')"
                      @update:model-value="(val) => { filter.customDimMax = val ? Number(val) : undefined; updateCustomMetaRange(filter) }"
                    />
                  </div>
                </div>

                <!-- 时长自定义范围(秒) -->
                <div v-if="filter.selectedMetaPreset === 'custom' && filter.metaField === 'duration'" class="grid grid-cols-2 gap-2">
                  <div>
                    <Label class="mb-1 block text-xs text-muted-foreground">{{ tt('filterBar.durationCustomMin') }}</Label>
                    <Input
                      type="number"
                      :model-value="filter.customDurMin?.toString() ?? ''"
                      placeholder="0"
                      @update:model-value="(val) => { filter.customDurMin = val ? Number(val) : undefined; updateCustomMetaRange(filter) }"
                    />
                  </div>
                  <div>
                    <Label class="mb-1 block text-xs text-muted-foreground">{{ tt('filterBar.durationCustomMax') }}</Label>
                    <Input
                      type="number"
                      :model-value="filter.customDurMax?.toString() ?? ''"
                      :placeholder="tt('filterBar.sizeMaxPlaceholder')"
                      @update:model-value="(val) => { filter.customDurMax = val ? Number(val) : undefined; updateCustomMetaRange(filter) }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 面板底部:清除 / 确定 -->
          <div class="flex justify-end gap-2 border-t border-border p-3">
            <Button variant="ghost" size="sm" @click="clearFilter(filter); setPanelOpen(filter.id, false)">
              {{ tt('filterBar.clear') }}
            </Button>
            <Button size="sm" @click="setPanelOpen(filter.id, false)">{{ tt('filterBar.confirm') }}</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>

    <!-- 已保存的过滤器 -->
    <Popover
      v-if="props.savedFilters !== undefined"
      :open="openPanelId === 'saved'"
      @update:open="(v: boolean) => setPanelOpen('saved', v)"
    >
      <PopoverTrigger as-child>
          <Button
            variant="ghost"
            size="xs"
            :class="openPanelId === 'saved' || activeSavedFilter
              ? 'rounded-lg bg-primary/10 text-primary'
              : 'rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-foreground'"
            :title="activeSavedFilter ? activeSavedFilter.name : tt('filterBar.savedFilters')"
          >
            <Bookmark class="size-3.5" />
            <span v-if="activeSavedFilter" class="max-w-32 truncate text-sm">{{ activeSavedFilter.name }}</span>
            <!-- 名称右侧的清除过滤器图标 -->
            <span
              v-if="hasActiveConditions || activeSavedFilter"
              class="shrink-0 cursor-pointer rounded-full p-0.5 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
              :title="tt('filterBar.clearAllFilters')"
              @click.stop="emit('clearFilters')"
            >
              <span class="flex size-3.5 items-center justify-center leading-none">
                <FilterX class="size-3.5" />
              </span>
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" :side-offset="8" class="w-60 p-2">
          <h3 class="mb-2 px-1 font-medium text-foreground">{{ tt('filterBar.savedFilters') }}</h3>

          <div v-if="!props.savedFilters.length" class="px-1 py-4 text-center text-sm text-muted-foreground">
            {{ tt('filterBar.noSavedFilters') }}
          </div>

          <div v-else class="max-h-[280px] space-y-0.5 overflow-y-auto">
            <div
              v-for="saved in props.savedFilters"
              :key="saved.id"
              class="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-primary/5"
              :title="tt('filterBar.applyFilter')"
              @click="handleApplySaved(saved); setPanelOpen('saved', false)"
            >
              <ListFilter class="size-3.5 text-muted-foreground" />
              <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ saved.name }}</span>
              <!-- hover 时展示的编辑/删除操作 -->
              <span class="hidden items-center gap-0.5 group-hover:flex" @click.stop>
                <button
                  class="cursor-pointer rounded border-none bg-transparent p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  :title="tt('filterBar.editFilter')"
                  @click="handleEditSaved(saved)"
                >
                  <Pencil class="size-3.5" />
                </button>
                <button
                  class="cursor-pointer rounded border-none bg-transparent p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  :title="tt('filterBar.deleteFilter')"
                  @click="handleDeleteSaved(saved)"
                >
                  <Trash2 class="size-3.5" />
                </button>
              </span>
            </div>
          </div>

          <div class="mt-1 flex gap-2 border-t border-border pt-2">
            <Button variant="ghost" size="sm" class="flex-1 justify-start" @click="handleCreateSaved(() => setPanelOpen('saved', false))">
              <Plus class="size-3.5" />
              {{ tt('filterBar.addFilter') }}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="justify-start"
              :disabled="!hasActiveConditions"
              :title="tt('filterBar.clearAllFilters')"
              @click="emit('clearFilters'); setPanelOpen('saved', false)"
            >
              <FilterX class="size-3.5" />
              {{ tt('filterBar.clearAllFilters') }}
            </Button>
          </div>
        </PopoverContent>
    </Popover>

    <div class="h-5 shrink-0 border-l border-border"></div>

    <!-- 排序器 -->
    <Popover
      :open="openPanelId === 'sort'"
      @update:open="(v: boolean) => setPanelOpen('sort', v)"
    >
      <PopoverTrigger as-child>
          <Button
            variant="ghost"
            size="xs"
            :class="openPanelId === 'sort'
              ? 'rounded-lg bg-primary/10 text-primary'
              : 'rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-foreground'"
          >
            <ArrowUpDown class="size-3.5" />
            <span class="text-sm">{{ getSortDisplayText() }}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" :side-offset="8" class="w-60 p-3">
          <h3 class="mb-3 font-medium text-foreground">{{ tt('filterBar.sortTitle') }}</h3>

          <div class="mb-4">
            <Label class="mb-2 block text-xs text-muted-foreground">{{ tt('filterBar.sortFieldLabel') }}</Label>
            <div class="space-y-1">
              <label
                v-for="option in sortOptions"
                :key="option.value"
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted"
              >
                <input
                  type="radio"
                  class="size-4 accent-primary"
                  :name="uid + '-sort-field'"
                  :value="option.value"
                  :checked="sortField === option.value"
                  @change="updateSort(option.value, sortOrder)"
                />
                <component
                  :is="sortOptionIcons[option.value] || ArrowUpDown"
                  class="size-3.5 text-muted-foreground"
                />
                <span class="cursor-pointer text-sm">{{ option.label }}</span>
              </label>
            </div>
          </div>

          <div class="mb-3 border-t border-border pt-3">
            <Label class="mb-2 block text-xs text-muted-foreground">{{ tt('filterBar.sortOrderLabel') }}</Label>
            <div class="space-y-1">
              <label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                <input
                  type="radio"
                  class="size-4 accent-primary"
                  :name="uid + '-sort-order'"
                  value="desc"
                  :checked="sortOrder === 'desc'"
                  @change="updateSort(sortField, 'desc')"
                />
                <ArrowDown class="size-3.5 text-muted-foreground" />
                <span class="cursor-pointer text-sm">{{ tt('filterBar.orderDesc') }}</span>
              </label>
              <label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                <input
                  type="radio"
                  class="size-4 accent-primary"
                  :name="uid + '-sort-order'"
                  value="asc"
                  :checked="sortOrder === 'asc'"
                  @change="updateSort(sortField, 'asc')"
                />
                <ArrowUp class="size-3.5 text-muted-foreground" />
                <span class="cursor-pointer text-sm">{{ tt('filterBar.orderAsc') }}</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end border-t border-border pt-3">
            <Button variant="ghost" size="sm" @click="resetSort()">{{ tt('filterBar.resetDefault') }}</Button>
          </div>
        </PopoverContent>
    </Popover>

    <!-- 新建/编辑已保存过滤器的对话框 -->
    <SavedFilterDialog
      v-model:open="savedDialogOpen"
      :editing="editingSavedFilter"
      :current-rules="savedDialogRules"
      :t="tt"
      @save="handleSavedDialogSave"
    />
  </div>
</template>
