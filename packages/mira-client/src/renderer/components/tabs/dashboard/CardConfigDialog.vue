<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>小组件配置</DialogTitle>
        <DialogDescription v-if="cardTitle">
          {{ cardTitle }}
        </DialogDescription>
      </DialogHeader>

      <!-- 无可配置项 -->
      <div v-if="!hasFields" class="py-8 text-center text-sm text-muted-foreground">
        <span class="material-icons mb-2 block text-2xl">tune</span>
        此小组件暂无可配置项
      </div>

      <!-- 声明式表单：复用 SchemaForm，字段与校验来自 CardDefinition -->
      <SchemaForm
        v-else
        :schema="schema"
        :fields="fields"
        :initial-values="initialValues"
        layout="single"
        submit-text="保存"
        cancel-text="取消"
        :submitting="submitting"
        @submit="onSubmit"
        @cancel="onCancel"
      />
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { z } from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SchemaForm } from '@/renderer/components/business/SchemaForm'
import type { SchemaField } from '@/renderer/components/business/SchemaForm'
import { cardRegistry } from './CardRegistry'
import { useDashboardLayoutStore } from '@renderer/stores/dashboardLayout'

/**
 * 「打开小组件配置窗口」对话框。
 *
 * 采用声明式表单：直接把 CardDefinition.configFields（SchemaField[]）+ configSchema（zod）
 * 喂给 SchemaForm，由其自动渲染控件并校验，参考 PlaygroundPanel 的「声明式表单」用法。
 * 保存时把校验通过的 values 写入对应实例的 config。
 *
 * 通过 v-model:open 控制显隐，由父组件在打开前把 instanceId 设进来。
 */
interface Props {
  /** 双向绑定的显隐状态 */
  modelValue: boolean
  /** 要配置的卡片实例 id */
  instanceId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const store = useDashboardLayoutStore()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

/** 当前实例的卡片类型定义 */
const def = computed(() => {
  if (!props.instanceId) return null
  const meta = store.getMeta(props.instanceId)
  return meta ? cardRegistry.get(meta.type) : null
})

const cardTitle = computed(() => def.value?.title ?? '')
const hasFields = computed(() => !!def.value?.configFields?.length)
const fields = computed<SchemaField[]>(() => def.value?.configFields ?? [])

/** 没有声明 schema 时退化为宽松的「全接收」对象 schema，避免阻塞提交 */
const schema = computed<z.ZodType>(() => def.value?.configSchema ?? z.object({}).passthrough())

/** 回填用的初始值：当前实例生效配置 */
const initialValues = computed<Record<string, unknown>>(() => {
  if (!props.instanceId) return {}
  return store.getConfig(props.instanceId)
})

const submitting = ref(false)

watch(
  () => props.modelValue,
  (isOpen) => {
    // 打开时重置提交态
    if (isOpen) submitting.value = false
  },
)

function onSubmit(values: Record<string, unknown>) {
  if (!props.instanceId) return
  submitting.value = true
  store.updateInstanceConfig(props.instanceId, values)
  submitting.value = false
  open.value = false
}

function onCancel() {
  open.value = false
}
</script>
