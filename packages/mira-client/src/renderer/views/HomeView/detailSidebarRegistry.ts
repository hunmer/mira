import type { Component } from 'vue'
import type { FileInfo } from '../../../shared/types'

export interface DetailSidebarTabContext {
  item?: FileInfo
  items: FileInfo[]
  libraryId: string
}

export interface DetailSidebarTab {
  id: string
  label: string
  icon?: string
  component: Component
  props?: Record<string, unknown>
  onFilesChange?: (context: DetailSidebarTabContext) => void | Promise<void>
}

const tabs: DetailSidebarTab[] = []

export function registerDetailSidebarTab(tab: DetailSidebarTab): () => void {
  const index = tabs.findIndex(item => item.id === tab.id)
  if (index >= 0) tabs.splice(index, 1, tab)
  else tabs.push(tab)
  return () => unregisterDetailSidebarTab(tab.id)
}

export function unregisterDetailSidebarTab(id: string): void {
  const index = tabs.findIndex(tab => tab.id === id)
  if (index >= 0) tabs.splice(index, 1)
}

export function getDetailSidebarTabs(): DetailSidebarTab[] {
  return [...tabs]
}
