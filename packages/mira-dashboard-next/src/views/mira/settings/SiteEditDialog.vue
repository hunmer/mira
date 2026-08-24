<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

export interface SiteFormData {
  name: string
  url: string
  remark: string
  label: string
}

const { t } = useI18n()

const open = defineModel<boolean>('open', { required: true })
const form = defineModel<SiteFormData>({ required: true })

defineProps<{ urlExists: boolean }>()

defineEmits<{ save: [] }>()
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('settings.download.addDialog.title') }}</DialogTitle>
      </DialogHeader>
      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <Label>{{ t('settings.download.addDialog.name') }}</Label>
          <Input v-model="form.name" :placeholder="t('settings.download.addDialog.namePlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('settings.download.addDialog.url') }}</Label>
          <Input v-model="form.url" :placeholder="t('settings.download.addDialog.urlPlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('settings.download.label') }}</Label>
          <Input v-model="form.label" :placeholder="t('settings.download.labelPlaceholder')" />
        </div>
        <p v-if="urlExists" class="text-xs text-yellow-600 dark:text-yellow-400">
          {{ t('settings.download.newGroupHint') }}
        </p>
        <div class="space-y-2">
          <Label>{{ t('settings.download.addDialog.remark') }}</Label>
          <Input v-model="form.remark" :placeholder="t('settings.download.addDialog.remarkPlaceholder')" />
        </div>
      </div>
      <DialogFooter>
        <Button @click="$emit('save')">{{ t('common.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
