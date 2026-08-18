/**
 * FileSystem 纯逻辑与类型定义（由 React 版 file-system.tsx 移植）
 *
 * 包含路径工具、MIME/类型标签映射、排序/过滤比较器、索引构建与格式化函数，
 * 全部为无框架依赖的纯函数，供各视图 SFC 与根组件共用。
 */

export type FileSystemView = "icons" | "list" | "columns" | "gallery"

export type FileSystemFolderItem = {
  kind: "folder"
  /** 文件夹前缀，如 `"invoices/2026/"`。缺少末尾斜杠时会自动补上。 */
  path: string
  name?: string
  parentPath?: string
  /** 子项存在但尚未进入 `items` 时置位，触发 `loadChildren`。 */
  hasChildren?: boolean
  createdAt?: string
  updatedAt?: string
}

export type FileSystemFileItem = {
  kind: "file"
  /** 展示/规范路径，如 `"invoices/2026/jan.pdf"`。 */
  path: string
  /** 原始对象键（S3/R2），缺省为 `path`。 */
  key?: string
  name?: string
  parentPath?: string
  contentType?: string
  size?: number
  createdAt?: string
  updatedAt?: string
  etag?: string
  /** 已公开/预签名时直接给出；否则通过 `getFileUrl` 解析。 */
  url?: string
  /** 外部生成的缩略图，组件自身不渲染文档。 */
  previewImageUrl?: string | null
  /** 外部生成的分页缩略图（首项为封面）；多页时大缩略图带悬停翻页器。 */
  previewImageUrls?: string[] | null
  /** 总页数超出 `previewImageUrls.length` 时，翻页器按需加载剩余页。 */
  previewPageCount?: number
  /** 缩略图宽高比，缺省为竖版页面。 */
  previewAspectRatio?: number
  metadata?: Record<string, string>
}

export type FileSystemItem = FileSystemFolderItem | FileSystemFileItem

export type FileSystemLoadChildrenArgs = {
  path: string
  cursor: string | null
}

export type FileSystemLoadChildrenResult = {
  items: FileSystemItem[]
  nextCursor?: string | null
}

export type FolderEntry = FileSystemFolderItem & {
  name: string
  parentPath: string
}

export type FileEntry = FileSystemFileItem & {
  key: string
  name: string
  parentPath: string
}

export type FileSystemEntry = FolderEntry | FileEntry

export type FileSystemIndex = {
  children: Map<string, FileSystemEntry[]>
  files: Map<string, FileEntry>
  folders: Map<string, FolderEntry>
}

export type FileSystemViewerKind = "docx" | "image" | "pdf" | "xlsx"

export type FileSystemSortKey =
  | "createdAt"
  | "kind"
  | "name"
  | "size"
  | "updatedAt"

export type FileSystemSortState = {
  direction: "asc" | "desc"
  key: FileSystemSortKey
}

export type FileSystemFilterType = "dateCreated" | "dateModified" | "fileType"

export type FileSystemDateFilterType = Exclude<FileSystemFilterType, "fileType">

export type FileSystemFilterOperator =
  | "after"
  | "before"
  | "in-range"
  | "is"
  | "is-any-of"
  | "is-not"
  | "not-in-range"

export type FileSystemFilter = {
  id: string
  operator: FileSystemFilterOperator
  type: FileSystemFilterType
  value: string[]
}

export type FileTypeFilterGroup =
  | "Documents"
  | "Spreadsheets"
  | "Images"
  | "Code"
  | "Text"
  | "Archives & binary"

export type FileTypeFilterOption = {
  group: FileTypeFilterGroup
  /** 供选项图标复用文件类型图标的示例文件名。 */
  iconFileName: string
  label: string
  mime: string
}

export function normalizeFolderPath(path: string) {
  if (!path || path === "/") return ""
  return path.endsWith("/") ? path : `${path}/`
}

export function pathName(path: string) {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path
  const separatorIndex = trimmed.lastIndexOf("/")
  return separatorIndex === -1 ? trimmed : trimmed.slice(separatorIndex + 1)
}

export function pathParent(path: string) {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path
  const separatorIndex = trimmed.lastIndexOf("/")
  return separatorIndex === -1 ? "" : trimmed.slice(0, separatorIndex + 1)
}

