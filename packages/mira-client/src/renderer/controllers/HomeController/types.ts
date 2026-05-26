export interface BreadcrumbItem {
  id: string
  label: string
  icon?: string
  active?: boolean
}

export interface QuickFilter {
  id: string
  label: string
  icon: string
  active?: boolean
}

export interface PaginationPage {
  number: number
  active: boolean
}

export interface FilterConditions {
  folders: (string | number)[]
  tags: (string | number)[]
  urls: string
  title: string
  sizeMin?: number
  sizeMax?: number
  sizePreset?: string
}