<template>
  <Dialog :open="isVisible" @update:open="isVisible = $event">
    <DialogContent class="shortcut-manager-dialog">
      <DialogHeader>
        <DialogTitle>{{ $t('business.shortcutManagerDialog.title') }}</DialogTitle>
      </DialogHeader>
      <div class="shortcut-manager-content flex flex-col flex-1 overflow-hidden min-h-0">
        <!-- 搜索栏 -->
        <div class="search-section mb-6 p-2">
          <div class="relative">
            <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">search</span>
            <input v-model="searchQuery" class="w-full pl-10 pr-4 py-2 rounded-lg bg-muted dark:bg-muted
                     border border-border dark:border-foreground
                     text-foreground 
                     focus:outline-none" :placeholder="$t('business.shortcutManagerDialog.searchPlaceholder')" type="text" />
          </div>
        </div>

        <div class="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden lg:flex-row lg:gap-6">
          <!-- 类别导航（移动端横向滚动条，桌面端左侧竖列） -->
          <div class="w-full shrink-0 lg:w-1/4">
            <nav class="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              <button v-for="category in categories" :key="category.id"
                class="w-auto shrink-0 whitespace-nowrap flex items-center px-3 py-2.5 rounded-md text-sm transition-colors cursor-pointer border-l-4 lg:w-full"
                :class="selectedCategory === category.id
                  ? 'bg-primary/10 dark:bg-primary/15 text-primary font-semibold border-primary'
                  : 'text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-foreground border-transparent'"
                @click="selectedCategory = category.id">
                <span class="material-icons text-base mr-3">{{ category.icon }}</span>
                {{ category.name }}
              </button>
            </nav>
          </div>

          <!-- 快捷键列表（桌面端右侧 3/4） -->
          <div class="w-full flex-1 flex flex-col min-h-0 lg:w-3/4 lg:flex-none">
            <h2 class="text-lg font-semibold text-foreground  mb-2 shrink-0">
              {{ getCurrentCategoryName() }}
            </h2>

            <!-- 快捷键列表 -->
            <div class="space-y-2 flex-1 min-h-0 overflow-y-scroll pr-2">
              <div v-for="(binding, index) in filteredBindings" :key="binding.shortcut + binding.actionId"
                class="flex justify-between items-center p-3 rounded-md transition-colors"
                :class="index % 2 === 0 ? 'bg-muted dark:bg-muted/50' : ''">
                <div class="flex-1">
                  <div class="text-sm text-foreground  font-medium">
                    {{ getActionTitle(binding.actionId) }}
                  </div>
                  <div class="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    {{ getActionDescription(binding.actionId) }}
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <!-- 快捷键显示 -->
                  <div class="flex items-center gap-1">
                    <template v-for="(key, keyIndex) in binding.shortcut.split('+')" :key="keyIndex">
                      <kbd
                        class="px-2 py-1 text-xs font-sans font-semibold text-muted-foreground dark:text-border
                                   bg-muted dark:bg-muted border border-border dark:border-muted-foreground rounded">
                        {{ formatKeyDisplay(key) }}
                      </kbd>
                      <span v-if="keyIndex < binding.shortcut.split('+').length - 1"
                        class="text-muted-foreground mx-1">+</span>
                    </template>
                  </div>

                  <!-- 全局标识 -->
                  <span v-if="binding.isGlobal" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium
                                 bg-primary/10 text-primary dark:bg-primary/50 dark:text-primary-foreground">
                    <span class="material-icons text-xs mr-1">public</span>
                    {{ $t('business.shortcutManagerDialog.globalBadge') }}
                  </span>

                  <!-- 编辑按钮 -->
                  <button
                    class="text-muted-foreground hover:text-muted-foreground dark:hover:text-border transition-colors cursor-pointer"
                    @click="editBinding(binding)">
                    <span class="material-icons text-sm">edit</span>
                  </button>

                  <!-- 删除按钮 -->
                  <button
                    class="text-muted-foreground hover:text-destructive dark:hover:text-destructive transition-colors cursor-pointer"
                    @click="removeBinding(binding)">
                    <span class="material-icons text-sm">delete</span>
                  </button>
                </div>
              </div>

              <!-- 添加新快捷键按钮 -->
              <button class="w-full flex items-center justify-center p-3 mt-2 rounded-md border-2 border-dashed
                         border-border dark:border-muted-foreground text-muted-foreground dark:text-muted-foreground
                         hover:bg-muted dark:hover:bg-foreground hover:border-primary-500
                         dark:hover:border-primary-400 transition-all" @click="showAddDialog = true">
                <span class="material-icons text-base mr-2">add</span>
                <span class="text-sm font-medium">{{ $t('business.shortcutManagerDialog.addNew') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <DialogFooter class="shrink-0">


        <button class="px-4 py-2 text-sm font-medium text-muted-foreground dark:text-muted-foreground
               hover:text-foreground dark:hover:text-border transition-colors cursor-pointer"
          @click="resetToDefaults">
          {{ $t('business.shortcutManagerDialog.resetDefault') }}
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 添加/编辑快捷键对话框 -->
  <Dialog :open="showAddDialog" @update:open="showAddDialog = $event">
    <DialogContent class="add-shortcut-dialog sm:max-w-[40vw] max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{{ editingBinding ? $t('business.shortcutManagerDialog.editTitle') : $t('business.shortcutManagerDialog.addTitle') }}</DialogTitle>
      </DialogHeader>
      <div class="add-shortcut-content space-y-4 overflow-y-auto flex-1">
        <!-- 选择动作 -->
        <div>
          <label class="block text-sm font-medium text-foreground  mb-2">
            {{ $t('business.shortcutManagerDialog.selectAction') }}
          </label>
          <Select v-model="newBinding.actionId">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="$t('business.shortcutManagerDialog.actionPlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="action in availableActions" :key="action.id" :value="action.id">{{ resolveActionText(action.title) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 录制快捷键 -->
        <div>
          <label class="block text-sm font-medium text-foreground  mb-2">
            {{ $t('business.shortcutManagerDialog.shortcutCombo') }}
          </label>
          <div ref="recordRef" class="w-full px-3 py-2 border-2 rounded-md cursor-pointer transition-colors" :class="isRecording
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
  : 'border-border dark:border-foreground bg-background dark:bg-muted'" @click="startRecording"
            @keydown="handleKeyRecord" tabindex="0">
            <div v-if="!newBinding.shortcut && !isRecording" class="text-muted-foreground dark:text-muted-foreground">
              {{ $t('business.shortcutManagerDialog.clickToRecord') }}
            </div>
            <div v-else-if="isRecording" class="text-primary-600 dark:text-primary-400">
              {{ $t('business.shortcutManagerDialog.recording') }}
            </div>
            <div v-else class="flex items-center gap-1">
              <template v-for="(key, keyIndex) in (newBinding.shortcut ?? '').split('+')" :key="keyIndex">
                <kbd
                  class="px-2 py-1 text-xs font-sans font-semibold text-muted-foreground dark:text-border
                           bg-muted dark:bg-muted border border-border dark:border-muted-foreground rounded">
                  {{ formatKeyDisplay(key) }}
                </kbd>
                <span v-if="keyIndex < (newBinding.shortcut ?? '').split('+').length - 1" class="text-muted-foreground mx-1">+</span>
              </template>
            </div>
          </div>
        </div>

        <!-- 设置选项 -->
        <div class="space-y-3">
          <label class="flex items-center">
            <Checkbox :model-value="newBinding.isGlobal" @update:model-value="newBinding.isGlobal = Boolean($event)" />
            <span class="ml-2 text-sm text-foreground ">{{ $t('business.shortcutManagerDialog.globalShortcut') }}</span>
          </label>

          <div>
            <label class="block text-sm font-medium text-foreground  mb-2">
              {{ $t('business.shortcutManagerDialog.priority') }}
            </label>
            <input v-model.number="newBinding.priority" type="number" min="0" max="100" class="w-full px-3 py-2 border border-border dark:border-foreground rounded-md
                     bg-background dark:bg-muted text-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary-500" :placeholder="$t('business.shortcutManagerDialog.priorityPlaceholder')" />
          </div>
        </div>

        <!-- 冲突提示 -->
        <div v-if="shortcutConflict"
          class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div class="flex">
            <span class="material-icons text-yellow-600 dark:text-yellow-400 mr-2">warning</span>
            <div class="text-sm text-yellow-800 dark:text-yellow-200">
              {{ $t('business.shortcutManagerDialog.conflictMsg', { name: shortcutConflict }) }}
            </div>
          </div>
        </div>
      </div>
      <DialogFooter class="shrink-0">
        <div class="flex justify-end gap-2">
          <button class="px-4 py-2 text-sm font-medium text-muted-foreground dark:text-muted-foreground
                 hover:text-foreground dark:hover:text-border transition-colors cursor-pointer"
            @click="cancelAdd">
            {{ $t('business.shortcutManagerDialog.cancel') }}
          </button>
          <button class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700
                 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canSaveBinding" @click="saveBinding">
            {{ editingBinding ? $t('business.shortcutManagerDialog.update') : $t('business.shortcutManagerDialog.add') }}
          </button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { t, te } = useI18n()

/**
 * 解析快捷键动作的 title/description。
 * defaultShortcuts.ts 中的值现在是 i18n key（如 'shortcuts.actions.appSearch.title'），
 * 需要用 t() 翻译；其它情况（如插件注册的纯文本动作）原样返回。
 */
const resolveActionText = (value: string | undefined): string => {
  if (!value) return ''
  if (value.startsWith('shortcuts.actions.') && te(value)) {
    return t(value)
  }
  return value
}

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
const categories = computed(() => [
  { id: 'general', name: t('business.shortcutManagerDialog.categoryGeneral'), icon: 'tune' },
  { id: 'navigation', name: t('business.shortcutManagerDialog.categoryNavigation'), icon: 'navigation' },
  { id: 'media', name: t('business.shortcutManagerDialog.categoryMedia'), icon: 'play_arrow' },
  { id: 'editing', name: t('business.shortcutManagerDialog.categoryEditing'), icon: 'edit' },
  { id: 'view', name: t('business.shortcutManagerDialog.categoryView'), icon: 'visibility' },
  { id: 'system', name: t('business.shortcutManagerDialog.categorySystem'), icon: 'settings' }
])

// 计算属性
const availableActions = computed((): ShortcutAction[] => {
  return shortcutService.getAllActions()
})

const filteredBindings = computed((): ShortcutBinding[] => {
  // 使用refreshTrigger确保响应式更新
  void refreshTrigger.value // 仅用于触发重新计算，不需要实际使用值

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
      const title = action ? resolveActionText(action.title) : ''
      const desc = action ? resolveActionText(action.description) : ''
      return (
        binding.shortcut.toLowerCase().includes(query) ||
        title.toLowerCase().includes(query) ||
        desc.toLowerCase().includes(query)
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
    return action?.title ? resolveActionText(action.title) : existing.actionId
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
  return category?.name || t('business.shortcutManagerDialog.categoryAll')
}

const getActionTitle = (actionId: string): string => {
  const action = shortcutService.getAllActions().find(a => a.id === actionId)
  if (!action?.title) return actionId
  return resolveActionText(action.title)
}

const getActionDescription = (actionId: string): string => {
  const action = shortcutService.getAllActions().find(a => a.id === actionId)
  if (!action?.description) return ''
  return resolveActionText(action.description)
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
    console.error(t('business.shortcutManagerDialog.resetFailed'), error)
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
<style>
.shortcut-manager-dialog {
  max-width: 80vw !important;
  width: 80vw !important;
  height: 70vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}
</style>