export function fileExtension(name: string) {
  const dotIndex = name.lastIndexOf(".")
  return dotIndex === -1 ? "" : name.slice(dotIndex + 1).toLowerCase()
}

const FILE_KIND_LABELS: Record<string, string> = {
  css: "CSS Stylesheet",
  csv: "CSV Document",
  doc: "Word Document",
  docx: "Word Document",
  gif: "GIF Image",
  go: "Go Source",
  jpeg: "JPEG Image",
  jpg: "JPEG Image",
  js: "JavaScript Source",
  json: "JSON Document",
  jsx: "JavaScript Source",
  md: "Markdown Document",
  mdx: "MDX Document",
  pdf: "PDF Document",
  png: "PNG Image",
  ppt: "PowerPoint Presentation",
  pptx: "PowerPoint Presentation",
  py: "Python Script",
  rs: "Rust Source",
  sh: "Shell Script",
  sql: "SQL Script",
  svg: "SVG Image",
  ts: "TypeScript Source",
  tsv: "TSV Document",
  tsx: "TypeScript Source",
  txt: "Plain Text",
  webp: "WebP Image",
  xls: "Excel Workbook",
  xlsx: "Excel Workbook",
  yaml: "YAML Document",
  yml: "YAML Document",
  zip: "ZIP Archive",
}

export function fileKindLabel(file: FileEntry) {
  const byExtension = FILE_KIND_LABELS[fileExtension(file.name)]

  if (byExtension) return byExtension
  if (file.contentType?.startsWith("image/")) return "Image"

  return file.contentType ?? "Document"
}

// 文件夹在 Kind 排序下按字母序混入各类文件之间，与 Finder 的 Kind 排序一致。
export function entryKindLabel(entry: FileSystemEntry) {
  return entry.kind === "folder" ? "Folder" : fileKindLabel(entry)
}

// 文件未携带 `contentType` 时按扩展名推断 MIME，文件类型过滤因此能覆盖全部清单条目。
const EXTENSION_MIME_TYPES: Record<string, string> = {
  css: "text/css",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  gif: "image/gif",
  go: "text/x-go",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  jsx: "text/jsx",
  md: "text/markdown",
  mdx: "text/mdx",
  pdf: "application/pdf",
  png: "image/png",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  py: "text/x-python",
  rs: "text/x-rust",
  sh: "application/x-sh",
  sql: "application/sql",
  svg: "image/svg+xml",
  ts: "text/x-typescript",
  tsv: "text/tab-separated-values",
  tsx: "text/x-typescript",
  txt: "text/plain",
  webp: "image/webp",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  yaml: "text/yaml",
  yml: "text/yaml",
  zip: "application/zip",
}

const FALLBACK_MIME_TYPE = "application/octet-stream"

export const MIME_TYPE_LABELS: Record<string, string> = {
  [FALLBACK_MIME_TYPE]: "Binary",
  "application/json": "JSON",
  "application/msword": "Word document (legacy)",
  "application/pdf": "PDF",
  "application/sql": "SQL",
  "application/vnd.ms-excel": "Excel workbook (legacy)",
  "application/vnd.ms-powerpoint": "PowerPoint (legacy)",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel workbook",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word document",
  "application/x-sh": "Shell script",
  "application/zip": "ZIP archive",
  "image/gif": "GIF image",
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "image/svg+xml": "SVG image",
  "image/webp": "WebP image",
  "text/css": "CSS",
  "text/csv": "CSV",
  "text/javascript": "JavaScript",
  "text/jsx": "JSX",
  "text/markdown": "Markdown",
  "text/mdx": "MDX",
  "text/plain": "Plain text",
  "text/tab-separated-values": "TSV",
  "text/x-go": "Go",
  "text/x-python": "Python",
  "text/x-rust": "Rust",
  "text/x-typescript": "TypeScript",
  "text/yaml": "YAML",
}

export function mimeTypeForFile(file: FileEntry) {
  return (
    file.contentType ??
    EXTENSION_MIME_TYPES[fileExtension(file.name)] ??
    FALLBACK_MIME_TYPE
  )
}

