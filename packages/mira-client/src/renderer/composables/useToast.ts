// PrimeVue useToast compatibility layer using vue-sonner
import { toast } from 'vue-sonner'

export function useToast() {
  return {
    add: (options: {
      severity?: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast'
      summary?: string
      detail?: string
      life?: number
      closable?: boolean
      group?: string
      style?: any
      content?: any
    }) => {
      const severityMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
        success: 'success',
        info: 'info',
        warn: 'warning',
        error: 'error',
        secondary: 'info',
        contrast: 'info',
      }
      const type = severityMap[options.severity ?? 'info'] ?? 'info'
      const message = options.detail || options.summary || ''
      toast[type](message, { duration: options.life || 3000 })
    },
    remove: (_id: any) => {
      // no-op for compatibility
    },
    removeAll: () => {
      // no-op for compatibility
    },
  }
}
