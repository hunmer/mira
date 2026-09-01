import { EventEmitter } from 'event-emitter-adv'

export interface ActiveTabRefreshDetail {
  tabId: string
  eventType: 'created' | 'updated' | 'deleted' | 'recovered' | 'trash-emptied'
  data: any
}

export interface LibraryFileChangedDetail {
  libraryId?: string
  eventType: 'created' | 'updated' | 'deleted' | 'recovered' | 'trash-emptied'
}

export interface RefreshDetail {
  libraryId?: string
}

export interface ThumbnailUpdatedDetail {
  fileId: string
  thumbPath: string
}

export interface HomeFolderSelectedDetail { [key: string]: any }
export interface HomeTagSelectedDetail { [key: string]: any }
export interface HomeRouteDetail { folderId?: string; tagId?: string; libraryId?: string; title?: string }
export interface HomeTabReplaceDetail { kind: 'all' | 'folder' | 'tag'; payload: { id?: string; title?: string; label?: string } }
export interface CollectionChangedDetail { collection?: any; libraryId?: string }

export type MiraEventMap = {
  'active-tab-refresh': ActiveTabRefreshDetail
  'library-file-changed': LibraryFileChangedDetail
  'refresh-folders': RefreshDetail
  'refresh-tags': RefreshDetail
  'thumbnail-updated': ThumbnailUpdatedDetail
  'home-folder-selected': HomeFolderSelectedDetail
  'home-tag-selected': HomeTagSelectedDetail
  'home-folder-cleared': undefined
  'home-tag-cleared': undefined
  'home-route-folder': HomeRouteDetail
  'home-route-tag': HomeRouteDetail
  'home-tab-replace': HomeTabReplaceDetail
  'collection-changed': CollectionChangedDetail
}

type Listener<T> = (detail: T) => void | Promise<void>

class MiraEventBus {
  private readonly emitter = new EventEmitter(null)

  on<K extends keyof MiraEventMap>(event: K, listener: Listener<MiraEventMap[K]>, weight?: number): void {
    this.emitter.on(String(event), listener, null, weight)
  }

  off<K extends keyof MiraEventMap>(event: K, listener: Listener<MiraEventMap[K]>): void {
    this.emitter.off(String(event), listener)
  }

  emit<K extends keyof MiraEventMap>(event: K, detail: MiraEventMap[K]): void {
    if (detail === undefined) this.emitter.emit(String(event))
    else this.emitter.emit(String(event), detail)
  }

  emitAsync<K extends keyof MiraEventMap>(event: K, detail: MiraEventMap[K]): Promise<void> {
    return this.emitter.emitAsync(String(event), detail).then(() => undefined)
  }
}

export const miraEventBus = new MiraEventBus()