export function fileTypeFilterGroup(mime: string): FileTypeFilterGroup {
  if (
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime === "application/vnd.ms-powerpoint" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "Documents"
  }

  if (
    mime === "application/vnd.ms-excel" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "text/csv" ||
    mime === "text/tab-separated-values"
  ) {
    return "Spreadsheets"
  }

  if (mime.startsWith("image/")) return "Images"

  if (
    mime === "application/json" ||
    mime === "application/sql" ||
    mime === "application/x-sh" ||
    mime === "text/css" ||
    mime === "text/javascript" ||
    mime === "text/jsx" ||
    mime === "text/x-go" ||
    mime === "text/x-python" ||
    mime === "text/x-rust" ||
    mime === "text/x-typescript" ||
    mime === "text/yaml"
  ) {
    return "Code"
  }

  if (
    mime === "text/markdown" ||
    mime === "text/mdx" ||
    mime === "text/plain"
  ) {
    return "Text"
  }

  return "Archives & binary"
}

export function viewerKindForFile(
  file: FileSystemFileItem
): FileSystemViewerKind | null {
  if (file.contentType?.startsWith("image/")) return "image"
  if (file.contentType === "application/pdf") return "pdf"

  const name = (file.name ?? file.path).toLowerCase()

  if (name.endsWith(".pdf")) return "pdf"
  if (name.endsWith(".docx")) return "docx"
  if (name.endsWith(".xlsx")) return "xlsx"
  if (/\.(avif|gif|jpe?g|png|svg|webp)$/.test(name)) return "image"

  return null
}

// PDF/DOCX 要高度，表格要宽度，图片给一个宽松但有界的框。
export const VIEWER_DIALOG_CLASSNAMES: Record<FileSystemViewerKind, string> = {
  docx: "h-[88vh] w-[min(96vw,68rem)] max-w-none",
  image: "max-h-[88vh] w-fit max-w-[min(96vw,64rem)]",
  pdf: "h-[88vh] w-[min(96vw,68rem)] max-w-none",
  xlsx: "h-[85vh] w-[min(96vw,100rem)] max-w-none",
}

export function formatByteSize(size: number | undefined) {
  if (size === undefined) return null
  if (size < 1000) return `${size} bytes`

  const units = ["KB", "MB", "GB", "TB"]
  let value = size

  for (const unit of units) {
    value /= 1000
    if (value < 1000 || unit === "TB") {
      return `${value >= 100 ? Math.round(value) : value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "")} ${unit}`
    }
  }

  return null
}

export function formatTimestamp(value: string | undefined) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  const day = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return `${day} at ${time}`
}

// 给定相对文件路径里出现过的所有目录前缀。
export function directoryPathsOf(paths: readonly string[]) {
  const directoryPaths = new Set<string>()

  for (const relativePath of paths) {
    let slashIndex = relativePath.indexOf("/")

    while (slashIndex !== -1) {
      directoryPaths.add(relativePath.slice(0, slashIndex))
      slashIndex = relativePath.indexOf("/", slashIndex + 1)
    }
  }
  return directoryPaths
}

