import { h } from 'vue'
import { toast } from 'vue-sonner'
import { Progress } from '@/components/ui/progress'
import i18n from '../i18n'

interface BatchOptions {
  label: string
}

export async function runBatchOperation<T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  options: BatchOptions
) {
  if (items.length === 0) return

  if (items.length === 1) {
    await operation(items[0])
    return
  }

  const total = items.length
  let completed = 0
  let failed = 0
  const toastId = `batch-${Date.now()}`

  const updateToast = (done: boolean) => {
    const current = completed + failed
    const percent = Math.round((current / total) * 100)
    const text = done
      ? (failed === 0
        ? i18n.global.t('composables.useBatchOperation.completedAll', { label: options.label, completed, total })
        : i18n.global.t('composables.useBatchOperation.completedWithFailures', { label: options.label, completed, failed }))
      : i18n.global.t('composables.useBatchOperation.progress', { label: options.label, current, total })

    if (done) {
      toast.dismiss(toastId)
    }

    toast.custom(
      h('div', { class: 'w-64 space-y-1.5 p-3' }, [
        h('p', { class: 'text-sm font-medium' }, text),
        h(Progress, { modelValue: percent, class: 'h-1.5' })
      ]),
      { id: done ? undefined : toastId, duration: done ? (failed > 0 ? 5000 : 3000) : Infinity }
    )
  }

  updateToast(false)

  for (const item of items) {
    try {
      await operation(item)
      completed++
    } catch {
      failed++
    }
    updateToast(completed + failed === total)
  }
}
