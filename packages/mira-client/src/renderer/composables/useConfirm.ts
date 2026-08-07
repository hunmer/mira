// PrimeVue useConfirm compatibility layer using a simple reactive confirm dialog
import { ref } from 'vue'

const confirmState = ref<{
  visible: boolean
  header?: string
  message?: string
  acceptLabel?: string
  rejectLabel?: string
  onAccept?: () => void
  onReject?: () => void
}>({
  visible: false,
})

export function useConfirm() {
  return {
    require: (options: {
      header?: string
      message?: string
      acceptLabel?: string
      rejectLabel?: string
      accept?: () => void
      reject?: () => void
      group?: string
    }) => {
      confirmState.value = {
        visible: true,
        header: options.header,
        message: options.message,
        acceptLabel: options.acceptLabel || 'Confirm',
        rejectLabel: options.rejectLabel || 'Cancel',
        onAccept: options.accept,
        onReject: options.reject,
      }
    },
    close: () => {
      confirmState.value.visible = false
    },
  }
}

export { confirmState }
