<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RiExternalLinkLine } from '@remixicon/vue'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { CookieSite } from '@/types/mira'

const { t } = useI18n()

const open = defineModel<boolean>('open', { required: true })
const text = defineModel<string>({ required: true })

defineProps<{ site: CookieSite | null }>()

defineEmits<{ save: [] }>()

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('settings.download.manualDialog.title') }}</DialogTitle>
        <DialogDescription>
          {{ t('settings.download.manualDialog.desc') }}
          <span v-if="site" class="font-medium text-foreground">{{ site.name }}{{ site.label ? ' / ' + site.label : '' }}</span>
        </DialogDescription>
      </DialogHeader>
      <div class="py-2">
        <Textarea
          v-model="text"
          :placeholder="t('settings.download.manualDialog.placeholder')"
          rows="8"
          class="font-mono text-xs"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" class="mr-auto" @click="openExternal(site?.url || '')">
          <RiExternalLinkLine class="size-4 mr-1" />
          {{ t('settings.download.addDialog.url') }}
        </Button>
        <Button @click="$emit('save')">{{ t('settings.download.manualDialog.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
