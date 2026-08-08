import { reactive } from 'vue'
import { useI18n } from 'vue-i18n'

export interface ConfirmOptions {
  /** Dialog title. Defaults to the i18n `common.deleteWarningTitle`. */
  title?: string
  /** Dialog description. Defaults to the i18n `common.deleteWarningDesc`. */
  description?: string
  /** Text for the confirm button. Defaults to `common.delete`. */
  confirmText?: string
  /** Text for the cancel button. Defaults to `common.cancel`. */
  cancelText?: string
}

/**
 * Promise-based confirm dialog backed by the shadcn-vue AlertDialog.
 *
 * Usage:
 *   const { confirmDialog, requireConfirm } = useConfirmDialog()
 *   if (!(await requireConfirm())) return
 *   <ConfirmDialog v-bind="confirmDialog" />
 *
 * `confirmDialog` is a reactive object, so it unwraps correctly when
 * spread onto the component via `v-bind`.
 */
export function useConfirmDialog() {
  const { t } = useI18n()

  const confirmDialog = reactive({
    open: false,
    title: '',
    description: '',
    confirmText: '',
    cancelText: '',
    resolve: (_result: boolean) => {},
  })

  let resolver: ((value: boolean) => void) | null = null

  function requireConfirm(options: ConfirmOptions = {}): Promise<boolean> {
    confirmDialog.title = options.title ?? t('common.deleteWarningTitle')
    confirmDialog.description = options.description ?? t('common.deleteWarningDesc')
    confirmDialog.confirmText = options.confirmText ?? t('common.delete')
    confirmDialog.cancelText = options.cancelText ?? t('common.cancel')
    confirmDialog.open = true

    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  confirmDialog.resolve = (result: boolean) => {
    if (resolver) {
      resolver(result)
      resolver = null
    }
    confirmDialog.open = false
  }

  return { confirmDialog, requireConfirm }
}
