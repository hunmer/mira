<script setup lang="ts">
/**
 * 新建/编辑节点(文件夹/标签)对话框:图标/颜色/名称/描述 + 父级树选择(自 SaveLocationForm 抽离)。
 *
 * 确认后 await createNode/updateNode 服务创建或更新(失败错误展示在对话框内),成功关闭并
 * emit('created'/'updated') 由宿主决定刷新/展开/选中。
 * 传入 node 即编辑模式:回填该节点字段,隐藏父级树(移动走拖拽),确认走 updateNode。
 * 父级树的展开与搜索状态内部自持:每次打开重置并默认展开全部。
 * 文案经 t prop 注入(宿主缺 key 时回退内置中文)。
 *
 * 样式为 tailwind/shadcn 原子类,无 scoped CSS(见仓库 ui_rule.md)。
 */
import { computed, ref, watch } from 'vue'
import { Check, Loader2 } from '@lucide/vue'
// 注意:library 子入口以源码供宿主直接消费,这里必须用相对路径(宿主的 @ 别名指向其自身 src)
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { IconPicker } from '../components/ui/icon-picker'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import LibraryTree from './LibraryTree.vue'
import { createLibraryTreeT } from './i18n'
import { ROOT_ID, collectIds, filterTree, flattenTree } from './tree'
import type { LibraryTreeNode, LibraryTreeCreatePayload, LibraryTreeT, LibraryTreeUpdatePayload } from './types'

const props = withDefaults(defineProps<{
  kind: LibraryTreeCreatePayload['kind']
  /** 父级选择树(含根行,由宿主拼好:folder=根目录行+文件夹树,tag=根标签行+标签树) */
  nodes: LibraryTreeNode[]
  /** 打开时默认选中的父级 id(0=根) */
  defaultParentId?: number
  /** 创建服务:返回新节点 id 供宿主选中(失败抛错展示在对话框内) */
  createNode: (payload: LibraryTreeCreatePayload) => Promise<number | undefined>
  /** 编辑目标(传入即编辑模式)与更新服务:确认时走 updateNode 而非 createNode */
  node?: LibraryTreeNode
  updateNode?: (payload: LibraryTreeUpdatePayload) => Promise<unknown>
  /** 文案函数,缺省用内置中文 */
  t?: LibraryTreeT
}>(), { defaultParentId: 0 })

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  /** 创建成功:id 为服务返回的新节点 id(部分实现拿不到时缺省) */
  (event: 'created', value: { id?: number; parentId: number }): void
  /** 编辑保存成功 */
  (event: 'updated', value: { id: number; parentId: number }): void
}>()

/** 编辑模式:传入 node 即编辑(回填字段,隐藏父级树,确认走 updateNode) */
const editing = computed(() => !!props.node)

const fallbackT = createLibraryTreeT()
/** 宿主未传 t 或宿主缺 key(vue-i18n 返回 key 本身)时回退内置中文 */
function tt (key: string, params?: Record<string, unknown>): string {
  if (!props.t) return fallbackT(key, params)
  const r = props.t(key, params)
  return r === key ? fallbackT(key, params) : r
}

const kindText = computed(() => tt(props.kind === 'folder' ? 'common.folder' : 'common.tag'))

const form = ref({ title: '', description: '', color: null as number | null, icon: '' })
const parentId = ref(0)
const error = ref('')
const submitting = ref(false)

// ---- 父级树:展开(打开时展开全部) + 搜索过滤(输入即过滤,命中分支连同祖先保留) ----
const expanded = ref(new Set<number>())
const searchTerm = ref('')

watch(open, value => {
  if (!value) return
  // 编辑模式回填目标节点;新建模式重置为空表单
  const node = props.node
  form.value = node
    ? { title: node.title, description: node.description ?? '', color: node.color ?? null, icon: node.icon ?? '' }
    : { title: '', description: '', color: null, icon: '' }
  parentId.value = node ? node.parentId : (props.defaultParentId || ROOT_ID)
  searchTerm.value = ''
  error.value = ''
  expanded.value = new Set(flattenTree(props.nodes).filter(n => n.children.length).map(n => n.id))
})

function toggle(id: number) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

const filtered = computed(() => filterTree(props.nodes, searchTerm.value.trim()))
const effectiveExpanded = computed(() =>
  searchTerm.value.trim() ? collectIds(filtered.value.tree) : expanded.value)

/** 选中态:根行(ROOT_ID)占位,id=0 映射为根行 */
const selectedIds = computed(() => new Set([parentId.value || ROOT_ID]))

function onSelectParent(node: LibraryTreeNode) {
  parentId.value = node.id === ROOT_ID ? 0 : node.id
  // 点选定位后清空搜索,树恢复全量
  if (searchTerm.value) searchTerm.value = ''
}

/** 当前所选父级名称(描述文字实时反馈) */
const parentTitle = computed(() =>
  flattenTree(props.nodes).find(node => node.id === (parentId.value || ROOT_ID))?.title || tt('tree.root'))

/** 图标默认值:文件夹 folder / 标签 label(与 mira-client FolderEditDialog 一致) */
const defaultIcon = computed(() => (props.kind === 'folder' ? 'folder' : 'label'))

/** 所选颜色转 #RRGGBB,用于图标预览着色 */
const selectedColorHex = computed(() => {
  const color = form.value.color
  return color && color > 0 ? `#${color.toString(16).padStart(6, '0')}` : ''
})

