<script setup lang="ts">
/**
 * PluginIcon —— 统一的插件图标渲染组件。
 *
 * 解析顺序：
 *   1. 显式传入的 src（绝对/URL/file:// 路径优先）。
 *   2. 插件目录 + 图标文件：优先用 props.directory/icon，否则从
 *      window.pluginSystem.getPlugin(pluginId).config 读取 actualDirectory + icon。
 *   3. contribution.icon（material / emoji / text）：图片不可用时作为兜底渲染。
 *   4. material icon 缺失时回退到插件名首字符。
 *
 * 三种渲染形态：
 *   - 图片：<img object-contain>，加载失败自动切换兜底
 *   - material：宿主已加载 Material Icons 字体，<span class="material-icons">
 *   - 文本/emoji：直接字符
 *
 * 用法：
 *   <PluginIcon :plugin-id="id" :size="24" rounded="md" />
 *   <PluginIcon plugin-id="..." :directory="dir" icon="icon.png" :size="24" />
 *   <PluginIcon :plugin-id="id" :contribution-icon="{ type: 'material', value: 'dashboard' }" />
 */
import { ref, computed, watch } from 'vue'
import type { PluginContributionIcon } from '@/renderer/plugins/types'

interface Props {
  /** 插件 id：用于从全局 pluginSystem 反查目录与 config.icon */
  pluginId?: string
  /**
   * 显式插件目录。三种语义：
   * - 绝对路径/URL：直接作为目录前缀（本地插件 runtime.directory）
   * - 相对路径：配合 baseUrl 拼接（插件市场 entry.directory 相对市场源根）
   */
  directory?: string
  /** 市场源根地址（HTTP）。仅当 directory 为相对路径时生效，用于拼出完整 URL。 */
  baseUrl?: string
  /** 显式图标文件名（相对插件目录或绝对/URL 路径；优先于 config.icon） */
  icon?: string
  /** contribution 提供的图标：图片不可用时的兜底 */
  contributionIcon?: PluginContributionIcon
  /** 兜底使用的 material icon 名称（默认 extension） */
  fallbackMaterial?: string
  /** 兜底文本（默认取插件名/插件 id 首字符） */
  fallbackText?: string
  /** 插件名：用于 pluginSystem 中尚未注册时（如市场卡片）的兜底首字符 */
  name?: string
  /** 像素尺寸（宽高相同） */
  size?: number
  /** 圆角风格 */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  size: 18,
  rounded: 'md',
  fallbackMaterial: 'extension',
})

const roundedClass = computed(
  () =>
    ({
      none: '',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    })[props.rounded]
)

/** 是否为绝对路径或网络 URL */
const isAbsoluteOrUrl = (p?: string): boolean =>
  !!p && /^(https?:|file:|data:|[a-zA-Z]:[\\/]|\/)/.test(p)

/** 是否像图片 (http/file/data/盘符 URL, 或带图片扩展名); emoji / material 名返回 false */
const isImageLike = (p?: string): boolean =>
  !!p && (/^(https?:|file:|data:|[a-zA-Z]:[\\/])/.test(p) || /\.(png|jpe?g|svg|ico|gif|webp|bmp)$/i.test(p))

/** 把任意本地路径规范化为可用 img src（参考 plugins/utils.ts convertToScriptUrl） */
const toUrl = (p: string): string => {
  if (/^(https?:|file:|data:)/.test(p)) return p
  const n = p.replace(/\\/g, '/')
  if (/^[a-zA-Z]:/.test(n)) return `file:///${n}`
  if (n.startsWith('/')) return `file://${n}`
  return n
}

/**
 * 把「目录 + 图标文件」解析为可用 src。
 * - 绝对目录：直接前缀拼接（本地插件）
 * - 相对目录：用 baseUrl 拼接（插件市场：baseUrl 是 HTTP 源根，directory 是相对其的子目录）
 * 返回 null 表示无法解析（缺少目录或 baseUrl）。
 */
const resolveDirAndIcon = (dir: string, iconFile: string): string | null => {
  if (isAbsoluteOrUrl(iconFile)) return toUrl(iconFile)
  const cleanDir = dir.replace(/\\/g, '/').replace(/\/+$/, '')
  const cleanIcon = iconFile.replace(/^\/+/, '')
  if (isAbsoluteOrUrl(dir)) {
    return toUrl(`${cleanDir}/${cleanIcon}`)
  }
  // 相对目录：必须有 baseUrl（通常为 HTTP 市场源根）
  if (props.baseUrl) {
    const cleanBase = props.baseUrl.replace(/\\/g, '/').replace(/\/+$/, '')
    return `${cleanBase}/${cleanDir}/${cleanIcon}`
  }
  return null
}

