<template>
  <Dialog
    :open="isVisible"
    @update:open="isVisible = $event"
  >
    <DialogContent class="shortcut-manager-dialog sm:max-w-[60vw] max-h-[70vh] flex flex-col overflow-hidden">      <DialogHeader>
        <DialogTitle>快捷键设置</DialogTitle>
      </DialogHeader>
      <div class="shortcut-manager-content flex-1 overflow-y-auto min-h-0">
        <!-- 搜索栏 -->
        <div class="search-section mb-6">
          <div class="relative">
            <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">search</span>
            <input
              v-model="searchQuery"
              class="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-50 dark:bg-surface-800
                     border border-surface-200 dark:border-surface-700
                     text-surface-700 dark:text-surface-0
                     focus:outline-none"
              placeholder="搜索快捷键"
              type="text"
            />
          </div>
        </div>

        <div class="flex gap-6">
          <!-- 左侧类别导航 -->
          <div class="w-1/4">
            <nav class="space-y-1">
              <button
                v-for="category in categories"
                :key="category.id"
                class="w-full flex items-center px-3 py-2 rounded-md text-sm transition-colors cursor-pointer border-l-3"
                :class="selectedCategory === category.id
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold border-l-primary-500'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 border-l-transparent'"
                @click="selectedCategory = category.id"
              >
                <span class="material-icons text-base mr-3">{{ category.icon }}</span>
                {{ category.name }}
              </button>
            </nav>
          </div>

          <!-- 右侧快捷键列表 -->
          <div class="w-3/4">
            <div class="mb-4">
              <h2 class="text-lg font-semibold text-surface-700 dark:text-surface-0 mb-2">
                {{ getCurrentCategoryName() }}
              </h2>

              <!-- 快捷键列表 -->
              <div class="space-y-2 max-h-96 overflow-y-auto">
                <div
                  v-for="(binding, index) in filteredBindings"
                  :key="binding.shortcut + binding.actionId"
                  class="flex justify-between items-center p-3 rounded-md transition-colors"
                  :class="index % 2 === 0 ? 'bg-surface-50 dark:bg-surface-800/50' : ''"
                >
                  <div class="flex-1">
                    <div class="text-sm text-surface-700 dark:text-surface-0 font-medium">
                      {{ getActionTitle(binding.actionId) }}
                    </div>
                    <div class="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      {{ getActionDescription(binding.actionId) }}
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <!-- 快捷键显示 -->
                    <div class="flex items-center gap-1">
                      <template v-for="(key, keyIndex) in binding.shortcut.split('+')" :key="keyIndex">
                        <kbd class="px-2 py-1 text-xs font-sans font-semibold text-surface-600 dark:text-surface-300
                                   bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded">
                          {{ formatKeyDisplay(key) }}
                        </kbd>
                        <span v-if="keyIndex < binding.shortcut.split('+').length - 1"
                              class="text-surface-400 mx-1">+</span>
                      </template>
                    </div>

                    <!-- 全局标识 -->
                    <span v-if="binding.isGlobal"
                          class="inline-flex items-center px-2 py-1 rounded text-xs font-medium
                                 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      <span class="material-icons text-xs mr-1">public</span>
                      全局
                    </span>

                    <!-- 编辑按钮 -->
                    <button
                      class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors cursor-pointer"
                      @click="editBinding(binding)"
                    >
                      <span class="material-icons text-sm">edit</span>
                    </button>

                    <!-- 删除按钮 -->
                    <button
                      class="text-surface-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                      @click="removeBinding(binding)"
                    >
                      <span class="material-icons text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 添加新快捷键按钮 -->
              <button
                class="w-full flex items-center justify-center p-3 mt-4 rounded-md border-2 border-dashed
                       border-surface-300 dark:border-surface-600 text-surface-500 dark:text-surface-400
                       hover:bg-surface-50 dark:hover:bg-surface-800 hover:border-primary-500
                       dark:hover:border-primary-400 transition-all"
                @click="showAddDialog = true"
              >
                <span class="material-icons text-base mr-2">add</span>
                <span class="text-sm font-medium">添加新快捷键</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    <DialogFooter>
      <button
        class="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400
               hover:text-surface-700 dark:hover:text-surface-300 transition-colors cursor-pointer"
        @click="resetToDefaults"
      >
        恢复默认
      </button>
    </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 添加/编辑快捷键对话框 -->
  <Dialog
    :open="showAddDialog"
    @update:open="showAddDialog = $event"
  >
    <DialogContent class="add-shortcut-dialog sm:max-w-[40vw] max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{{ editingBinding ? '编辑快捷键' : '添加快捷键' }}</DialogTitle>
      </DialogHeader>
      <div class="add-shortcut-content space-y-4 overflow-y-auto flex-1">
        <!-- 选择动作 -->
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-0 mb-2">
            选择动作
          </label>
          <Select v-model="newBinding.actionId">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="请选择动作" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="action in availableActions" :key="action.id" :value="action.id">{{ action.title }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 录制快捷键 -->
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-0 mb-2">
            快捷键组合
          </label>
          <div
ref="recordRef"
            class="w-full px-3 py-2 border-2 rounded-md cursor-pointer transition-colors"
            :class="isRecording
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-800'"
            @click="startRecording"
            @keydown="handleKeyRecord"
            tabindex="0"
          >
            <div v-if="!newBinding.shortcut && !isRecording"
                 class="text-surface-400 dark:text-surface-500">
              点击此处录制快捷键...
            </div>
            <div v-else-if="isRecording"
                 class="text-primary-600 dark:text-primary-400">
              请按下快捷键组合...
            </div>
            <div v-else class="flex items-center gap-1">
              <template v-for="(key, keyIndex) in newBinding.shortcut.split('+')" :key="keyIndex">
                <kbd class="px-2 py-1 text-xs font-sans font-semibold text-surface-600 dark:text-surface-300
                           bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded">
                  {{ formatKeyDisplay(key) }}
                </kbd>
                <span v-if="keyIndex < newBinding.shortcut.split('+').length - 1"
                      class="text-surface-400 mx-1">+</span>
              </template>
            </div>
          </div>
        </div>

        <!-- 设置选项 -->
        <div class="space-y-3">
          <label class="flex items-center">
            <Checkbox
              :checked="newBinding.isGlobal"
              @update:checked="newBinding.isGlobal = $event"
            />
            <span class="ml-2 text-sm text-surface-700 dark:text-surface-0">全局快捷键（在后台也可触发）</span>
          </label>

          <div>
            <label class="block text-sm font-medium text-surface-700 dark:text-surface-0 mb-2">
              优先级
            </label>
            <input
              v-model.number="newBinding.priority"
              type="number"
              min="0"
              max="100"
              class="w-full px-3 py-2 border border-surface-200 dark:border-surface-700 rounded-md
                     bg-surface-0 dark:bg-surface-800 text-surface-700 dark:text-surface-0
                     focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0-100，数值越大优先级越高"
            />
          </div>
        </div>

        <!-- 冲突提示 -->
        <div v-if="shortcutConflict"
             class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div class="flex">
            <span class="material-icons text-yellow-600 dark:text-yellow-400 mr-2">warning</span>
            <div class="text-sm text-yellow-800 dark:text-yellow-200">
              快捷键冲突：<strong>{{ shortcutConflict }}</strong> 已被使用
            </div>
          </div>
        </div>
      </div>
    <DialogFooter class="shrink-0">
      <div class="flex justify-end gap-2">
        <button
          class="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400
                 hover:text-surface-700 dark:hover:text-surface-300 transition-colors cursor-pointer"
          @click="cancelAdd"
        >
          取消
        </button>
        <button
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700
                 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canSaveBinding"
          @click="saveBinding"
        >
          {{ editingBinding ? '更新' : '添加' }}
        </button>
      </div>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { shortcutService, type ShortcutBinding, type ShortcutAction } from '../../services/ShortcutService'

// 组件属性
interface Props {
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
})

