# mira_semantic_search

语义搜索深度插件(v1.0.0,2026-10 落库)。基于 **Ollama** embedding 模型(默认 `embeddinggemma-2`)为素材文本信息建立向量索引,支持自然语言语义检索与「以图搜图」(视觉模型打标转译方案);带 dashboard 管理页与客户端 FilterBar 搜索入口。是 `mira_ai_sdk` 之外**第二个带 runtime npm 依赖的深度插件**(`sqlite-vec`)。

## 约定

- 协议 A 深度插件(自定义类,不 `extends ServerPlugin`),`getRoutes()` + `registerRounter` 注册 **8 条路由**(前缀 `/api/semantic-search`):`GET/POST /settings`、`POST /test`、`GET /status`、`POST /index`(body `{ force?, imagesOnly? }`)、`POST /stop`、`POST /search`(文本)、`POST /search-image`(以图搜图,`{ fileId }` 或 `{ imageBase64, topK? }`)
- 配置持久化在 `{pluginDir}/data/settings.json`(运行时生成,git 忽略);默认 `apiUrl=http://localhost:11434`、`model=embeddinggemma-2`、`dim=768`、`batchSize=16`、`vecIndex=true`
- 向量存储在**素材库数据库**:`semantic_search_index` 表(file_id 主键,BLOB Float32:`embedding`=文本向量、`image_embedding`=图像描述向量、`image_hash`=视觉模型+图片内容 sha1 增量标记、`image_caption`)+ 可选 vec0 虚拟表 ×2(`semantic_search_vec`/`semantic_search_vec_img`,sqlite-vec KNN 加速,加载失败自动回退内存余弦扫描)
- 以图搜图:Ollama `/api/embed` 不支持 images,图片经 `/api/chat`(视觉模型如 `gemma3:4b`)生成中文描述再嵌入;搜索时图像+文本两个向量集合取每文件最高分,文本搜索同样融合图像向量
- **自动增量同步**:订阅库 `eventManager` 的 `file::created/updated/deleted`,3 秒去抖聚批重嵌入/清理(仅当索引非空时生效)
- 索引文本按 EmbeddingGemma 2 规范加前缀(文档 `title: … | text: …` / 查询 `task: search result | query: …`);支持 Matryoshka 维度截断(768/512/256/128),优先 Ollama `dimensions` 参数,本地截断兜底
- 图片送视觉模型上限 15MB 原始字节;嵌入超时 120s、视觉超时 180s
- server 运行时注册表中**默认 enabled=false**(需手动启用);源码侧展示 `plugins/plugins/plugins.json` 已收录

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口,1144 行:路由/索引任务/向量存取/事件同步;纯函数(`truncateAndNormalize` 等)以静态方法暴露便于测试 |
| `components/SemanticSearch.js` | dashboard 页面组件(454 行,IIFE 注册到 `window.MiraPluginComponents`),UI 路由 `/tools/semantic-search`(「工具」组) |
| `web/index.js` | 客户端 FilterBar 插件(100 行,pluginId `mira-semantic-search-filter`):向 `window.pluginSystem.filterSearchProviders` 注册搜索提供者,FilterBar 输入 → 调 `/search` → 返回素材 id 集合由宿主按相似度过滤排序;服务端 origin 从 `<script src>` 地址解析 |
| `web/plugin.json` | 客户端插件 manifest(permissions `["ui"]`) |
| `README.md` | 完整原理/部署/API 文档(最详尽) |
| `package.json` | 依赖 `sqlite-vec ^0.1.9`;`main: dist/index.js`(tsc 构建) |

## 扫描状态

- **更新时间**: 2026-11-21(首建文档,基线 bc638a73 后新增)
- **已扫描**: index.ts 头部 220 行 + 方法清单、README 全文、web/index.js 全文、SemanticSearch.js 模板结构、双注册表条目
- **未深扫**: index.ts 640 行之后的索引任务执行/vec0 SQL 细节、SemanticSearch.js 完整交互逻辑
