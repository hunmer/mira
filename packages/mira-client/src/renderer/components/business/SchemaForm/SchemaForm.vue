<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { useSchemaForm } from './useSchemaForm'
import FieldRenderer from './FieldRenderer.vue'
import type { SchemaFormEmits, SchemaFormProps } from './types'

const { t } = useI18n()

const props = withDefaults(defineProps<SchemaFormProps>(), {
  layout: 'grid',
  submitText: '',
  cancelText: '',
  submitting: false,
})

// 默认按钮文案本地化（props 未传入时回退）
const resolvedSubmitText = computed(() => props.submitText || t('business.schemaForm.submit'))
const resolvedCancelText = computed(() => props.cancelText || t('business.schemaForm.cancel'))

const emit = defineEmits<SchemaFormEmits>()

const { onSubmit } = useSchemaForm(props, emit)
</script>

<template>
  <!-- vee-validate 的表单上下文由 useForm() 在 useSchemaForm 中建立，
       <FormField> 子节点通过 inject 自动注入，无需 <Form> 组件包裹。 -->
  <form class="space-y-6" @submit="onSubmit">
    <!-- 标题 / 描述 -->
    <div v-if="title || formDescription" class="space-y-1">
      <h3 v-if="title" class="text-lg font-semibold leading-none tracking-tight">{{ title }}</h3>
      <p v-if="formDescription" class="text-sm text-muted-foreground">{{ formDescription }}</p>
    </div>

    <!-- 字段区 -->
    <div
      :class="[
        layout === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2'
          : 'flex flex-col gap-y-2'
      ]"
    >
      <FieldRenderer
        v-for="field in fields"
        :key="field.name"
        :field="field"
      />
    </div>

    <!-- 操作区 -->
    <div class="flex justify-end gap-3 pt-2">
      <Button type="button" variant="outline" @click="emit('cancel')">
        {{ resolvedCancelText }}
      </Button>
      <Button type="submit" :disabled="submitting">
        {{ resolvedSubmitText }}
      </Button>
    </div>
  </form>
</template>