export function compareEntryNames(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

export const SORT_OPTIONS: Array<{
  defaultDirection: "asc" | "desc"
  key: FileSystemSortKey
  label: string
  /** 更短的标签让工具栏触发器保持窄宽度。 */
  triggerLabel: string
}> = [
  { defaultDirection: "asc", key: "name", label: "Name", triggerLabel: "Name" },
  { defaultDirection: "asc", key: "kind", label: "Kind", triggerLabel: "Kind" },
  {
    defaultDirection: "desc",
    key: "createdAt",
    label: "Date created",
    triggerLabel: "Created",
  },
  {
    defaultDirection: "desc",
    key: "updatedAt",
    label: "Date modified",
    triggerLabel: "Modified",
  },
  {
    defaultDirection: "desc",
    key: "size",
    label: "Size",
    triggerLabel: "Size",
  },
]

export const DEFAULT_SORT: FileSystemSortState = { direction: "asc", key: "name" }

export function defaultSortDirection(key: FileSystemSortKey) {
  return (
    SORT_OPTIONS.find((option) => option.key === key)?.defaultDirection ?? "asc"
  )
}

function entrySortTimestamp(
  entry: FileSystemEntry,
  key: "createdAt" | "updatedAt"
) {
  const value = entry[key]
  const time = value ? Date.parse(value) : Number.NaN

  return Number.isNaN(time) ? 0 : time
}

// 按当前排序的主键比较；平局（与缺失元数据）回退到名称序保持结果稳定。
// 名称平局不受方向影响，与 Finder 一致。
export function compareEntriesBySort(
  left: FileSystemEntry,
  right: FileSystemEntry,
  sort: FileSystemSortState
) {
  let result = 0

  if (sort.key === "name") {
    result = compareEntryNames(left, right)
  } else if (sort.key === "kind") {
    result = entryKindLabel(left).localeCompare(
      entryKindLabel(right),
      undefined,
      {
        sensitivity: "base",
      }
    )
  } else if (sort.key === "size") {
    // 文件夹没有字节大小，归到最小一端。
    const leftSize = left.kind === "file" ? (left.size ?? 0) : -1
    const rightSize = right.kind === "file" ? (right.size ?? 0) : -1

    result = leftSize - rightSize
  } else {
    result =
      entrySortTimestamp(left, sort.key) - entrySortTimestamp(right, sort.key)
  }

  if (result === 0) return compareEntryNames(left, right)
  return sort.direction === "asc" ? (result < 0 ? -1 : 1) : result < 0 ? 1 : -1
}

export const FILE_TYPE_FILTER_GROUPS: FileTypeFilterGroup[] = [
  "Documents",
  "Spreadsheets",
  "Images",
  "Code",
  "Text",
  "Archives & binary",
]

export const FILTER_TYPE_LABELS: Record<FileSystemFilterType, string> = {
  dateCreated: "Date created",
  dateModified: "Date modified",
  fileType: "File type",
}

export const FILTER_OPERATOR_LABELS: Record<FileSystemFilterOperator, string> = {
  after: "after",
  before: "before",
  "in-range": "in range",
  is: "is",
  "is-any-of": "is any of",
  "is-not": "is not",
  "not-in-range": "not in range",
}

// 日期过滤的相对截止点，与 Extend 的表格过滤一致。
export const DATE_FILTER_PRESETS = [
  "1 day ago",
  "3 days ago",
  "1 week ago",
  "1 month ago",
  "3 months ago",
  "6 months ago",
  "1 year ago",
]

function dateFilterPresetCutoff(preset: string) {
  const date = new Date()

  switch (preset) {
    case "1 day ago":
      date.setDate(date.getDate() - 1)
      break
    case "3 days ago":
      date.setDate(date.getDate() - 3)
      break
    case "1 week ago":
      date.setDate(date.getDate() - 7)
      break
    case "1 month ago":
      date.setMonth(date.getMonth() - 1)
      break
    case "3 months ago":
      date.setMonth(date.getMonth() - 3)
      break
    case "6 months ago":
      date.setMonth(date.getMonth() - 6)
      break
    case "1 year ago":
      date.setFullYear(date.getFullYear() - 1)
      break
    default: {
      const parsed = Date.parse(preset)

      if (!Number.isNaN(parsed)) return new Date(parsed)
    }
  }
  return date
}

// 自定义区间存两个 ISO 时间戳而非相对预设。
export function isCustomDateRangeValue(value: string[]) {
  return (
    value.length === 2 &&
    value.every(
      (entry) =>
        !DATE_FILTER_PRESETS.includes(entry) && !Number.isNaN(Date.parse(entry))
    )
  )
}

export function filterOperatorChoices(
  filter: FileSystemFilter
): FileSystemFilterOperator[] {
  if (filter.type === "fileType") {
    return filter.value.length > 1 ? ["is-any-of", "is-not"] : ["is", "is-not"]
  }
  if (isCustomDateRangeValue(filter.value)) return ["in-range", "not-in-range"]
  return ["before", "after"]
}

export function fileMatchesFilter(file: FileEntry, filter: FileSystemFilter) {
  if (filter.value.length === 0) return true
  if (filter.type === "fileType") {
    const matches = filter.value.includes(mimeTypeForFile(file))

    return filter.operator === "is-not" ? !matches : matches
  }

  const timestamp =
    filter.type === "dateCreated" ? file.createdAt : file.updatedAt
  const time = timestamp ? Date.parse(timestamp) : Number.NaN

  if (Number.isNaN(time)) return false
  if (filter.operator === "in-range" || filter.operator === "not-in-range") {
    const from = Date.parse(filter.value[0])
    const to = Date.parse(filter.value[1] ?? filter.value[0])
    const isInRange = time >= from && time <= to

    return filter.operator === "not-in-range" ? !isInRange : isInRange
  }

  const cutoff = dateFilterPresetCutoff(filter.value[0]).getTime()

  return filter.operator === "before" ? time <= cutoff : time >= cutoff
}

export function buildFileSystemIndex(items: FileSystemItem[]): FileSystemIndex {
  const folders = new Map<string, FolderEntry>()
  const files = new Map<string, FileEntry>()

  const ensureFolderChain = (folderPath: string) => {
    let path = normalizeFolderPath(folderPath)

    while (path && !folders.has(path)) {
      folders.set(path, {
        kind: "folder",
        name: pathName(path),
        parentPath: pathParent(path),
        path,
      })
      path = pathParent(path)
    }
  }

  for (const item of items) {
    if (item.kind === "folder") {
      const path = normalizeFolderPath(item.path)

      if (!path) continue

      folders.set(path, {
        ...item,
        name: item.name ?? pathName(path),
        parentPath: normalizeFolderPath(item.parentPath ?? pathParent(path)),
        path,
      })
      ensureFolderChain(pathParent(path))
    } else {
      if (!item.path) continue

      files.set(item.path, {
        ...item,
        key: item.key ?? item.path,
        name: item.name ?? pathName(item.path),
        parentPath: normalizeFolderPath(
          item.parentPath ?? pathParent(item.path)
        ),
      })
      ensureFolderChain(pathParent(item.path))
    }
  }

  const children = new Map<string, FileSystemEntry[]>()
  const pushChild = (entry: FileSystemEntry) => {
    const siblings = children.get(entry.parentPath)

    if (siblings) {
      siblings.push(entry)
    } else {
      children.set(entry.parentPath, [entry])
    }
  }

  for (const folder of folders.values()) pushChild(folder)
  for (const file of files.values()) pushChild(file)
  for (const siblings of children.values()) {
    siblings.sort(compareEntryNames)
  }

  // 没有显式修改时间的文件夹继承最新子项的时间——对象存储没有文件夹元数据，
  // 但列表视图要显示该列且日期排序会用到。按深度优先（后代路径总比祖先长）
  // 传播，日期沿链上浮。
  const foldersDeepestFirst = [...folders.values()].sort(
    (left, right) => right.path.length - left.path.length
  )

  for (const folder of foldersDeepestFirst) {
    if (folder.updatedAt) continue

    let newestTime = Number.NEGATIVE_INFINITY
    let newestValue: string | undefined

    for (const child of children.get(folder.path) ?? []) {
      const value = child.updatedAt ?? child.createdAt
      const time = value ? Date.parse(value) : Number.NaN

      if (!Number.isNaN(time) && time > newestTime) {
        newestTime = time
        newestValue = value
      }
    }
    if (newestValue) folder.updatedAt = newestValue
  }

  return { children, files, folders }
}

export function folderHasChildren(index: FileSystemIndex, folder: FolderEntry) {
  return (
    (index.children.get(folder.path)?.length ?? 0) > 0 ||
    folder.hasChildren === true
  )
}

export function filePreviewUrls(file: FileSystemFileItem) {
  if (file.previewImageUrls?.length) return file.previewImageUrls
  return file.previewImageUrl ? [file.previewImageUrl] : []
}

// 与 @pierre/trees 的查询归一化保持一致，让工具栏搜索以与列表树相同的
// 语义过滤图标/分栏/画廊视图：去空白、反斜杠转正斜杠、小写、路径子串匹配。
export function normalizeSearchQuery(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return ""
  return trimmed.replace(/[\\]/g, "/").toLowerCase()
}

// 把索引 `index` 处的条目滚进视口——虚拟化视图里窗口外没有 DOM 节点可
// scrollIntoView，需要按几何计算直接设置 scrollTop/scrollLeft。
export function scrollIndexIntoView({
  horizontal = false,
  index,
  itemSize,
  itemStride,
  leadingPx = 0,
  viewport,
}: {
  horizontal?: boolean
  index: number
  itemSize: number
  itemStride: number
  leadingPx?: number
  viewport: HTMLElement | null
}) {
  if (!viewport || index < 0) return

  const start = leadingPx + index * itemStride
  const end = start + itemSize
  const scrollStart = horizontal ? viewport.scrollLeft : viewport.scrollTop
  const viewportSize = horizontal ? viewport.clientWidth : viewport.clientHeight

  let nextScrollStart: number | null = null

  if (start < scrollStart) {
    nextScrollStart = start
  } else if (end > scrollStart + viewportSize) {
    nextScrollStart = end - viewportSize
  }
  if (nextScrollStart === null) return
  if (horizontal) {
    viewport.scrollLeft = nextScrollStart
  } else {
    viewport.scrollTop = nextScrollStart
  }
}

export function formatDateInputValue(date: Date | undefined) {
  if (!date) return ""

  const pad = (value: number) => String(value).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateInputValue(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return undefined

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed)

  if (isoMatch) {
    const date = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    )

    return Number.isNaN(date.getTime()) ? undefined : date
  }

  const parsed = Date.parse(trimmed)

  return Number.isNaN(parsed) ? undefined : new Date(parsed)
}