// 组件事件
interface Emits {
  (e: 'update:visible', visible: boolean): void
}

const emit = defineEmits<Emits>()

// 响应式状态
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const searchQuery = ref('')
const selectedCategory = ref('general')
const showAddDialog = ref(false)
const isRecording = ref(false)
const editingBinding = ref<ShortcutBinding | null>(null)
const refreshTrigger = ref(0) // 用于触发响应式更新

// 新快捷键数据
const newBinding = ref<Partial<ShortcutBinding>>({
  shortcut: '',
  priority: 50,
  isGlobal: false,
  actionId: '',
  enabled: true
})

// 类别定义
const categories = ref([
  { id: 'general', name: '常规', icon: 'tune' },
  { id: 'navigation', name: '导航', icon: 'navigation' },
  { id: 'media', name: '媒体', icon: 'play_arrow' },
  { id: 'editing', name: '编辑', icon: 'edit' },
  { id: 'view', name: '视图', icon: 'visibility' },
  { id: 'system', name: '系统', icon: 'settings' }
])

// 计算属性
const availableActions = computed((): ShortcutAction[] => {
  return shortcutService.getAllActions()
})

const filteredBindings = computed((): ShortcutBinding[] => {
  // 使用refreshTrigger确保响应式更新
  refreshTrigger.value // 仅用于触发重新计算，不需要实际使用值

  let bindings = shortcutService.getAllBindings()

  // 按类别过滤
  if (selectedCategory.value !== 'all') {
    bindings = bindings.filter(binding => {
      const action = shortcutService.getAllActions().find(a => a.id === binding.actionId)
      return action?.category === selectedCategory.value
    })
  }

  // 按搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    bindings = bindings.filter(binding => {
      const action = shortcutService.getAllActions().find(a => a.id === binding.actionId)
      return (
        binding.shortcut.toLowerCase().includes(query) ||
        action?.title.toLowerCase().includes(query) ||
        action?.description?.toLowerCase().includes(query)
      )
    })
  }

  return bindings.sort((a, b) => b.priority - a.priority)
})

