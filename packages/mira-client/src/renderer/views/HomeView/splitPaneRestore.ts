export interface RestorableSplitTab {
  id: string
  type: string
  needUpdate?: boolean
}

export async function hydrateRestoredSplitTabs<T extends RestorableSplitTab>(
  tabs: T[],
  visitedTabIds: ReadonlySet<string>,
  loadViewConfig: (tab: T) => Promise<void>,
  loadTabData: (tab: T) => Promise<void>,
): Promise<void> {
  const pendingTabs = tabs.filter(tab => !visitedTabIds.has(tab.id))

  await Promise.all(pendingTabs.map(async tab => {
    await loadViewConfig(tab)
    if (tab.type !== 'home' && tab.needUpdate) {
      await loadTabData(tab)
      tab.needUpdate = false
    }
  }))
}
