# SMB 路径 (smbPath) 功能说明

## 背景

Mira 服务端可以部署在 Docker 容器中。容器内的文件路径（如 `/data/libraries/xxx/photo.jpg`）对客户端来说不可直接访问。SMB 路径机制让客户端通过 Windows 网络共享 (SMB/CIFS) 直接访问这些文件，从而实现本地预览、拖拽导出、定位文件夹等操作。

## 核心概念

| 术语 | 含义 | 示例 |
|------|------|------|
| `smbPath` | 客户端能访问的 SMB 共享根路径 | `\\192.168.1.200\mira_data` |
| `mountPath` | 服务端（容器内）对应的挂载路径前缀 | `/data` |
| `localFile` | 经过映射后，客户端可直接使用的本地文件路径 | `\\192.168.1.200\mira_data\libraries\xxx\photo.jpg` |

## 配置方式

在 ServerEditDialog 中配置（对应 `ServerConfig.smb` 字段）：

```typescript
// stores/serverList.ts
smb?: {
  enabled: boolean       // 是否启用 SMB 映射
  mountPath?: string     // 服务端挂载路径前缀，如 /data
  smbPath?: string       // SMB 路径，如 \\192.168.1.200\mira_data
}
```

启用条件：服务端运行在 Docker 中 (`systemHealth.isDocker === true`) 且 `smb.enabled === true` 且 `smb.smbPath` 非空。

## 路径转换逻辑

路径转换发生在 `MiraSDKService.listFiles()` 中，服务端返回的文件数据经过处理后赋值到 `FileInfo.localFile`：

### Docker + SMB 启用时

**有 mountPath 的情况**（精确映射）：

```
服务端路径:  /data/libraries/1/photo.jpg
mountPath:   /data
smbPath:     \\192.168.1.200\mira_data

localFile = 服务端路径.replace('/data/', '\\192.168.1.200\mira_data\')
          = \\192.168.1.200\mira_data\libraries\1\photo.jpg
```

**无 mountPath 的情况**（按 folder_name + name 拼接）：

```
smbPath:      \\192.168.1.200\mira_data
folder_name:  libraries/1
name:         photo.jpg

localFile = \\192.168.1.200\mira_data\libraries\1\photo.jpg
```

### Docker + SMB 未启用

`localFile` 为空，客户端回退到 HTTP URL 访问文件。

### 非 Docker 部署（本地部署）

服务端路径即本机路径，`localFile` 直接使用服务端返回的 `file_path`。

## 数据流

```
ServerConfig.smb  ──→  MiraSDKService.listFiles()
                         ├── 检测 isDocker
                         ├── 读取 smbConfig (from ServerListStore)
                         ├── 路径替换 → FileInfo.localFile
                         └── 回退 → MediaStore.getLocalFile()

FileInfo.localFile  ──→  消费方
                         ├── MediaItem.vue         → 缩略图本地加载
                         ├── useMediaItem.ts       → getLocalFile()
                         ├── DragDropHandler.ts    → 拖拽导出文件
                         ├── useContextMenu.ts     → 「定位到文件夹」菜单
                         ├── ImagePreview          → 本地图片预览
                         ├── VideoPreviewContainer → 本地视频播放
                         └── SearchHandlers        → 搜索结果本地路径
```

## 相关文件

| 文件 | 职责 |
|------|------|
| `stores/serverList.ts` | `ServerConfig.smb` 类型定义与持久化 |
| `services/MiraSDKService.ts:520-576` | 路径转换核心逻辑 |
| `shared/types.ts` | `FileInfo.localFile` 字段定义 |
| `stores/media.ts` | `localFiles` 缓存 + `setLocalFile/getLocalFile/enhanceFileWithLocalFile` |
| `components/business/ServerEditDialog.vue` | SMB 配置 UI |
| `main/ipc/FileSystemHandlers.ts` | `fs:showItemInFolder` IPC handler |
| `preload/preload.ts` | 暴露 `fs.showItemInFolder` 到渲染进程 |
| `components/business/MediaGridComponent/composables/useContextMenu.ts` | 「定位到文件夹」右键菜单项 |

## 注意事项

- 路径分隔符自适应：smbPath 含 `/` 用 `/`，含 `\` 用 `\`
- Windows UNC 路径 `\\server\share` 可直接被系统识别
- 非 Windows 平台 SMB 支持有限（见 `DragDropHandler.convertSmbToLocalPath`）
- `localFile` 为空时不影响基本功能，HTTP URL 作为兜底方案
