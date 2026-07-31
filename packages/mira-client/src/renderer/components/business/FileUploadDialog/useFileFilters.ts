import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { isImageFile, isVideoFile, isAudioFile, isDocumentFile } from './useFileManagement'
import type { PendingFile } from './types'

/** 文件大小单位 */
export type SizeUnit = 'kb' | 'mb' | 'gb'

/** 单位对应的字节数 */
const UNIT_BYTES: Record<SizeUnit, number> = {
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
}

/** 格式过滤选项 */
export type FormatFilter = 'all' | 'image' | 'video' | 'audio' | 'document' | 'other'
/** 文件大小过滤选项（custom 时使用 sizeRangeMB 自定义区间） */
export type SizeFilter = 'all' | 'lt1m' | '1to10m' | 'gt10m' | 'custom'

/**
 * 文件过滤 composable：
 * 提供【格式】【文件大小】【文件名】三个过滤条件（未设置则忽略），
 * 并判定单个文件是否符合条件。不符合条件的文件不可选中且显示【不符合条件】。
 */
export function useFileFilters(pendingFiles: Ref<PendingFile[]>) {
  const formatFilter = ref<FormatFilter>('all')
  const sizeFilter = ref<SizeFilter>('all')
  const nameFilter = ref('')
  // 自定义大小区间（字节，真实存储），[min, max]
  const sizeRangeBytes = ref<number[]>([1024 * 1024, 10 * 1024 * 1024])
  // 当前展示单位（kb/mb/gb）
  const sizeUnit = ref<SizeUnit>('mb')

  /**
   * 当前单位下的展示区间（数字），可读可写：
   * 读：把字节按当前单位换算成数字；
   * 写：把输入的数字按当前单位换算回字节，并保证 min <= max。
   */
  const sizeRangeDisplay = computed<number[]>({
    get() {
      const unit = UNIT_BYTES[sizeUnit.value]
      return [Math.round(sizeRangeBytes.value[0] / unit), Math.round(sizeRangeBytes.value[1] / unit)]
    },
    set(val) {
      const unit = UNIT_BYTES[sizeUnit.value]
      let min = Math.max(0, Number(val[0]) || 0) * unit
      let max = Math.max(0, Number(val[1]) || 0) * unit
      if (min > max) [min, max] = [max, min]
      sizeRangeBytes.value = [min, max]
    },
  })

  /**
   * 切换单位：保持字节真实值不变（即换算后数值会变化），并规整展示区间。
   */
  function changeSizeUnit(unit: SizeUnit) {
    sizeUnit.value = unit
  }

  /** 文件的展示大小（本地导入文件优先用 localSize） */
  function getFileSize(file: PendingFile): number {
    return file.localSize ?? file.file.size
  }

  /** 文件的 MIME 类型 */
  function getFileType(file: PendingFile): string {
    return file.file.type || ''
  }

  /** 判断单个文件是否匹配【格式】条件 */
  function matchesFormat(file: PendingFile): boolean {
    if (formatFilter.value === 'all') return true
    const type = getFileType(file)
    switch (formatFilter.value) {
      case 'image': return isImageFile(type)
      case 'video': return isVideoFile(type)
      case 'audio': return isAudioFile(type)
      case 'document': return isDocumentFile(type)
      case 'other':
        return !isImageFile(type) && !isVideoFile(type) && !isAudioFile(type) && !isDocumentFile(type)
      default: return true
    }
  }

  /** 判断单个文件是否匹配【文件大小】条件 */
  function matchesSize(file: PendingFile): boolean {
    if (sizeFilter.value === 'all') return true
    const size = getFileSize(file)
    const MB = 1024 * 1024
    switch (sizeFilter.value) {
      case 'lt1m': return size < MB
      case '1to10m': return size >= MB && size <= 10 * MB
      case 'gt10m': return size > 10 * MB
      case 'custom': {
        const [minB, maxB] = sizeRangeBytes.value
        return size >= minB && size <= maxB
      }
      default: return true
    }
  }

  /** 判断单个文件是否匹配【文件名】条件（子串匹配，忽略大小写；空则忽略） */
  function matchesName(file: PendingFile): boolean {
    const q = nameFilter.value.trim().toLowerCase()
    if (!q) return true
    return file.file.name.toLowerCase().includes(q)
  }

  /** 单个文件是否符合全部已设置条件 */
  function matchesFilters(file: PendingFile): boolean {
    return matchesFormat(file) && matchesSize(file) && matchesName(file)
  }

  /** 命中过滤条件的文件（用于网格展示——还受左栏本地树筛选影响，最终列表由组件再 combine） */
  const filterMatchedIds = computed<Set<string>>(() => {
    const set = new Set<string>()
    for (const f of pendingFiles.value) {
      if (matchesFilters(f)) set.add(f.id)
    }
    return set
  })

  /** 是否有任何过滤条件生效 */
  const hasActiveFilter = computed(
    () => formatFilter.value !== 'all' || sizeFilter.value !== 'all' || nameFilter.value.trim() !== ''
  )

  function resetFilters() {
    formatFilter.value = 'all'
    sizeFilter.value = 'all'
    nameFilter.value = ''
  }

  return {
    formatFilter,
    sizeFilter,
    sizeRangeDisplay,
    sizeUnit,
    changeSizeUnit,
    nameFilter,
    matchesFilters,
    filterMatchedIds,
    hasActiveFilter,
    resetFilters
  }
}
