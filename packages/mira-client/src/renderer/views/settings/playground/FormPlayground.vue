<template>
  <!-- ============ 声明式表单 Tab ============ -->
  <TabsContent value="form" class="space-y-4 mt-4">
    <div class="space-y-1">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.formIntro') }}</p>
      <p class="text-xs text-muted-foreground">
        {{ $t('views.playgroundPanel.formIntroDesc') }}
      </p>
    </div>

    <Card class="bg-background/40">
      <CardContent class="pt-6">
        <SchemaForm
          :schema="formSchema"
          :fields="formFields"
          :initial-values="formInitialValues"
          :title="$t('views.playgroundPanel.formTitle')"
          :form-description="$t('views.playgroundPanel.formDesc')"
          :submit-text="$t('views.playgroundPanel.submit')"
          :submitting="formSubmitting"
          @submit="onFormSubmit"
          @cancel="onFormCancel"
          @invalid="onFormInvalid"
        />
      </CardContent>
    </Card>

    <!-- 提交结果预览 -->
    <div v-if="formResult" class="space-y-2">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.resultTitle') }}</p>
      <pre class="rounded-lg border border-border bg-muted/40 p-3 text-xs overflow-auto max-h-60">{{ formResult }}</pre>
    </div>
  </TabsContent>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { SchemaForm, type SchemaField } from '@/renderer/components/business/SchemaForm'

const { t } = useI18n()

// zod schema：数据类型 + 校验规则的单一真源
const formSchema = computed(() => z.object({
  name: z.string().min(2, t('views.playgroundPanel.nameMin')).max(50, t('views.playgroundPanel.nameMax')),
  type: z.enum(['admin', 'user', 'guest'], { message: t('views.playgroundPanel.selectTypeRequired') }),
  level: z.number().min(0).max(100),
  enabled: z.boolean(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(200, t('views.playgroundPanel.descMax')).optional(),
  birthday: z.date().optional(),
}))

// 字段元数据：驱动渲染
const formFields = computed<SchemaField[]>(() => [
  { name: 'name', label: t('views.playgroundPanel.nameLabel'), type: 'text', required: true, placeholder: t('views.playgroundPanel.namePlaceholder') },
  { name: 'type', label: t('views.playgroundPanel.typeLabel2'), type: 'select', required: true, placeholder: t('views.playgroundPanel.typePlaceholder'),
    options: [
      { label: t('views.playgroundPanel.admin'), value: 'admin' },
      { label: t('views.playgroundPanel.user'), value: 'user' },
      { label: t('views.playgroundPanel.guest'), value: 'guest' },
    ],
  },
  { name: 'level', label: t('views.playgroundPanel.levelLabel'), type: 'slider', min: 0, max: 100, step: 1 },
  { name: 'enabled', label: t('views.playgroundPanel.enabledLabel'), type: 'switch', description: t('views.playgroundPanel.enabledDesc') },
  { name: 'tags', label: t('views.playgroundPanel.tagsLabel'), type: 'checkbox-group',
    options: [
      { label: t('views.playgroundPanel.tagInternal'), value: 'internal' },
      { label: t('views.playgroundPanel.tagPublic'), value: 'public' },
      { label: t('views.playgroundPanel.tagArchived'), value: 'archived' },
    ],
  },
  { name: 'birthday', label: t('views.playgroundPanel.birthdayLabel'), type: 'date' },
  { name: 'description', label: t('views.playgroundPanel.descriptionLabel'), type: 'textarea', colSpan: 2, placeholder: t('views.playgroundPanel.descriptionPlaceholder') },
])

const formInitialValues = {
  name: '',
  type: undefined,
  level: 30,
  enabled: true,
  tags: [],
  description: '',
}

const formSubmitting = ref(false)
const formResult = ref<string>('')

// FormValues 类型：与 formSchema 结构保持一致（独立定义，避免依赖 ComputedRef 做类型推导）
type FormValues = {
  name: string
  type: 'admin' | 'user' | 'guest'
  level: number
  enabled: boolean
  tags?: string[]
  description?: string
  birthday?: Date
}

function onFormSubmit(values: Record<string, unknown>) {
  const data = values as FormValues
  formSubmitting.value = true
  // 模拟异步提交
  setTimeout(() => {
    formResult.value = JSON.stringify(data, null, 2)
    formSubmitting.value = false
    toast.success(t('views.playgroundPanel.formSubmitSuccess'), { description: t('views.playgroundPanel.formSubmitSuccessDesc') })
  }, 600)
}

function onFormCancel() {
  formResult.value = ''
  toast(t('views.playgroundPanel.cancelled'))
}

function onFormInvalid(errors: Record<string, string>) {
  const first = Object.values(errors)[0]
  toast.error(t('views.playgroundPanel.validationFailed'), { description: first || t('views.playgroundPanel.validationFailedDesc') })
}
</script>
