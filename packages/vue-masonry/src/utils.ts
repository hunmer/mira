/**
 * 轻量 class 拼接工具(零依赖,不引入 tailwind-merge / clsx)
 *
 * 支持 string / number / array / object / 嵌套结构,过滤掉假值后用空格拼接。
 * 用于 Masonry 容器 `cn('relative w-full', props.class)` 这类简单场景。
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  const walk = (val: ClassValue): void => {
    if (!val && val !== 0) return
    if (typeof val === "string" || typeof val === "number") {
      out.push(String(val))
    } else if (Array.isArray(val)) {
      for (const v of val) walk(v)
    }
  }
  for (const v of inputs) walk(v)
  return out.join(" ")
}
