# Task Plan

## Goal
修复浏览器扩展图片拖拽区域在页面刷新或重新打开 Tab 后不再展示的问题。

## Phases
- [in_progress] 定位 content script 注入、dragdrop 初始化与清理生命周期
- [pending] 实施最小修复并补充必要测试
- [pending] 执行定向验证并总结验收步骤

## Constraints
- 保持改动最小，不改无关模块。
- 避免重复事件监听和跨页面残留状态。

## Errors Encountered
暂无。
