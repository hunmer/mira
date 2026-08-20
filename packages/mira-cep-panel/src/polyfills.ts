// CEP 9(Chromium 61)缺少的浏览器 API 补丁。
// esbuild 的 target 只降级语法不降级方法,依赖(vueuse/vue-masonry/SDK)用到的新方法在此补齐。
import 'resize-observer-polyfill'

interface Window {
  globalThis: unknown
  structuredClone: typeof structuredClone
}

const w = window as unknown as Window

// window 即全局对象(Chromium 61 无 globalThis,Chrome 71 才有)
if (typeof w.globalThis === 'undefined') w.globalThis = window

if (!w.structuredClone) {
  // 面板数据均为可 JSON 化的普通对象/数组,足够
  w.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
}

if (!Array.prototype.at) {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Array.prototype, 'at', {
    configurable: true,
    writable: true,
    value(this: unknown[], index: number) {
      const len = this.length
      const i = index >= 0 ? index : len + index
      return i >= 0 && i < len ? this[i] : undefined
    },
  })
}

if (!String.prototype.replaceAll) {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(String.prototype, 'replaceAll', {
    configurable: true,
    writable: true,
    value(this: string, search: string | RegExp, replacement: string) {
      if (search instanceof RegExp) {
        if (!search.global) throw new TypeError('replaceAll must be called with a global RegExp')
        return this.replace(search, replacement)
      }
      return this.split(search).join(replacement)
    },
  })
}

if (!Object.hasOwn) {
  Object.hasOwn = (obj: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(obj, key)
}

if (!Promise.allSettled) {
  Promise.allSettled = (<T,>(promises: Iterable<Promise<T>>) =>
    Promise.all(
      Array.from(promises, p =>
        p.then(
          value => ({ status: 'fulfilled' as const, value }),
          reason => ({ status: 'rejected' as const, reason }),
        ),
      ),
    )) as typeof Promise.allSettled
}

if (!Promise.any) {
  Promise.any = (<T,>(promises: Iterable<Promise<T> | unknown>) =>
    new Promise<T>((resolve, reject) => {
      const items = Array.from(promises)
      let pending = items.length
      if (!pending) return reject(new Error('All promises were rejected'))
      for (const item of items) {
        Promise.resolve(item).then(resolve, () => {
          if (--pending === 0) reject(new Error('All promises were rejected'))
        })
      }
    })) as typeof Promise.any
}

if (!(window as unknown as Record<string, unknown>).queueMicrotask) {
  (window as unknown as Record<string, unknown>).queueMicrotask = (callback: () => void) => {
    void Promise.resolve().then(callback)
  }
}

if (!Array.prototype.flat) {
  const flat = (list: unknown[], depth: number): unknown[] => {
    const out: unknown[] = []
    for (const item of list) {
      if (depth > 0 && Array.isArray(item)) out.push(...flat(item, depth - 1))
      else out.push(item)
    }
    return out
  }
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Array.prototype, 'flat', {
    configurable: true,
    writable: true,
    value(this: unknown[], depth = 1) { return flat(this, depth) },
  })
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Array.prototype, 'flatMap', {
    configurable: true,
    writable: true,
    value(this: unknown[], callback: (item: unknown, index: number, arr: unknown[]) => unknown, thisArg?: unknown) {
      return flat(Array.prototype.map.call(this, function (this: unknown, item: unknown, index: number, arr: unknown[]) {
        return callback.call(thisArg ?? this, item, index, arr)
      } as never), 1)
    },
  })
}

if (!Array.prototype.findLast) {
  const defineFinder = (name: 'findLast' | 'findLastIndex', pick: (item: unknown, index: number) => unknown) => {
    // eslint-disable-next-line no-extend-native
    Object.defineProperty(Array.prototype, name, {
      configurable: true,
      writable: true,
      value(this: unknown[], predicate: (item: unknown, index: number, arr: unknown[]) => boolean, thisArg?: unknown) {
        for (let i = this.length - 1; i >= 0; i--) {
          if (predicate.call(thisArg, this[i], i, this)) return pick(this[i], i)
        }
        return undefined
      },
    })
  }
  defineFinder('findLast', item => item)
  defineFinder('findLastIndex', (_, index) => index)
}

if (!Object.fromEntries) {
  Object.fromEntries = (entries: Iterable<readonly [PropertyKey, unknown]>) => {
    const out: Record<PropertyKey, unknown> = {}
    for (const [key, value] of entries) out[key] = value
    return out
  }
}

if (!String.prototype.trimStart) {
  const trimmer = (start: boolean, end: boolean) =>
    function (this: string) {
      let s = this
      if (start) s = s.replace(/^[\s\uFEFF\xA0]+/, '')
      if (end) s = s.replace(/[\s\uFEFF\xA0]+$/, '')
      return s
    }
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(String.prototype, 'trimStart', { configurable: true, writable: true, value: trimmer(true, false) })
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(String.prototype, 'trimEnd', { configurable: true, writable: true, value: trimmer(false, true) })
}

if (!String.prototype.matchAll) {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(String.prototype, 'matchAll', {
    configurable: true,
    writable: true,
    value(this: string, regexp: RegExp | string) {
      let re = regexp as RegExp
      if (re instanceof RegExp) {
        if (!re.global) throw new TypeError('matchAll must be called with a global RegExp')
        re = new RegExp(re.source, re.flags)
      } else {
        const escaped = String(re).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        re = new RegExp(escaped, 'g')
      }
      const self = this
      const iterator: IterableIterator<RegExpExecArray> = {
        [Symbol.iterator]() { return iterator },
        next() {
          if (re.lastIndex > self.length) return { done: true, value: undefined }
          const match = re.exec(self)
          if (!match) {
            re.lastIndex = self.length + 1
            return { done: true, value: undefined }
          }
          if (match[0].length === 0) re.lastIndex++
          return { done: false, value: match }
        },
      }
      return iterator
    },
  })
}

if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  ;(crypto as Crypto).randomUUID = () => {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
}

if (!Element.prototype.replaceChildren) {
  Element.prototype.replaceChildren = function (this: Element, ...nodes: (Node | string)[]) {
    while (this.firstChild) this.removeChild(this.firstChild)
    for (const node of nodes) this.appendChild(typeof node === 'string' ? document.createTextNode(node) : node)
  }
}
