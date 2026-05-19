/**
 * 搜索服务注册中心
 * 统一管理和导出所有搜索服务
 */

import { fileSearchService } from './FileSearchService'
import { tagSearchService } from './TagSearchService'
import { folderSearchService } from './FolderSearchService'
import type { SearchService } from '../../types/search'

/**
 * 所有可用的搜索服务
 */
export const searchServices: SearchService[] = [
  fileSearchService,
  tagSearchService,
  folderSearchService
]

/**
 * 根据ID获取搜索服务
 * @param id 服务ID
 * @returns 搜索服务实例或undefined
 */
export function getSearchServiceById(id: string): SearchService | undefined {
  return searchServices.find(service => service.id === id)
}

/**
 * 注册所有搜索服务到全局搜索系统
 * @param registerFunction 注册函数
 */
export function registerAllSearchServices(registerFunction: (service: SearchService) => void): void {
  searchServices.forEach(service => {
    try {
      registerFunction(service)
    } catch (error) {
      console.error(`❌ Failed to register search service "${service.title}":`, error)
    }
  })
}

// 导出单个服务
export {
  fileSearchService,
  tagSearchService,
  folderSearchService
}
