/**
 * 语义搜索 - 客户端插件（随服务端 mira_semantic_search 分发）
 *
 * 职责：向宿主 FilterBar 注册语义搜索提供者（window.pluginSystem.filterSearchProviders）。
 * 用户在 FilterBar 输入自然语言 → 本插件调用服务端 /api/semantic-search/search →
 * 返回按相关性降序的素材 id 集合 → 宿主经 filter-change 链路写入 filterConditions.semantic，
 * 媒体列表按命中集合过滤并按相似度排序。
 *
 * 遵循客户端插件脚本契约（IIFE + registerPluginInstance + initialize/cleanup），
 * 见 docs/client-plugin-architecture.md。
 */
;(function () {
  var PLUGIN_ID = 'mira-semantic-search-filter'
  var PROVIDER_ID = 'mira-semantic-search:filter'

  // 必须在 IIFE 同步执行期间捕获脚本地址：initialize 工厂被宿主异步调用时
  // document.currentScript 已为 null，无法再解析服务端 origin
  var SCRIPT_URL = ''
  try {
    var scriptEl = document.currentScript
    SCRIPT_URL = (scriptEl && scriptEl.src) || ''
  } catch (e) { /* 保持空串，search 时给出可见错误 */ }

  function SemanticSearchPlugin(context) {
    this.api = context.api
    this.libraryId = ''
    this.apiBase = ''
    this.unregister = null
  }

  SemanticSearchPlugin.prototype.initialize = async function () {
    var self = this
    var config = this.api.config

    // 服务端分发插件的 config 携带所属素材库 id（PluginService.syncServerPlugins 注入）
    self.libraryId = String(config.get('libraryId') || '')

    // API 基址：宿主以 <script src> 注入本文件，从脚本地址解析服务端 origin
    if (SCRIPT_URL) {
      try { self.apiBase = new URL(SCRIPT_URL).origin } catch (e) { /* 忽略畸形 URL */ }
    }

    self.api.log.info('语义搜索 FilterBar 入口初始化 (libraryId=' + self.libraryId + ', apiBase=' + self.apiBase + ')')

    var registry = window.pluginSystem && window.pluginSystem.filterSearchProviders
    if (!registry || !registry.register) {
      self.api.log.warn('宿主未提供 filterSearchProviders 注册中心，FilterBar 入口不可用')
      return
    }

    self.unregister = registry.register({
      id: PROVIDER_ID,
      pluginId: PLUGIN_ID,
      label: '语义搜索',
      icon: 'manage_search',
      placeholder: '用自然语言描述要找的素材，如：海边日落的风景照',
      search: function (query) { return self.search(query) }
    })
  }

  SemanticSearchPlugin.prototype.search = async function (query) {
    var self = this
    if (!self.apiBase || !self.libraryId) {
      throw new Error('插件初始化不完整（服务端地址: ' + (self.apiBase || '缺失') +
        '，素材库: ' + (self.libraryId || '缺失') + '），请重启客户端后重试')
    }
    var url = self.apiBase + '/api/semantic-search/search?libraryId=' + encodeURIComponent(self.libraryId)
    var payload = await self.api.http.authPost(url, { query: query, topK: 50 })
    if (!payload || payload.success === false) {
      throw new Error((payload && payload.error) || '语义搜索请求失败')
    }
    var results = (payload.data && payload.data.results) || []
    return {
      fileIds: results.map(function (item) { return item.fileId }),
      message: payload.data.message || ''
    }
  }

  SemanticSearchPlugin.prototype.cleanup = async function () {
    if (this.unregister) {
      try { this.unregister() } catch (e) { /* 宿主清理竞态时忽略 */ }
      this.unregister = null
    }
  }

  async function initialize(context) {
    var plugin = new SemanticSearchPlugin(context)
    await plugin.initialize()
    return plugin
  }

  function setup() {
    if (window.pluginSystem && window.pluginSystem.registerPluginInstance) {
      window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
    } else {
      setTimeout(setup, 100)
    }
  }
  setup()
})()
