<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export interface LibraryFormData {
  name: string
  path: string
  type: 'local' | 'remote'
  description: string
  icon: string
  enableHash: boolean
  enableAutoSync: boolean
  useHttpFile: boolean
  serverURL: string
  serverPort: string
  pluginsDir: string
}

const props = defineProps<{
  open: boolean
  isEdit: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: []
}>()

const { t } = useI18n()

const form = defineModel<LibraryFormData | null>({ required: true })

const showServerFields = () => form.value?.type === 'remote' || form.value?.useHttpFile
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? t('library.editLibrary') : t('library.createLibrary') }}</DialogTitle>
      </DialogHeader>
      <div v-if="form" class="space-y-4">
        <div class="space-y-2">
          <Label>{{ t('common.name') }}</Label>
          <Input v-model="form.name" :placeholder="t('library.namePlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('library.path') }}</Label>
          <Input v-model="form.path" :placeholder="t('library.pathPlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('library.type') }}</Label>
          <Select v-model="form.type">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">{{ t('library.local') }}</SelectItem>
              <SelectItem value="remote">{{ t('library.remote') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <Label>{{ t('library.icon') }}</Label>
          <Input v-model="form.icon" :placeholder="t('library.iconPlaceholder')" />
        </div>
        <div class="flex items-center gap-2">
          <input id="enableHash" v-model="form.enableHash" type="checkbox" class="size-4 rounded border-input" />
          <Label for="enableHash">{{ t('library.enableHash') }}</Label>
        </div>
        <div class="flex items-center gap-2">
          <input id="enableAutoSync" v-model="form.enableAutoSync" type="checkbox" class="size-4 rounded border-input" />
          <Label for="enableAutoSync">{{ t('library.enableAutoSync') }}</Label>
        </div>
        <div class="flex items-center gap-2">
          <input id="useHttpFile" v-model="form.useHttpFile" type="checkbox" class="size-4 rounded border-input" />
          <Label for="useHttpFile">{{ t('library.useHttpFile') }}</Label>
        </div>
        <template v-if="showServerFields()">
          <div class="space-y-2">
            <Label>{{ t('library.serverURL') }}</Label>
            <Input v-model="form.serverURL" :placeholder="t('library.serverURLPlaceholder')" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('library.serverPort') }}</Label>
            <Input v-model="form.serverPort" :placeholder="t('library.serverPortPlaceholder')" />
          </div>
        </template>
        <div class="space-y-2">
          <Label>{{ t('library.pluginsDir') }}</Label>
          <Input v-model="form.pluginsDir" :placeholder="t('library.pluginsDirPlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('common.description') }}</Label>
          <textarea
            v-model="form.description"
            :placeholder="t('library.descriptionPlaceholder')"
            rows="3"
            class="border-input bg-background w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">{{ t('common.cancel') }}</Button>
        <Button @click="emit('save')">{{ t('common.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