const shortcutConflict = computed((): string => {
  if (!newBinding.value.shortcut) return ''

  const existing = shortcutService.getAllBindings().find(b =>
    b.shortcut === newBinding.value.shortcut &&
    (!editingBinding.value || b.shortcut !== editingBinding.value.shortcut)
  )

  if (existing) {
    const action = shortcutService.getAllActions().find(a => a.id === existing.actionId)
    return action?.title || existing.actionId
  }

  return ''
})

const canSaveBinding = computed((): boolean => {
  return !!(
    newBinding.value.shortcut &&
    newBinding.value.actionId &&
    !shortcutConflict.value
  )
})

// 方法
const getCurrentCategoryName = (): string => {
  const category = categories.value.find(c => c.id === selectedCategory.value)
  return category?.name || '全部'
}

const getActionTitle = (actionId: string): string => {
  const action = shortcutService.getAllActions().find(a => a.id === actionId)
  return action?.title || actionId
}

const getActionDescription = (actionId: string): string => {
  const action = shortcutService.getAllActions().find(a => a.id === actionId)
  return action?.description || ''
}

const formatKeyDisplay = (key: string): string => {
  const keyMap: Record<string, string> = {
    'Ctrl': 'Ctrl',
    'Alt': 'Alt',
    'Shift': '⇧',
    'Meta': '⌘',
    'Space': 'Space',
    'Enter': '↵',
    'Escape': 'Esc',
    'Tab': '⇥',
    'Backspace': '⌫',
    'Delete': 'Del',
    'Up': '↑',
    'Down': '↓',
    'Left': '←',
    'Right': '→'
  }

  return keyMap[key] || key
}

const editBinding = (binding: ShortcutBinding): void => {
  editingBinding.value = binding
  newBinding.value = { ...binding }
  showAddDialog.value = true
}

const removeBinding = async (binding: ShortcutBinding): Promise<void> => {
  await shortcutService.unbindShortcut(binding.shortcut)
  // 触发列表更新
  refreshTrigger.value++
}

const recordRef = ref<HTMLElement | null>(null)

const startRecording = (): void => {
  isRecording.value = true
  newBinding.value.shortcut = ''
  nextTick(() => recordRef.value?.focus())
}

const handleKeyRecord = (event: KeyboardEvent): void => {
  if (!isRecording.value) return

  event.preventDefault()
  event.stopPropagation()

  const parts: string[] = []

  // 添加修饰键
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (event.metaKey) parts.push('Meta')

  // 获取主键
  let key = event.key

  // 特殊键映射
  const specialKeys: Record<string, string> = {
    ' ': 'Space',
    'Enter': 'Enter',
    'Escape': 'Escape',
    'Tab': 'Tab',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right'
  }

  if (specialKeys[key]) {
    key = specialKeys[key]
  } else if (/^F\d+$/.test(key)) {
    // 功能键保持原样
  } else if (key.length === 1 && key.match(/[a-zA-Z0-9]/)) {
    // 字母数字键转为大写
    key = key.toUpperCase()
  } else if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    // 如果只按了修饰键，不记录
    return
  }

  // 只有在有实际按键时才添加到parts
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    parts.push(key)
  }

  // 判断是否完成录制
  // 1. 有修饰键+实际按键
  // 2. 或者是特殊的单独按键（功能键、空格、回车等）
  const hasModifier = event.ctrlKey || event.altKey || event.shiftKey || event.metaKey
  const isSingleSpecialKey = ['Space', 'Enter', 'Escape', 'Tab'].includes(key) || /^F\d+$/.test(key)
  const isValidCombination = parts.length > 0 && (hasModifier || isSingleSpecialKey)

  if (isValidCombination) {
    newBinding.value.shortcut = parts.join('+')
    isRecording.value = false
  }
}

const saveBinding = async (): Promise<void> => {
  if (!canSaveBinding.value) return

  const binding: ShortcutBinding = {
    shortcut: newBinding.value.shortcut!,
    priority: newBinding.value.priority || 50,
    isGlobal: newBinding.value.isGlobal || false,
    actionId: newBinding.value.actionId!,
    enabled: true,
    description: newBinding.value.description
  }

  if (editingBinding.value) {
    // 更新现有绑定
    await shortcutService.unbindShortcut(editingBinding.value.shortcut)
  }

  // 保存为用户自定义快捷键
  await shortcutService.bindShortcut(binding, true)
  // 触发列表更新
  refreshTrigger.value++
  cancelAdd()
}

const cancelAdd = (): void => {
  showAddDialog.value = false
  editingBinding.value = null
  newBinding.value = {
    shortcut: '',
    priority: 50,
    isGlobal: false,
    actionId: '',
    enabled: true
  }
  isRecording.value = false
}

const resetToDefaults = async (): Promise<void> => {
  try {
    await shortcutService.resetToDefaults()
    // 触发列表更新
    refreshTrigger.value++
  } catch (error) {
    console.error('重置快捷键失败:', error)
    // 可以添加错误提示
  }
}

// 生命周期
onMounted(async () => {
  await shortcutService.initialize()
})

onUnmounted(() => {
  shortcutService.destroy()
})
</script>