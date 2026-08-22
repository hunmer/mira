export type HomeSplitLayout = 'single' | 'two-columns' | 'four-grid' | 'three-columns' | 'three-rows'

export const HOME_SPLIT_CAPACITY: Record<HomeSplitLayout, number> = {
  single: 1,
  'two-columns': 2,
  'four-grid': 4,
  'three-columns': 3,
  'three-rows': 3,
}

