export interface SaveLocation {
  libraryId: string
  folderId?: string
  /** 保存时附加的标签(按标题名称,服务器按名称关联) */
  tags?: string[]
  /** 源链接(存入文件元数据 website) */
  url?: string
  /** 注释(存入文件元数据 notes) */
  note?: string
  fileName: string
}