/** 与 FolderEditDialog colorOptions 一致的固定色板(无色 + 8 色) */
const CREATE_COLORS: { value: number | null; class: string; label: string }[] = [
  { value: null, class: 'bg-accent border-2 border-dashed border-border', label: '无色' },
  { value: 0x3B82F6, class: 'bg-blue-500', label: '蓝色' },
  { value: 0x10B981, class: 'bg-green-500', label: '绿色' },
  { value: 0xF59E0B, class: 'bg-yellow-500', label: '黄色' },
  { value: 0xEF4444, class: 'bg-destructive', label: '红色' },
  { value: 0x8B5CF6, class: 'bg-purple-500', label: '紫色' },
  { value: 0xEC4899, class: 'bg-pink-500', label: '粉色' },
  { value: 0x6366F1, class: 'bg-indigo-500', label: '靛蓝' },
  { value: 0x6B7280, class: 'bg-muted', label: '灰色' },
]

async function submit() {
  if (submitting.value) return
  const title = form.value.title.trim()
  if (!title) {
    error.value = tt('tree.nameRequired', { type: kindText.value })
    return
  }
  if (title.length > 100) {
    error.value = tt('tree.nameTooLong')
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const payload = {
      kind: props.kind,
      parentId: parentId.value,
      title,
      description: form.value.description.trim() || undefined,
      color: form.value.color ?? undefined,
      // 空字符串表示使用默认图标,不提交
      icon: form.value.icon.trim() || undefined,
    }
    if (editing.value && props.node) {
      await props.updateNode?.({ ...payload, id: props.node.id })
      open.value = false
      emit('updated', { id: props.node.id, parentId: parentId.value })
      return
    }
    const id = await props.createNode(payload)
    open.value = false
    emit('created', { id: id ?? undefined, parentId: parentId.value })
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || String(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(value: boolean) => open = value">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ editing ? tt('tree.editTitle', { type: kindText }) : tt('library.create', { type: kindText }) }}</DialogTitle>
        <DialogDescription>{{ editing ? tt('tree.editingNode', { name: props.node?.title }) : tt('tree.createUnder', { parent: parentTitle }) }}</DialogDescription>
      </DialogHeader>

      <form class="grid gap-4" @submit.prevent="submit">
        <!-- 图标:圆形选择按钮居最上方,颜色选择紧随其下 -->
        <div class="flex flex-col items-center gap-3">
          <IconPicker
            v-model="form.icon"
            :default-icon="defaultIcon"
            :color="selectedColorHex"
          />
          <div class="flex flex-wrap justify-center gap-2">
            <button
              v-for="color in CREATE_COLORS"
              :key="String(color.value)"
              type="button"
              :title="color.label"
              class="flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110"
              :class="[color.class, form.color === color.value ? 'ring-primary ring-2 ring-offset-2' : '']"
              @click="form.color = color.value"
            >
              <Check v-if="form.color === color.value" class="size-3.5 text-white" />
            </button>
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="create-node-title">{{ tt('tree.nodeName') }}</Label>
          <Input
            id="create-node-title"
            v-model="form.title"
            autocomplete="off"
            :placeholder="tt('tree.nodeNamePlaceholder', { type: kindText })"
            :class="error && 'border-destructive focus-visible:ring-destructive/20'"
          />
          <p v-if="error" class="text-destructive text-xs">{{ error }}</p>
        </div>

        <div class="grid gap-2">
          <Label for="create-node-description">{{ tt('tree.nodeDescription') }}</Label>
          <textarea
            id="create-node-description"
            v-model="form.description"
            rows="2"
            :placeholder="tt('tree.nodeDescriptionPlaceholder')"
            class="bg-muted ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-16 w-full rounded-md px-3 py-2 text-sm transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>

        <!-- 父级选择:搜索过滤 + 树单选(点根行=建到根);编辑模式不改父级(移动走拖拽),隐藏 -->
        <div v-if="!editing" class="grid gap-2">
          <Label>{{ tt('tree.parentNode', { parent: parentTitle }) }}</Label>
          <Input
            v-model="searchTerm"
            class="h-7"
            autocomplete="off"
            :placeholder="tt('library.searchPlaceholder', { type: kindText })"
          />
          <div class="max-h-48 overflow-y-auto rounded-md border p-1">
            <div v-if="filtered.tree.length" class="text-sm">
              <LibraryTree
                :nodes="filtered.tree"
                :kind="kind"
                :expanded="effectiveExpanded"
                :matched="filtered.matched"
                :selected-ids="selectedIds"
                @toggle="toggle"
                @select="onSelectParent"
              />
            </div>
            <div v-else class="py-6 text-center text-xs text-muted-foreground">{{ tt('library.noMatch', { type: kindText }) }}</div>
          </div>
        </div>
      </form>

      <DialogFooter>
        <Button variant="outline" :disabled="submitting" @click="open = false">{{ tt('common.cancel') }}</Button>
        <Button :disabled="submitting || !form.title.trim()" @click="submit">
          <Loader2 v-if="submitting" class="size-4 animate-spin" />
          <!-- 编辑保存 / 新建创建 按模式切换文案 -->
          <template v-if="editing">{{ submitting ? tt('tree.saving') : tt('common.save') }}</template>
          <template v-else>{{ submitting ? tt('tree.creating') : tt('common.create') }}</template>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
