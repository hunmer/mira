import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { deviceApi } from '@/api'
import { toast } from 'vue-sonner'

export function useBroadcast() {
  const { t } = useI18n()
  const dialogOpen = ref(false)
  const broadcastMsg = ref('')
  const sending = ref(false)

  function openDialog() {
    broadcastMsg.value = ''
    dialogOpen.value = true
  }

  async function sendBroadcast(clientIds?: string[]) {
    const msg = broadcastMsg.value.trim()
    if (!msg) {
      toast.warning(t('device.messageRequired'))
      return
    }
    sending.value = true
    try {
      const payload: Record<string, any> = { message: msg, title: 'Administrator' }
      if (clientIds?.length) {
        payload.clientIds = clientIds
      }
      const res = await deviceApi.broadcast(payload)
      const count = res.data?.data?.sentCount ?? 0
      toast.success(t('device.sendSuccess', { count }))
      dialogOpen.value = false
    } catch {
      toast.error(t('common.failed'))
    } finally {
      sending.value = false
    }
  }

  return { dialogOpen, broadcastMsg, sending, openDialog, sendBroadcast }
}
