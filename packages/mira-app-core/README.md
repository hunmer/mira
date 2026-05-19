# mira-app-core

## 定位
mira-app-core 是 Mira TypeScript 项目的纯 SDK/类型/解析模块，仅包含数据类型定义、解析逻辑、SDK 通信等功能，不包含任何服务端实现。

## 用法
- 通过 `import { 类型/工具 } from 'mira-app-core'` 获取所有类型、SDK工具和解析能力。
- 适用于浏览器、Node.js、服务端等多种环境。

## 主要导出
- 类型定义：User、Session、WebSocketMessage 等
- 工具/SDK：LibraryStorage、EventManager、getLibrarysJson 等

## 依赖说明
- 仅依赖 axios、queue 等纯工具库，无 express、ws、数据库等服务端依赖。

## 典型用例
```ts
import type { User, Session } from 'mira-app-core';
import { LibraryStorage } from 'mira-app-core';

const storage = new LibraryStorage();
storage.addLibrary('lib1', { name: 'Library 1' });
```

## 变更说明
- 2025/08/15：重构为纯 SDK，移除所有服务端实现和依赖。
