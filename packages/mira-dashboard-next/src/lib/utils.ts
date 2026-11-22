import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 文件大小格式化（包内唯一实现，B/KB/MB/GB/TB；B 档整数，其余保留 1 位小数）。
 *
 * @param bytes 字节数；0/undefined/null 返回 fallback（默认 '0 B'）
 * @param fallback 无效字节数时的展示文案（如 file-manager 的 '-'）
 */
export function formatSize(bytes?: number, fallback = "0 B"): string {
  if (!bytes) return fallback
  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}
