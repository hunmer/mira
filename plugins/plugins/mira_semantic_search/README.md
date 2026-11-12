# mira_semantic_search 语义搜索插件

基于 [Ollama](https://ollama.com) embedding 模型（默认 [embeddinggemma-2](https://ollama.com/library/embeddinggemma-2)）为素材建立向量索引，支持自然语言语义检索与「以图搜图」。

## 原理

### 文本语义搜索

- 索引内容：文件名、备注、标签、网址、元数据文本、所在文件夹名，按 EmbeddingGemma 2 规范拼接为
  `title: {标题} | text: {内容}` 后调用 Ollama `/api/embed` 生成向量。
- 查询文本加检索前缀 `task: search result | query: {query}` 生成查询向量，与索引向量做余弦相似度排序，返回 top K。

### 以图搜图（视觉模型打标方案）

Ollama `/api/embed` 仅支持文本输入（官方 openapi.yaml 无 `images` 字段），因此通过视觉模型转译：

- **索引时**：图片素材 → `/api/chat`（视觉模型 + base64 图片）生成中文描述 → 描述文本经 embeddinggemma-2
  嵌入 → 写入 `image_embedding` 列（`image_hash` 记录 `视觉模型 + 图片内容 sha1`，未变更自动跳过）。
- **搜索时**：上传图片或指定库内素材 → 同样打标 → 嵌入 → 与「图像向量 + 文本向量」两个集合比相似度，每文件取最高分。
- 文本搜索同样融合图像向量：文件名无语义的图片（如 `IMG_2041.jpg`）靠视觉描述即可被 "a cat" 之类文本召回。
- 查询/结果均带 `caption`（视觉描述），结果带 `via`（`text` / `image` 命中来源）。

### 存储与加速

- 向量存储在素材库数据库：`semantic_search_index` 表（source of truth：`embedding`=文本向量，
  `image_embedding`=图像向量，`image_caption`=视觉描述）+ 可选 vec0 虚拟表 ×2（sqlite-vec KNN 加速，
  失败自动回退内存扫描）。
- 支持 Matryoshka 维度截断（768 / 512 / 256 / 128）：优先 Ollama `dimensions` 参数，本地截断兜底。

### 自动增量同步

订阅库 `eventManager` 的 `file::created / file::updated / file::deleted` 事件，3 秒去抖聚批后自动重嵌入
变更素材（图片内容变更自动重打标）、清理已删素材。仅当索引非空时生效。

## 部署

```bash
ollama pull embeddinggemma-2   # 嵌入模型（必需）
ollama pull gemma3:4b          # 视觉模型（以图搜图可选，任意支持图像输入的模型）
```

Dashboard →「工具 → 语义搜索」：

1. 确认 API 地址（默认 `http://localhost:11434`），「测试嵌入」验证连通；
2. 需要以图搜图时填写视觉模型名并「测试视觉模型」；
3. 「开始索引」构建文本索引；开启视觉后可点「补建图像索引」仅为图片打标（不动文本索引）；
4. 文本框输入自然语言检索，或点「以图搜图」选择本地图片；结果项可「以此图搜索」（库内素材）。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/semantic-search/settings` | 读取配置 |
| POST | `/api/semantic-search/settings` | 保存配置 `{ apiUrl, model, dim, batchSize, vecIndex, visionModel, visionPrompt }` |
| POST | `/api/semantic-search/test` | 测试连通性（`{ vision: true }` 测视觉模型） |
| GET | `/api/semantic-search/status` | 索引状态、任务进度、vec/视觉/自动同步状态 |
| POST | `/api/semantic-search/index` | 启动/续跑索引 `{ force?, imagesOnly? }`（`imagesOnly` 仅补图像向量） |
| POST | `/api/semantic-search/stop` | 停止索引任务 |
| POST | `/api/semantic-search/search` | 文本搜索 `{ query, topK? }` |
| POST | `/api/semantic-search/search-image` | 以图搜图 `{ fileId }` 或 `{ imageBase64, topK? }` |

## 限制

- 图片需为服务器本地文件且 ≤ 15MB；URL 引用素材不参与视觉索引。
- 以图搜图质量取决于视觉模型描述能力（gemma3:4b 以上效果较好）；每图一次视觉调用，首次建索引较慢（后台任务）。
- 直接的多模态图像 embedding 待 Ollama `/api/embed` 支持 `images` 字段后可无缝切换（当前走打标转译）。

## 构建

```bash
npm install
npm run build   # tsc 编译 index.ts → dist/
```
