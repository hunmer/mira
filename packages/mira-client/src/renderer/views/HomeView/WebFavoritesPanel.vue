<template>
  <!-- 收藏夹树：readOnly 禁用素材库内置增删改，本地拖拽排序走 local-sort 持久化 -->
  <FolderTreeComponent
    :ref="setTreeRef"
    item-type="folder"
    :draggable="true"
    :local-drag-sort="true"
    :read-only="true"
    hide-header
    :title="t('views.webFavorites.title')"
    :folders="folders"
    indent-mode="icon"
    :extra-context-menu-items="buildContextMenuItems"
    @select="handleSelect"
    @local-sort="handleLocalSort"
  />

  <!-- 添加 / 编辑对话框（创建类型由入口按钮决定，不可自选） -->
  <Teleport to="body">
    <Dialog :open="dialogOpen" @update:open="(v: boolean) => (dialogOpen = v)">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ dialogTitle }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-3 py-1">
          <div class="space-y-1">
            <label class="text-xs text-muted-foreground">{{ t('views.webFavorites.name') }}</label>
            <Input v-model="form.label" @keydown.enter="save" />
          </div>
          <template v-if="isPage">
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">{{ t('views.webFavorites.url') }}</label>
              <Input v-model="form.url" placeholder="https://" @keydown.enter="save" />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">{{ t('views.webFavorites.partition') }}</label>
              <Input v-model="form.partition" :placeholder="t('views.webFavorites.partitionPlaceholder')" />
            </div>
            <div class="flex items-center space-x-2 px-1 pt-0.5">
              <Checkbox id="webFavMuted" :model-value="form.muted"
                @update:model-value="form.muted = $event === true" />
              <label for="webFavMuted" class="cursor-pointer select-none text-sm text-muted-foreground">
                {{ t('views.webFavorites.muted') }}
              </label>
            </div>
          </template>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">{{ t('views.webFavorites.cancel') }}</Button>
          <Button :disabled="!canSave" @click="save">{{ t('views.webFavorites.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Teleport>

  <!-- 删除确认 -->
  <Teleport to="body">
    <AlertDialog v-if="deleteTarget" :open="true" @update:open="!$event && (deleteTarget = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('views.webFavorites.confirmDeleteTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('views.webFavorites.confirmDeleteDesc', { name: deleteTarget.label }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('views.webFavorites.cancel') }}</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white hover:bg-destructive" @click="confirmDelete">
            {{ t('views.webFavorites.delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 网页收藏夹侧边栏模块。
 *
 * - 数据：useWebFavorites 本地持久化（与素材库无关），树结构兼容 FolderTreeComponent。
 * - 点击网页节点 → 创建 webview tab（携带 partition / muted）；Ctrl/⌘+点击 → window:open-url 独立 BrowserWindow。
 * - 拖拽排序：FolderTreeComponent localDragSort 模式，local-sort 事件回传最新树后写回本地。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useTabs } from '@/renderer/composables/useTabs'
import { useWebFavorites, type WebFavoriteItem } from '@/renderer/composables/useWebFavorites'
import type { FolderItem } from '@renderer/types/components'
import type { MenuItem } from '@renderer/types/menu'

defineOptions({ name: 'WebFavoritesPanel' })

const { t } = useI18n()
const { createWebviewTab } = useTabs()
const { items, load, add, update, remove, replaceAll } = useWebFavorites()

// 存储 -> FolderItem[]（FolderTreeComponent 数据源）
// 网页节点 icon 动态生成 favicon 地址（不持久化，站点/网址变更后自动刷新）：
//   Electron：site-icon:// 协议（主进程 FaviconCacheService 本地缓存 + 在线兜底）
//   Web 环境：google s2 favicon 服务
// FolderTreeNode 对 http(s)/site-icon icon 渲染 <img>，加载失败回退 material icon
function faviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return window.electronAPI
      ? `site-icon://${domain}`
      : `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
  } catch {
    return 'language'
  }
}

const folders = computed<FolderItem[]>(() => {
  const convert = (nodes: WebFavoriteItem[]): FolderItem[] => nodes.map((n) => ({
    id: n.id,
    label: n.label,
    icon: n.icon || (n.url ? faviconUrl(n.url) : 'folder'),
    children: n.children?.length ? convert(n.children) : undefined,
    originalData: { url: n.url, partition: n.partition, muted: n.muted },
  }))
  return convert(items.value)
})

// hideHeader 模式下供外层标题栏调用的树能力
const treeRef = ref<any>(null)
const setTreeRef = (el: any) => { treeRef.value = el }

onMounted(() => { void load() })

// ============================================
// 点击打开：webview tab / Ctrl 独立窗口
// ============================================
function handleSelect(item: any) {
  const url: string | undefined = item?.url
  if (!url) return // 文件夹节点：仅由 chevron 控制展开
  if (item.ctrlKey) {
    openInWindow(url, item.label)
  } else {
    void createWebviewTab(url, {
      id: `web-fav:${url}`,
      label: item.label,
      icon: 'language',
      data: {
        url,
        partition: item.partition,
        muted: item.muted === true,
      },
    })
  }
}

/** 用独立 BrowserWindow 打开（与 HomeHeader.openDashboard 同规则；Web 环境回退 window.open） */
function openInWindow(url: string, title: string) {
  if (window.electronAPI) {
    void window.electronAPI.invoke('window:open-url', url, { title })
  } else {
    window.open(url, '_blank')
  }
}

// ============================================
// 拖拽排序：最新树写回本地
// ============================================
function handleLocalSort(nodes: any[]) {
  const convert = (list: any[]): WebFavoriteItem[] => list.map((n) => ({
    id: String(n.id),
    label: n.label,
    // icon 是动态生成的 favicon 地址，不写回存储
    url: n.originalData?.url ?? n.url,
    partition: n.originalData?.partition,
    muted: n.originalData?.muted === true,
    open: n.open,
    children: n.children?.length ? convert(n.children) : undefined,
  }))
  replaceAll(convert(nodes))
}

// ============================================
// 增删改
// ============================================
type FavoriteType = 'page' | 'folder'

const dialogOpen = ref(false)
const editingItem = ref<WebFavoriteItem | null>(null)
/** 添加模式：目标类型（由入口按钮决定）与目标父节点 id（null = 根级）。必须响应式，computed 依赖它们 */
const addType = ref<FavoriteType>('page')
const addParentId = ref<string | null>(null)
const form = reactive<{ label: string; url: string; partition: string; muted: boolean }>({
  label: '', url: '', partition: '', muted: false,
})
const deleteTarget = ref<WebFavoriteItem | null>(null)

const isEditing = computed(() => !!editingItem.value)
/** 网页类节点（新建网址或编辑带 url 的节点）才展示网址 / 会话隔离 / 静音字段 */
const isPage = computed(() => (isEditing.value ? !!editingItem.value!.url : addType.value === 'page'))
const dialogTitle = computed(() => {
  if (isEditing.value) return t('views.webFavorites.edit')
  return addType.value === 'page' ? t('views.webFavorites.addUrl') : t('views.webFavorites.addFolder')
})
const canSave = computed(() => {
  const label = form.label.trim()
  if (!label) return false
  return !isPage.value || /^https?:\/\/\S+$/i.test(form.url.trim())
})

/** 打开对话框：编辑传 item；新建传 type（由入口按钮决定，对话框内不可切换）与可选 parentId */
function openDialog(options: { item?: WebFavoriteItem; type?: FavoriteType; parentId?: string | null } = {}) {
  const item = options.item || null
  editingItem.value = item
  addType.value = options.type || (item?.url ? 'page' : 'folder')
  addParentId.value = item ? null : (options.parentId ?? null)
  form.label = item?.label || ''
  form.url = item?.url || ''
  // 存储值为完整 partition（persist:xxx），输入框展示去掉前缀的名称
  form.partition = item?.partition?.replace(/^persist:/, '') || ''
  form.muted = item?.muted === true
  dialogOpen.value = true
}

/** 输入的会话名规范为完整 partition 值：空 → 不隔离；未带前缀 → 补 persist:（持久化会话） */
function normalizePartition(input: string): string | undefined {
  const name = input.trim()
  if (!name) return undefined
  return name.startsWith('persist:') ? name : `persist:${name}`
}

function save() {
  if (!canSave.value) return
  const label = form.label.trim()
  if (editingItem.value) {
    // 编辑：类型不变，仅改表单字段
    if (editingItem.value.url) {
      update(editingItem.value.id, {
        label,
        url: form.url.trim(),
        partition: normalizePartition(form.partition),
        muted: form.muted,
      })
    } else {
      update(editingItem.value.id, { label })
    }
  } else if (addType.value === 'page') {
    add({
      label, url: form.url.trim(), open: true,
      partition: normalizePartition(form.partition),
      muted: form.muted,
    }, addParentId.value)
  } else {
    add({ label, open: true }, addParentId.value)
  }
  dialogOpen.value = false
}

function confirmDelete() {
  if (deleteTarget.value) remove(deleteTarget.value.id)
  deleteTarget.value = null
}

function buildContextMenuItems(_type: 'folder' | 'tag', item: any): MenuItem[] {
  if (!item) {
    return [
      { label: t('views.webFavorites.addUrl'), icon: 'link', command: () => openDialog({ type: 'page' }) },
      { label: t('views.webFavorites.addFolder'), icon: 'create_new_folder', command: () => openDialog({ type: 'folder' }) },
    ]
  }
  const target = findLocalItem(String(item.id))
  if (!target) return []
  if (target.url) {
    // 网页节点：打开 / 独立窗口 / 编辑 / 删除（不支持再挂子项）
    return [
      { label: t('views.webFavorites.open'), icon: 'language', command: () => handleSelect({ ...target, ctrlKey: false }) },
      { label: t('views.webFavorites.openExternal'), icon: 'open_in_new', command: () => openInWindow(target.url!, target.label) },
      { separator: true },
      { label: t('views.webFavorites.edit'), icon: 'edit', command: () => openDialog({ item: target }) },
      { label: t('views.webFavorites.delete'), icon: 'delete', class: 'text-destructive', command: () => { deleteTarget.value = target } },
    ]
  }
  // 文件夹节点：添加子网址 / 添加子文件夹 / 编辑 / 删除
  return [
    { label: t('views.webFavorites.addChildUrl'), icon: 'link', command: () => openDialog({ type: 'page', parentId: target.id }) },
    { label: t('views.webFavorites.addChildFolder'), icon: 'create_new_folder', command: () => openDialog({ type: 'folder', parentId: target.id }) },
    { separator: true },
    { label: t('views.webFavorites.edit'), icon: 'edit', command: () => openDialog({ item: target }) },
    { label: t('views.webFavorites.delete'), icon: 'delete', class: 'text-destructive', command: () => { deleteTarget.value = target } },
  ]
}

function findLocalItem(id: string): WebFavoriteItem | null {
  const walk = (nodes: WebFavoriteItem[]): WebFavoriteItem | null => {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children?.length) {
        const found = walk(n.children)
        if (found) return found
      }
    }
    return null
  }
  return walk(items.value)
}

defineExpose({
  /** 标题栏按钮：新建网址 / 新建文件夹（均加到根级） */
  handleAddUrl: () => openDialog({ type: 'page' }),
  handleAddFolder: () => openDialog({ type: 'folder' }),
  showSearch: computed(() => treeRef.value?.showSearch),
  toggleSearch: () => treeRef.value?.toggleSearch?.(),
})
</script>
