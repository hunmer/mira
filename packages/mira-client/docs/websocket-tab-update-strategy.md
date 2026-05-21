# WebSocket Tab 更新策略

## 概述

当服务端通过 WebSocket 推送文件变更事件（`file::created` / `file::updated` / `file::deleted`）时，客户端需要决定哪些 Tab 需要刷新。

核心思路：**每种 Tab 类型定义自己的匹配条件，事件到达后遍历所有 Tab 逐一判断，匹配的标记 `needUpdate`，活跃 Tab 立即刷新。**

## 数据流

```
WebSocket file::updated 事件
        │
        ▼
  handleFileEvent()              ← WebSocketService.ts
        │
        ▼
  markTabsForEvent(data)         ← useTabs.ts
        │
        ├── 遍历每个 tab
        │     └── tabType.shouldUpdateForEvent(tab.data, eventData)
        │           ├── true  → tab.needUpdate = true
        │           └── false → 跳过
        │
        ├── 活跃 tab 被标记 → 派发 active-tab-refresh window 事件
        │                         └── MediaTabListView.handleRefresh()
        │
        └── 非活跃 tab 被标记 → 切回时由 switchToTab lazyLoad 触发刷新
```

## 各 Tab 类型匹配规则

| Tab 类型 | 匹配条件 | 说明 |
|----------|---------|------|
| `all` | `tab.libraryId === event.libraryId` | 同库内任何文件变动都影响"全部文件"视图 |
| `folder` | `libraryId` 匹配 **且** `folder_id === tab.folderId` | 只刷新文件所属文件夹的 Tab |
| `tag` | `libraryId` 匹配 **且** 事件 tags 包含该标签 | 需要事件携带 tags 信息，否则跳过 |
| `trash` | `libraryId` 匹配 **且** `recycled != null` | 文件回收状态变更时刷新回收站 |
| `uncategorized` | `libraryId` 匹配 **且** `folder_id` 为空 | 文件变为未分类时刷新 |
| `untagged` | `libraryId` 匹配 **且** `tags` 为空数组 | 文件标签被清空时刷新 |
| `home` | 不匹配 | 首页不展示文件列表，无需刷新 |

## 涉及文件

| 文件 | 职责 |
|------|------|
| `composables/TabRegistry.ts` | `TabTypeDefinition` 接口定义 `shouldUpdateForEvent` |
| `composables/TabTypes.ts` | `BaseTabType` 默认实现（返回 false） |
| `composables/tabs/*.ts` | 各 Tab 类型覆写 `shouldUpdateForEvent` |
| `composables/useTabs.ts` | `markTabsForEvent()` 遍历标记 |
| `services/WebSocketService.ts` | 收到事件后调用标记 + 派发活跃 Tab 刷新 |
| `components/tabs/MediaTabListView.vue` | 监听 `active-tab-refresh` 立即刷新 |

## 活跃 Tab vs 非活跃 Tab

**活跃 Tab（当前显示的）：**
- `handleFileEvent` 通过 `window` 事件 `active-tab-refresh` 通知
- `MediaTabListView` 收到后匹配 `tabId`，调用 `handleRefresh()`

**非活跃 Tab（后台的）：**
- 仅标记 `tab.needUpdate = true`
- 用户切回该 Tab 时，`switchToTab` 检测到 `needUpdate`，执行 `lazyLoadHandler` 刷新数据
- 刷新完成后 `needUpdate` 重置为 `false`

## 事件数据示例

```json
{
  "eventName": "file::updated",
  "data": {
    "libraryId": "1778657429682",
    "fileId": 33,
    "path": "G:\\test_library\\未分类\\aaa.mp4",
    "name": "aaa.mp4",
    "folder_id": 2
  }
}
```

## 扩展方式

新增 Tab 类型时只需两步：

1. 在新的 TabType 类中覆写 `shouldUpdateForEvent(tabData, eventData)`
2. 无需修改其他文件，`markTabsForEvent` 会自动调用
