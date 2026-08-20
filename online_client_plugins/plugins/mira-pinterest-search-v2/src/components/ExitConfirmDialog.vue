<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'mira-plugin-ui/src/components/ui/alert-dialog'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { t } from '@/lib/i18n'

/** 退出确认：确认后关闭插件窗口 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

function quit() {
  emit('update:open', false)
  // 插件窗口由宿主创建，window.close() 在 Electron 中可直接关闭
  window.close()
}
</script>

<template>
  <AlertDialog :open="open" @update:open="(value) => emit('update:open', value)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('dialog.exit.title') }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t('dialog.exit.description') }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">{{ t('dialog.exit.cancel') }}</Button>
        <Button class="bg-destructive text-white hover:bg-destructive/90" @click="quit">
          {{ t('dialog.exit.ok') }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
