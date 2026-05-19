import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { LibraryStorage } from '../utils/LibraryStorage'

// 上传记录接口
export interface UploadRecord {
  id: string
  name: string
  size: number
  mimeType: string
  libraryId: string
  libraryName: string
  uploadedAt: Date
  status: 'success' | 'failed'
  localPath?: string
  serverId?: string
  error?: string
}

export const useUploadHistoryStore = defineStore('uploadHistory', () => {
  // 状态
  const uploadRecords = ref<UploadRecord[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const totalRecords = computed(() => uploadRecords.value.length)
  const successfulUploads = computed(() => 
    uploadRecords.value.filter(record => record.status === 'success')
  )
  const failedUploads = computed(() => 
    uploadRecords.value.filter(record => record.status === 'failed')
  )

  // 按库分组的记录
  const recordsByLibrary = computed(() => {
    const grouped: Record<string, UploadRecord[]> = {}
    uploadRecords.value.forEach(record => {
      if (!grouped[record.libraryId]) {
        grouped[record.libraryId] = []
      }
      grouped[record.libraryId].push(record)
    })
    return grouped
  })

  /**
   * 添加上传记录
   */
  const addUploadRecord = (record: Omit<UploadRecord, 'id' | 'uploadedAt'>) => {
    const newRecord: UploadRecord = {
      ...record,
      id: generateId(),
      uploadedAt: new Date()
    }
    
    uploadRecords.value.unshift(newRecord) // 新记录添加到开头
    persistToStorage()
    
    return newRecord.id
  }

  /**
   * 更新上传记录状态
   */
  const updateUploadRecord = (id: string, updates: Partial<UploadRecord>) => {
    const index = uploadRecords.value.findIndex(record => record.id === id)
    if (index !== -1) {
      uploadRecords.value[index] = { ...uploadRecords.value[index], ...updates }
      persistToStorage()
      return true
    }
    return false
  }

  /**
   * 删除上传记录
   */
  const deleteUploadRecord = (id: string) => {
    const index = uploadRecords.value.findIndex(record => record.id === id)
    if (index !== -1) {
      uploadRecords.value.splice(index, 1)
      persistToStorage()
      return true
    }
    return false
  }

  /**
   * 批量删除上传记录
   */
  const deleteMultipleRecords = (ids: string[]) => {
    const deletedCount = ids.reduce((count, id) => {
      const index = uploadRecords.value.findIndex(record => record.id === id)
      if (index !== -1) {
        uploadRecords.value.splice(index, 1)
        return count + 1
      }
      return count
    }, 0)
    
    if (deletedCount > 0) {
      persistToStorage()
    }
    
    return deletedCount
  }

  /**
   * 清空所有记录
   */
  const clearAllRecords = () => {
    uploadRecords.value = []
    persistToStorage()
  }

  /**
   * 清空指定库的记录
   */
  const clearLibraryRecords = (libraryId: string) => {
    uploadRecords.value = uploadRecords.value.filter(record => record.libraryId !== libraryId)
    persistToStorage()
  }

  /**
   * 获取指定库的记录
   */
  const getLibraryRecords = (libraryId: string) => {
    return uploadRecords.value.filter(record => record.libraryId === libraryId)
  }

  /**
   * 搜索记录
   */
  const searchRecords = (query: string, libraryId?: string) => {
    let records = libraryId ? getLibraryRecords(libraryId) : uploadRecords.value
    
    if (!query.trim()) return records
    
    const lowerQuery = query.toLowerCase()
    return records.filter(record => 
      record.name.toLowerCase().includes(lowerQuery) ||
      record.mimeType.toLowerCase().includes(lowerQuery) ||
      record.libraryName.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 持久化到本地存储
   */
  const persistToStorage = async () => {
    try {
      const data = {
        records: uploadRecords.value.map(record => ({
          ...record,
          uploadedAt: record.uploadedAt.toISOString()
        })),
        lastUpdated: new Date().toISOString()
      }
      await LibraryStorage.setItem('upload-history', JSON.stringify(data))
    } catch (err) {
      console.error('Failed to persist upload history:', err)
      error.value = 'Failed to save upload history'
    }
  }

    /**
   * 从本地存储恢复
   */
  const restoreFromStorage = async () => {
    try {
      const stored = await LibraryStorage.getItem('upload-history')
      if (!stored) return

      const data = JSON.parse(stored)
      uploadRecords.value = (data.records || []).map((record: any) => ({
        ...record,
        uploadedAt: new Date(record.uploadedAt)
      }))
      
      error.value = null
    } catch (err) {
      console.error('Failed to restore upload history:', err)
      error.value = 'Failed to load upload history'
    }
  }

  /**
   * 生成唯一ID
   */
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 清除错误
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 获取统计信息
   */
  const getStats = (libraryId?: string) => {
    const records = libraryId ? getLibraryRecords(libraryId) : uploadRecords.value
    
    return {
      total: records.length,
      successful: records.filter(r => r.status === 'success').length,
      failed: records.filter(r => r.status === 'failed').length,
      totalSize: records.reduce((sum, r) => sum + r.size, 0)
    }
  }

  return {
    // 状态
    uploadRecords,
    isLoading,
    error,
    
    // 计算属性
    totalRecords,
    successfulUploads,
    failedUploads,
    recordsByLibrary,
    
    // 方法
    addUploadRecord,
    updateUploadRecord,
    deleteUploadRecord,
    deleteMultipleRecords,
    clearAllRecords,
    clearLibraryRecords,
    getLibraryRecords,
    searchRecords,
    persistToStorage,
    restoreFromStorage,
    clearError,
    getStats
  }
})
