import { toast } from 'vue-sonner'

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
  const id = toast.loading(`${options.label} 0/${total}...`)

  for (const item of items) {
    try {
      await operation(item)
      completed++
    } catch {
      failed++
    }
    toast.loading(`${options.label} ${completed + failed}/${total}...`, { id })
  }

  if (failed === 0) {
    toast.success(`${options.label}完成 ${completed}/${total}`, { id, duration: 3000 })
  } else {
    toast.error(`${options.label}完成: 成功 ${completed}, 失败 ${failed}`, { id, duration: 5000 })
  }
}
