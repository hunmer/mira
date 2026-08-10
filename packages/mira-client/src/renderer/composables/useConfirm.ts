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
        // 不在此处写死默认文案，交由渲染层(App.vue)用 i18n 兜底，
        // 否则这里给的常量会盖掉渲染层的本地化默认值。
        acceptLabel: options.acceptLabel,
        rejectLabel: options.rejectLabel,
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
