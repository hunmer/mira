<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? '编辑布局' : '新建布局' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? '修改当前布局的标题与图标' : '为仪表盘创建一个新的布局，每个布局拥有独立的小组件与布局配置' }}
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 py-2" @submit.prevent="onSubmit">
        <!-- 标题 -->
        <div class="space-y-2">
          <label for="layout-name" class="block text-sm font-medium text-foreground">标题</label>
          <Input
            id="layout-name"
            ref="nameInputRef"
            v-model="form.name"
            class="w-full"
            :class="{ 'border-destructive': errors.name }"
            placeholder="请输入布局标题"
            maxlength="32"
            :data-invalid="!!errors.name"
          />
          <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
        </div>

        <!-- 图标 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">图标（可选）</label>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors"
              :class="!form.icon ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'"
              title="不使用图标"
              @click="form.icon = undefined"
            >
              <span class="material-icons text-base">block</span>
            </button>
            <button
              v-for="name in iconOptions"
              :key="name"
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors"
              :class="form.icon === name ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'"
              :title="name"
              @click="form.icon = name"
            >
              <span class="material-icons text-base">{{ name }}</span>
            </button>
          </div>
        </div>
      </form>

      <DialogFooter>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
            @click="open = false"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            :disabled="!canSubmit"
            @click="onSubmit"
          >
            {{ isEdit ? '保存' : '创建' }}
          </button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDashboardLayoutStore } from '@renderer/stores/dashboardLayout'

/**
 * 布局「新增 / 编辑」对话框。
 *
 * - 新建：填好标题（+ 可选图标）后调用 store.addLayout，并自动切换到新布局。
 * - 编辑：打开前通过 :layout-id 指定要编辑的布局，回填标题/图标，保存时 renameLayout。
 *
 * 通过 v-model:open 控制显隐；每次打开时根据 mode / layoutId 重置表单。
 */

interface Props {
  /** 双向绑定的显隐状态 */
  modelValue: boolean
  /** 'create' 新建 | 'edit' 编辑 */
  mode?: 'create' | 'edit'
  /** 编辑模式下要修改的布局 id；新建模式忽略 */
  layoutId?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  layoutId: undefined,
})
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const store = useDashboardLayoutStore()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => props.mode === 'edit')

/** 可选图标集合（与仪表盘语境贴合） */
const iconOptions = [
  'dashboard',
  'space_dashboard',
  'view_quilt',
  'widgets',
  'auto_awesome',
  'star',
  'favorite',
  'work',
  'home',
  'photo_library',
  'tag',
  'folder',
] as const

interface FormState {
  name: string
  icon?: string
}
const form = ref<FormState>({ name: '', icon: undefined })
const errors = ref<{ name?: string }>({})

const nameInputRef = ref<any>(null)

const canSubmit = computed(() => form.value.name.trim().length > 0 && !errors.value.name)

/** 校验标题 */
function validate(): boolean {
  const next: { name?: string } = {}
  const name = form.value.name.trim()
  if (!name) next.name = '请输入标题'
  else if (name.length > 32) next.name = '标题不能超过 32 个字符'
  // 新建模式：标题去重（允许与其它布局同名，但提示一下）
  errors.value = next
  return !next.name
}

/** 打开时回填/重置表单 */
watch(
  () => [props.modelValue, props.mode, props.layoutId] as const,
  ([isOpen]) => {
    if (!isOpen) return
    errors.value = {}
    if (isEdit.value) {
      const target = store.layouts.find((l) => l.id === props.layoutId)
      form.value = { name: target?.name ?? '', icon: target?.icon }
    } else {
      form.value = { name: '', icon: undefined }
    }
    // 自动聚焦输入框：Input 组件未暴露 focus，取其根 DOM 元素
    nextTick(() => {
      const inst = nameInputRef.value
      const el = (inst?.$el ?? inst) as HTMLElement | undefined
      el?.focus?.()
    })
  },
  { immediate: true },
)

async function onSubmit() {
  if (!validate()) return
  const name = form.value.name.trim()
  if (isEdit.value && props.layoutId) {
    await store.renameLayout(props.layoutId, name)
    if (form.value.icon !== undefined) {
      await store.updateLayoutIcon(props.layoutId, form.value.icon)
    }
  } else {
    await store.addLayout(name, form.value.icon)
  }
  open.value = false
}
</script>
