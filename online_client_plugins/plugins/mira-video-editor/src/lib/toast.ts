/**
 * Toast 通知服务
 * 使用 vue-sonner 库
 */

import { toast as sonnerToast } from 'vue-sonner'

type ToastType = 'success' | 'error' | 'warning' | 'info'

class ToastService {
  private initialized = false
  private initialize() {
    if (!this.initialized) {
      // 确保样式已加载
      if (!document.querySelector('#vue-sonner-style')) {
        const style = document.createElement('link')
        style.id = 'vue-sonner-style'
        style.rel = 'stylesheet'
        style.href = 'data:text/css;charset=utf-8,' + encodeURIComponent(`
          .sonner-toast {
            animation: sonmer-toast-in 0.2s ease forwards;
          }
          .sonner-toast {
            background-color: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 300px;
            max-width: 400px;
          }
        `)
        document.head.appendChild(style)
      }
      this.initialized = true
    }
  }

  private show(type: ToastType, message: string, title?: string, duration?: number) {
    this.initialize()
    const options: any = {
      duration: duration ?? 5000,
    }

    if (title) {
      options.description = message
      sonnerToast[type](title, options)
    } else {
      sonnerToast[type](message, options)
    }
  }

  success(message: string, title?: string, duration?: number) {
    this.show('success', message, title, duration)
  }

  error(message: string, title?: string, duration?: number) {
    this.show('error', message, title, duration)
  }

  warning(message: string, title?: string, duration?: number) {
    this.show('warning', message, title, duration)
  }

  info(message: string, title?: string, duration?: number) {
    this.show('info', message, title, duration)
  }
}

export const toast = new ToastService()
