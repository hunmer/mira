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
import { resolveInputWarning, state } from '@/stores/tasks'

/** 超量输入确认：>5 张时询问是否全部加载（取消则只加载前 5 张） */
</script>

<template>
  <AlertDialog
    :open="Boolean(state.inputWarning)"
    @update:open="(open) => !open && state.inputWarning && resolveInputWarning(false)"
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('dialog.inputWarning.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('dialog.inputWarning.description', { count: state.inputWarning?.count ?? 0 }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button variant="outline" @click="resolveInputWarning(false)">{{ t('dialog.inputWarning.cancel') }}</Button>
        <Button @click="resolveInputWarning(true)">{{ t('dialog.inputWarning.ok') }}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
