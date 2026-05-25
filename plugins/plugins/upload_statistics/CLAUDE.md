[根目录](../../../CLAUDE.md) > [plugins](../../CLAUDE.md) > [plugins](..) > **upload_statistics**

# upload_statistics

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 初始化 | 深度扫描后生成模块文档 |

## 模块职责

上传统计插件。记录和查询文件上传历史数据，关联上传者信息。

核心功能：
- 文件上传时自动记录上传者用户名
- 将 `username` 写入文件的 `custom_fields.uploader`
- 按用户名和日期范围查询上传记录

## 入口与启动

- **入口文件**: `index.ts` -- 导出 `init(inst): UploadStatistics` 工厂函数
- 由 `ServerPluginManager` 在素材库加载时自动实例化

## 对外接口

### HTTP 路由

| 路径 | 方法 | 说明 |
|------|------|------|
| `/upload_statistics/list` | GET | 查询上传记录，支持 username/startDate/endDate 过滤 |

### 事件监听

| 事件 | 说明 |
|------|------|
| `file::created` | 文件上传后记录上传者信息 |

### 注册字段

- `{ action: 'create', type: 'file', field: 'username' }`

### 前端路由

| 路径 | 组件 | 权限 |
|------|------|------|
| `/statistics/upload` | UploadStatistics | super, admin, user |
| `/statistics/upload/details` | UploadDetails | super, admin |

## 关键依赖与配置

- `mira-app-server`: ServerPlugin 基类
- `mira-storage-sqlite`: ILibraryServerData 数据接口

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `index.ts` | 插件主实现 (130 行) |
| `package.json` | 包配置 (v1.0.7) |
