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

/** 文件元数据(文件信息表单编辑项;缺省回退原始文件信息) */
export interface BatchUploadFileMeta {
  /** 编辑后的文件名 */
  fileName?: string
  /** 源链接(存入文件元数据 website) */
  url?: string
  /** 注释(存入文件元数据 notes) */
  note?: string
  /** 单独设置的目标文件夹 id(经文件夹树应用到选中文件) */
  folderId?: string
  /** 单独设置的标签(按标题名称,服务器按名称关联) */
  tags?: string[]
}

/** 批量上传提交内容(未传 uploadFile 服务时经 emit('upload') 交宿主执行) */
export interface BatchUploadPayload {
  libraryId: string
  folderId?: string
  tags?: string[]
  files: File[]
  /** 与 files 顺序对应的文件元数据 */
  metas?: BatchUploadFileMeta[]
}

/** 上传服务:组件内上传模式逐文件调用,item 携带目标位置与该文件元数据,onProgress 回传 0-100 进度 */
export type BatchUploadFileService = (
  item: { file: File; libraryId: string; folderId?: string; tags?: string[] } & BatchUploadFileMeta,
  onProgress: (percent: number) => void,
) => Promise<unknown>