export const DATE_RANGE_DIALOG_PRESETS = [
  "Last 7 days",
  "This month",
  "Last 1 month",
  "Last 3 months",
  "This year",
  "Last 12 months",
]

export function dateRangePresetRange(preset: string) {
  const from = new Date()
  const to = new Date()

  from.setHours(0, 0, 0, 0)
  to.setHours(23, 59, 59, 999)

  switch (preset) {
    case "Last 7 days":
      from.setDate(from.getDate() - 6)
      break
    case "This month":
      from.setDate(1)
      break
    case "Last 1 month":
      from.setMonth(from.getMonth() - 1)
      break
    case "Last 3 months":
      from.setMonth(from.getMonth() - 3)
      break
    case "This year":
      from.setMonth(0, 1)
      break
    case "Last 12 months":
      from.setFullYear(from.getFullYear() - 1)
      break
  }
  return { from, to }
}

export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export function calendarDayKey(date: Date) {
  return date.getFullYear() * 10_000 + date.getMonth() * 100 + date.getDate()
}

export const ARROW_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
])

// 类型快进重置前的空闲时长，与 Finder 一致。
export const TYPE_AHEAD_RESET_MS = 700

// 仅字母与数字——与原树使用的按键判定相同，快捷键与空白滚动不受影响。
export function isTypeAheadKey(event: KeyboardEvent) {
  return (
    event.key.length === 1 &&
    /^[\p{L}\p{N}]$/u.test(event.key) &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  )
}

