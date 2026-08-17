# Mira vs Eagle.cool 多维度调研报告

> 调研时间：2026-08-17
> Mira 信息来源：项目 README + 源码验证；Eagle 信息来源：[官网](https://eagle.cool/)及公开资料。

## 一、总览对比表

| 维度 | Mira | Eagle |
|---|---|---|
| 产品形态 | 服务端 + Web 面板 + 桌面客户端 | 纯本地桌面软件 |
| 素材库结构 | 原生文件夹层级结构（磁盘目录即素材库，SQLite 记录元数据） | 专用素材库结构（自有 `.library` 格式） |
| 用户体系 | ✅ 多用户 + 多角色多权限（登录验证 + 会话管理） | ❌ 仅本地密码保护 |
| 服务端 | ✅ 核心架构（HTTP + WS + 用户认证） | ❌ 无，单机应用 |
| Docker / NAS | ✅ 官方 Dockerfile + CI 构建 | ❌ 不支持 |
| 插件系统 | ✅ 服务端 + Web 双端插件 | ✅ 插件中心（JS + HTML） |
| 开源 / 价格 | 开源（ISC），免费 | 闭源，¥229 / $34.95 一次性买断（2 台设备） |
| 覆盖平台 | Web（任意设备浏览器）、Electron 桌面端、浏览器扩展 | 仅 Windows / macOS 桌面端 + 浏览器扩展 |
| 定制自由度 | 极高（全源码 + SDK + CLI + MCP） | 有限（仅插件 API 层面） |
| 插件生态 | 起步期（仓库内置 16 个） | 成熟（官方插件中心，8 大分类，40 万用户） |

## 二、分维度详述

### 1. 素材库结构

- **Mira**：采用**原生文件夹层级结构**——素材直接以普通文件形式存放在磁盘目录树中，磁盘上的目录层级即素材库层级，SQLite（`files/folders/tags` 三表，见 `packages/mira-app-core/src/storage/sqlite/LibraryServerDataSQLite.ts:57`）只承担元数据与索引职责。文件夹和标签均支持层级（`parent_id`）、颜色、图标、排序；文件支持多标签、评分、备注、来源网址、自定义字段、metadata、hash（可用于查重）、回收站标记；支持多库管理。**未发现智能文件夹功能**。
  - 好处：素材库对文件系统透明，文件可脱离 Mira 直接被 NAS、备份工具、其他软件读取，无格式锁定，迁移成本为零。
- **Eagle**：采用**专用素材库结构**（`.library` 包格式），库内部组织由 Eagle 自定义管理；组织模型为层级文件夹 + 标签（支持一图多文件夹归属）+ **智能文件夹**（按名称/标签/颜色/格式自动归类）+ 注释、评分、自动标签、查重、自定义 Action 工作流。
  - 好处：官方体验一致、数据自洽；代价是供应商锁定——离开 Eagle 软件，库的组织信息基本不可用，跨软件迁移依赖导出功能。
- **小结**：两种存储哲学——Mira「文件系统为本、数据库为索引」，Eagle「应用为本、专用格式封装」。前者开放防锁定，后者体验一体化；智能文件夹是 Eagle 的明显功能差异点。

### 2. 用户体系

- **Mira**：完整的**多用户多权限体系**——服务端 `users` 表支持角色（`super`/`user` 等）与细粒度权限数组（permissions），独立 sessions 会话/登录验证机制（见 `packages/mira-app-server/src/UserStorage.ts:56`），支持管理员/设备管理面板，天然适合团队共享与家庭多人使用。
- **Eagle**：无用户概念，仅提供**本地库密码保护**（打开库需输入密码），单机单人使用，无权限区分、无审计能力。
- **小结**：Mira 是真正的账号体系（认证 + 授权），Eagle 只是本地锁。这是 Mira 服务端架构带来的直接优势，也是团队场景下的决定性差异。

### 3. 服务端支持

- **Mira**：服务端是产品核心——独立 `mira-app-server`（HTTP 8081 + WebSocket 8018），带用户认证、多管理员、设备管理；提供完整 CLI 和 **MCP 服务（50 个工具）**，可被 AI Agent 直接调用。
- **Eagle**：无服务端概念，纯单机桌面应用，多设备只能靠把库目录放进云盘（如 Google Drive）同步，无并发/权限控制。
- **小结**：架构层面的根本差异。Mira 是 C/S 架构，Eagle 是单机软件。

### 4. Docker / NAS 支持

- **Mira**：✅ 官方提供 `Dockerfile`、`Dockerfile.optimized` 及 GitHub Actions `docker.yml` 自动构建，适合部署在 NAS/家庭服务器，全家设备通过浏览器访问。
- **Eagle**：❌ 官网完全未提及 Docker/NAS 部署，仅能通过云盘间接实现跨设备。

### 5. 插件系统

- **Mira**：服务端插件 + Web 端插件双体系。仓库内置 16 个插件，偏「格式与处理能力」：3D/EPUB/LIVP/Lottie/PAG/Spine/SWF/PSD/PDF 等格式支持、重复文件扫描、ImageMagick 缩略图、gallery-dl 采集、n8n 自动化集成、Eagle 扩展迁移工具，另有推荐机制（`plugins.recommend.json`）。
- **Eagle**：插件中心（4.0 引入，JS + HTML 开发，门槛低），8 大分类，含官方与社区插件（Pinterest 视觉搜索、背景移除、AI 放大/擦除等），有官方审核与开发者政策。
- **小结**：两者都开放插件 API；Mira 插件跑在服务端（可做重处理如转码/缩略图），Eagle 插件跑在客户端。

### 6. 开源 / 闭源与价格

- **Mira**：**ISC 许可证，完全开源免费**。
- **Eagle**：闭源商业软件。一次性买断（非订阅）：**¥229 / US$34.95** 一组序列号激活 2 台设备，加设备 ¥114.5 / US$17.50，30 天全功能试用；2024 年 11 月从 ¥199 涨至 ¥229，教育优惠已于 2026 年 5 月终止。买断含后续版本免费更新（含 5.0 AI 版，本地模型免费，第三方 API 自付费）。

### 7. 覆盖平台

- **Mira**：Web 管理面板（Vue3，任何有浏览器的设备：手机/平板/Linux 均可访问）+ Electron 桌面客户端（Win/macOS，CI 自动构建）+ 浏览器采集扩展（截图/拖拽/资源嗅探）。服务端跑 Node，任意 Linux 可用。
- **Eagle**：仅 **Windows 10+ / macOS 10.15+** 桌面端 + 浏览器扩展，无移动端/Web 端，Linux 无法使用。

### 8. 定制自由度

- **Mira**：极高——全栈 TypeScript 源码可改；数据层可直连 SQLite；对外暴露 SDK（HTTP/WS 客户端）、CLI、MCP 三种编程接口；甚至有 `mira_eagle_extension` 插件用于迁移 Eagle 资产。
- **Eagle**：有限——核心闭源不可改，定制只能停留在插件 API 层面；5.0 开放了 MCP/Skill 和 AI SDK 供 AI Agent 接入，但仍在官方划定的能力边界内。

### 9. 插件生态

- **Mira**：起步期，仓库内置 16 个插件（偏格式支持与自动化），社区生态尚未形成规模。
- **Eagle**：成熟——40 万+ 用户基数，官方插件中心 + 社区论坛 + Reddit 活跃投稿，有审核流程和开发者政策，生态正围绕 AI 插件（反向以图搜图、语义搜索）继续扩张。
- **小结**：这是 Eagle 目前最明显的优势项。

## 三、结论与选型建议

| 场景 | 推荐 |
|---|---|
| NAS/自建服务器、多设备（含手机）访问 | **Mira**（Eagle 无服务端，无法实现） |
| 多人/团队/家庭共享素材库（需分权限） | **Mira**（Eagle 仅本地密码，无多用户能力） |
| 预算敏感 / 要求开源可控 / 深度二次开发 / 防格式锁定 | **Mira** |
| 设计师个人单机使用、要智能文件夹、要成熟 AI/插件开箱体验 | **Eagle** |
| AI Agent 集成 | 两者均可（Mira 原生 MCP 50 工具；Eagle 5.0 提供 Skill/MCP） |

一句话：**Eagle 是面向个人设计师的成熟闭源单机工具，Mira 是面向自托管/可编程场景的开源服务化方案**，二者重叠在「素材收集与整理」这一层，但架构定位不同。

## 参考

- [Eagle 官网](https://eagle.cool/)
- [Eagle 价格调整通知（2024-11 起调价）](https://cn.eagle.cool/blog/post/price-adjustment-notice-2024)
- [Eagle 4 发布公告](https://en.eagle.cool/blog/post/eagle4)
- [Eagle 5 预告](https://en.eagle.cool/blog/post/eagle5-teaser)
- [Eagle 开发者政策](https://developer.eagle.cool/plugin-api/plugin-review/developer-policies)
- [Eagle 加购设备](https://en.eagle.cool/upgrade)
