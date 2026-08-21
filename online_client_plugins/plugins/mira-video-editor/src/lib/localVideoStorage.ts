/**
 * 本地视频列表存储服务
 * 使用 localStorage 管理本地视频列表
 */
import type { VideoList, VideoData } from '@/types/video-editor'

const LOCAL_LISTS_KEY = 'mira-video-editor:local-lists'

export class LocalVideoStorage {
  /**
   * 获取所有本地视频列表
   */
  getLocalLists(): VideoList[] {
    try {
      const data = localStorage.getItem(LOCAL_LISTS_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to get local lists:', error)
      return []
    }
  }

  /**
   * 保存本地视频列表
   */
  saveLocalLists(lists: VideoList[]): void {
    try {
      localStorage.setItem(LOCAL_LISTS_KEY, JSON.stringify(lists))
    } catch (error) {
      console.error('Failed to save local lists:', error)
    }
  }

  /**
   * 创建本地视频列表
   */
  createLocalList(name: string, description?: string): VideoList {
    const lists = this.getLocalLists()
    const newList: VideoList = {
      id: crypto.randomUUID(),
      name,
      description: description || '',
      videos: [],
      type: 'local',
      create_date: new Date().toISOString(),
      update_date: new Date().toISOString()
    }
    
    lists.push(newList)
    this.saveLocalLists(lists)
    return newList
  }

  /**
   * 更新本地视频列表
   */
  updateLocalList(listId: string, updates: Partial<VideoList>): VideoList | null {
    const lists = this.getLocalLists()
    const listIndex = lists.findIndex(l => l.id === listId)
    
    if (listIndex === -1) return null
    
    lists[listIndex] = {
      ...lists[listIndex],
      ...updates,
      update_date: new Date().toISOString()
    }
    
    this.saveLocalLists(lists)
    return lists[listIndex]
  }

  /**
   * 删除本地视频列表
   */
  deleteLocalList(listId: string): boolean {
    const lists = this.getLocalLists()
    const newLists = lists.filter(l => l.id !== listId)
    
    if (newLists.length !== lists.length) {
      this.saveLocalLists(newLists)
      return true
    }
    return false
  }

  /**
   * 添加视频到本地列表
   */
  addVideoToLocalList(listId: string, video: VideoData): boolean {
    const lists = this.getLocalLists()
    const list = lists.find(l => l.id === listId)
    
    if (!list) return false
    
    list.videos.push(video)
    list.update_date = new Date().toISOString()
    this.saveLocalLists(lists)
    return true
  }

  /**
   * 从本地列表删除视频
   */
  removeVideoFromLocalList(listId: string, videoId: string): boolean {
    const lists = this.getLocalLists()
    const list = lists.find(l => l.id === listId)
    
    if (!list) return false
    
    const videoIndex = list.videos.findIndex(v => v.id === videoId)
    if (videoIndex === -1) return false
    
    list.videos.splice(videoIndex, 1)
    list.update_date = new Date().toISOString()
    this.saveLocalLists(lists)
    return true
  }

  /**
   * 更新本地列表中的视频
   */
  updateVideoInLocalList(listId: string, videoId: string, updates: Partial<VideoData>): boolean {
    const lists = this.getLocalLists()
    const list = lists.find(l => l.id === listId)
    
    if (!list) return false
    
    const videoIndex = list.videos.findIndex(v => v.id === videoId)
    if (videoIndex === -1) return false
    
    list.videos[videoIndex] = {
      ...list.videos[videoIndex],
      ...updates
    }
    list.update_date = new Date().toISOString()
    this.saveLocalLists(lists)
    return true
  }

  /**
   * 获取特定本地列表
   */
  getLocalList(listId: string): VideoList | null {
    const lists = this.getLocalLists()
    return lists.find(l => l.id === listId) || null
  }
}

export const localVideoStorage = new LocalVideoStorage()
export default localVideoStorage