const imageFailed = ref(false)

const resolvedImageSrc = computed<string | null>(() => {
  // 1. 显式 src（icon 直接是图片 URL/路径）
  if (props.icon && isImageLike(props.icon)) return toUrl(props.icon)

  // 2. contribution 提供 image 类型图标：value 即图片路径（绝对/URL 优先，否则按目录解析）
  if (props.contributionIcon?.type === 'image' && props.contributionIcon.value) {
    const v = props.contributionIcon.value
    if (isImageLike(v)) return toUrl(v)
    const dir = props.directory || lookupDirectory()
    if (dir) return resolveDirAndIcon(dir, v)
  }

  // 3. 目录 + 图标文件（仅当 icon 像图片文件; emoji / material 名不走此处）
  const dir = props.directory || lookupDirectory()
  const iconFile = props.icon || lookupConfigIcon()
  if (dir && iconFile && isImageLike(iconFile)) {
    return resolveDirAndIcon(dir, iconFile)
  }
  return null
})

/** 从全局 pluginSystem 反查插件目录 */
function lookupDirectory(): string | undefined {
  if (!props.pluginId) return undefined
  try {
    const ps = (window as any).pluginSystem
    const info = ps?.getPlugin?.(props.pluginId)
    const dir = info?.config?.actualDirectory || info?.context?.directory
    if (dir) return dir
    // 部分场景下 runtime.directory 存放在实例上
    const runtime = ps?.getAllPlugins?.().find((p: any) => p?.config?.pluginId === props.pluginId)
    return runtime?.directory
  } catch {
    return undefined
  }
}

/** 从全局 pluginSystem 反查 config.icon */
function lookupConfigIcon(): string | undefined {
  if (!props.pluginId) return undefined
  try {
    const ps = (window as any).pluginSystem
    return ps?.getPlugin?.(props.pluginId)?.config?.icon
  } catch {
    return undefined
  }
}

/** 兜底 material/emoji/text 内容 */
const fallbackValue = computed(() => {
  // 显式 icon 为 emoji / material (非图片) 时优先用它
  if (props.icon && !isImageLike(props.icon)) return props.icon
  if (props.contributionIcon?.value) return props.contributionIcon.value
  if (props.fallbackText) return props.fallbackText
  // 优先用显式传入的 name（市场卡片场景 pluginSystem 尚无此插件）
  if (props.name) return props.name.trim().charAt(0) || ''
  return lookupPluginNameFirstChar() || ''
})

const fallbackType = computed<'material' | 'emoji' | 'text'>(() => {
  // 显式 icon 为 emoji / material 时按内容判定类型 (纯 ASCII 字母/数字/下划线视为 material)
  if (props.icon && !isImageLike(props.icon)) {
    return /^[a-z0-9_]+$/.test(props.icon) ? 'material' : 'emoji'
  }
  if (props.contributionIcon?.type && props.contributionIcon.type !== 'image') {
    return props.contributionIcon.type
  }
  return 'material'
})

function lookupPluginNameFirstChar(): string {
  if (!props.pluginId) return ''
  try {
    const cfg = (window as any).pluginSystem?.getPlugin?.(props.pluginId)?.config
    return (cfg?.pluginName || '').trim().charAt(0) || ''
  } catch {
    return ''
  }
}

const showImage = computed(() => !!resolvedImageSrc.value && !imageFailed.value)

// src 变化时重置失败标记，重新尝试加载图片
watch(resolvedImageSrc, () => {
  imageFailed.value = false
})
</script>

<template>
  <span
    class="plugin-icon inline-flex items-center justify-center overflow-hidden flex-shrink-0"
    :class="roundedClass"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      v-if="showImage"
      :src="resolvedImageSrc!"
      :width="size"
      :height="size"
      class="tilt-pop block max-w-full max-h-full object-contain"
      loading="lazy"
      @error="imageFailed = true"
    />
    <template v-else>
      <span
        v-if="fallbackType === 'material'"
        class="material-icons leading-none"
        :style="{ fontSize: `${Math.round(size * 0.85)}px` }"
      >{{ fallbackValue || fallbackMaterial }}</span>
      <span
        v-else
        class="leading-none font-medium"
        :style="{ fontSize: `${Math.round(size * 0.7)}px` }"
      >{{ fallbackValue }}</span>
    </template>
  </span>
</template>