// 依据行几何选择箭头键落点（上下方向），使键盘导航跟随实际渲染的自动填充网格。
export function moveGridSelection({
  entries,
  itemRefs,
  key,
  onSelect,
  selectedPath,
}: {
  entries: FileSystemEntry[]
  itemRefs: Map<string, HTMLButtonElement>
  key: string
  onSelect: (entry: FileSystemEntry) => void
  selectedPath: string | null
}) {
  if (entries.length === 0) return false

  const currentIndex = entries.findIndex((entry) => entry.path === selectedPath)
  let nextEntry: FileSystemEntry | undefined

  if (currentIndex === -1) {
    nextEntry = entries[0]
  } else if (key === "ArrowLeft" || key === "ArrowRight") {
    nextEntry = entries[currentIndex + (key === "ArrowLeft" ? -1 : 1)]
  } else {
    const currentElement = itemRefs.get(entries[currentIndex].path)

    if (!currentElement) return false

    const currentRect = currentElement.getBoundingClientRect()
    let bestScore = Infinity

    for (const entry of entries) {
      if (entry.path === selectedPath) continue

      const rect = itemRefs.get(entry.path)?.getBoundingClientRect()

      if (!rect) continue

      const rowDelta =
        key === "ArrowDown"
          ? rect.top - currentRect.top
          : currentRect.top - rect.top

      if (rowDelta <= 1) continue

      const score = rowDelta * 1000 + Math.abs(rect.left - currentRect.left)

      if (score < bestScore) {
        bestScore = score
        nextEntry = entry
      }
    }
  }

  if (!nextEntry) return false

  onSelect(nextEntry)
  itemRefs.get(nextEntry.path)?.focus()
  return true
}
