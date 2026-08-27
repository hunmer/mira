import { EventEmitter } from 'event-emitter-adv'

export interface ActiveTabRefreshDetail {
  tabId: string
  eventType: 'created' | 'updated' | 'deleted' | 'recovered' | 'trash-emptied'
  data: any
}

export interface LibraryFileChangedDetail {
  libraryId?: string
  eventType: 'created' | 'updated' | 'deleted' | 'recovered'
}

export interface RefreshDetail {
  libraryId?: string
}

export interface ThumbnailUpdatedDetail {
  fileId: string
  thumbPath: string
}

export type MiraEventMap = {
  'active-tab-refresh': ActiveTabRefreshDetail
  'library-file-changed': LibraryFileChangedDetail
  'refresh-folders': RefreshDetail
  'refresh-tags': RefreshDetail
  'thumbnail-updated': ThumbnailUpdatedDetail
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
    this.emitter.emit(String(event), detail)
  }

  emitAsync<K extends keyof MiraEventMap>(event: K, detail: MiraEventMap[K]): Promise<void> {
    return this.emitter.emitAsync(String(event), detail).then(() => undefined)
  }
}

export const miraEventBus = new MiraEventBus()
