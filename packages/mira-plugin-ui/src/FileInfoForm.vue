<script setup lang="ts">
/**
 * 文件信息表单(自 SaveLocationForm 抽离):文件名/URL/注释 三项输入。
 * defineModel 受控,可独立使用也可嵌入对话框;文件名输入框 enter 触发 submit 事件
 * (宿主可借此直接确认保存/上传)。
 */
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const fileName = defineModel<string>('fileName', { default: '' })
const url = defineModel<string>('url', { default: '' })
const note = defineModel<string>('note', { default: '' })

withDefaults(defineProps<{
  /** 无选中文件等场景整体禁用 */
  disabled?: boolean
  /** 禁用时的占位说明(显示在表单顶部) */
  placeholder?: string
}>(), {
  disabled: false,
  placeholder: '',
})

const emit = defineEmits<{
  (event: 'submit'): void
}>()
</script>

<template>
  <div class="grid content-start gap-4">
    <p v-if="placeholder" class="text-muted-foreground text-sm">{{ placeholder }}</p>
    <div class="grid gap-2">
      <Label for="file-info-name">文件名</Label>
      <Input id="file-info-name" v-model="fileName" autocomplete="off" :disabled="disabled" @keyup.enter="emit('submit')" />
    </div>
    <div class="grid gap-2">
      <Label for="file-info-url">URL</Label>
      <Input id="file-info-url" v-model="url" type="url" inputmode="url" autocomplete="off" placeholder="https://" :disabled="disabled" />
    </div>
    <div class="grid gap-2">
      <Label for="file-info-note">注释</Label>
      <textarea
        id="file-info-note"
        v-model="note"
        rows="3"
        :disabled="disabled"
        class="bg-muted ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-16 w-full rounded-md px-3 py-2 text-sm transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  </div>
</template>
