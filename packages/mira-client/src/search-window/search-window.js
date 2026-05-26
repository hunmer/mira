/**
 * 搜索窗口专用入口文件 (Vue版本)
 * 使用全局Vue变量加载GlobalSearchContent组件
 */

// 等待DOM和Vue加载完成
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // 移除加载提示
    const loadingEl = document.querySelector('.loading')
    if (loadingEl) {
      loadingEl.style.display = 'none'
    }
    
    // 检查Vue是否已加载
    if (typeof Vue === 'undefined') {
      showError('Vue框架未正确加载')
      return
    }
    
  
    await initSearchWindow()
  } catch (error) {
    console.error('搜索窗口初始化失败:', error)
    showError('搜索窗口初始化失败: ' + error.message)
  }
})

/**
 * 初始化搜索窗口Vue应用
 */
async function initSearchWindow() {
  try {
    const { createApp } = Vue
    
    const app = createApp({
      data() {
        return {
          searchKeyword: '',
          searchResults: [],
          allResults: [],       // 所有搜索结果
          isSearching: false,
          activeTab: 'files',
          searchTimeout: null,  // 防抖定时器
          selectedIndex: -1,    // 选中的搜索结果索引
          messagePort: null,    // MessagePort 通信端口
          // 分页相关
          currentPage: 1,
          pageSize: 10,
          availableTabs: [
            { id: 'files', title: '文件', icon: 'insert_drive_file' },
            { id: 'tags', title: '标签', icon: 'label' },
            { id: 'folders', title: '文件夹', icon: 'folder' }
          ]
        }
      },
      computed: {
        // 计算分页后的搜索结果
        paginatedResults() {
          const start = (this.currentPage - 1) * this.pageSize
          const end = start + this.pageSize
          return this.allResults.slice(start, end)
        },
        // 总页数
        totalPages() {
          return Math.ceil(this.allResults.length / this.pageSize)
        },
        // 分页信息
        paginationInfo() {
          const start = (this.currentPage - 1) * this.pageSize + 1
          const end = Math.min(start + this.pageSize - 1, this.allResults.length)
          return `${start}-${end} / ${this.allResults.length}`
        }
      },
      template: `
        <div class="search-window-container">
          <!-- 搜索内容区域 -->
          <div class="search-content">
            <div class="search-dialog">
              <!-- iOS风格拖拽条 - 内嵌到对话框顶部 -->
              <div 
                class="drag-handle"
                @mousedown="handleDragStart"
                @touchstart="handleDragStart"
                title="拖拽移动窗口"
              >
                <div class="drag-indicator"></div>
              </div>
              
              <!-- 搜索头部 -->
              <div class="search-header">
                <div class="search-input-container">
                  <span class="material-icons search-icon">{{ getCurrentTabIcon() }}</span>
                  <input 
                    ref="searchInput"
                    v-model="searchKeyword"
                    class="search-input"
                    placeholder="搜索 (支持拼音、模糊关键字)"
                    type="text"
                    @keydown="handleSearchInputKeydown"
                    @input="handleSearchInput"
                  />
                </div>
                <!-- 头部加载状态 -->
                <div v-if="isSearching" class="header-loading">
                  <div class="header-loading-spinner"></div>
                </div>
                <button 
                  class="close-button"
                  @click="handleClose"
                  title="清除搜索"
                >
                  <span class="material-icons">{{ searchKeyword.trim() ? 'clear' : 'close' }}</span>
                </button>
              </div>

              <!-- Tab切换区域 -->
              <div class="search-tabs">
                <button
                  v-for="tab in availableTabs"
                  :key="tab.id"
                  :class="['tab-button', { 'active': activeTab === tab.id }]"
                  @click="setActiveTab(tab.id)"
                >
                  <span class="material-icons tab-icon">{{ tab.icon }}</span>
                  {{ tab.title }}
                </button>
              </div>

              <!-- 搜索结果区域 -->
              <div class="search-results">
                <!-- 搜索结果列表 -->
                <div v-if="allResults.length > 0" class="results-list">
                  <div
                    v-for="(item, index) in paginatedResults"
                    :key="index"
                    :class="['result-item', { 'selected': selectedIndex === index }]"
                    :data-file="item.localFile"
                    :draggable="!!item.localFile"
                    @click="handleItemClick(item)"
                    @mouseenter="selectedIndex = index"
                    @dragstart="handleDragStart($event, item)"
                  >
                    <!-- 文件缩略图或图标 -->
                    <img 
                      v-if="item.thumbnail && item.type === 'file'"
                      :src="item.thumbnail"
                      class="result-thumbnail"
                      :alt="item.title"
                      @error="handleThumbnailError"
                    />
                    <span 
                      v-else
                      class="material-icons result-icon"
                    >{{ getResultIcon(item.type) }}</span>
                    
                    <div class="result-content">
                      <div class="result-title">{{ item.title }}</div>
                      <div class="result-path">{{ formatResultSubtitle(item) }}</div>
                    </div>
                    <div v-if="item.size || item.itemCount || item.count" class="result-meta">
                      <span v-if="item.size" class="meta-item">{{ item.size }}</span>
                      <span v-if="item.itemCount" class="meta-item">{{ item.itemCount }} 项</span>
                      <span v-if="item.count" class="meta-item">{{ item.count }} 个文件</span>
                    </div>
                  </div>
                </div>

                <!-- 空状态 -->
                <div v-else-if="searchKeyword.trim()" class="empty-state">
                  <span class="material-icons empty-icon">search_off</span>
                  <p class="empty-title">未找到"{{ searchKeyword }}"的结果</p>
                  <p class="empty-subtitle">尝试使用不同的关键词或切换搜索类型</p>
                </div>

                <!-- 初始状态 -->
                <div v-else class="initial-state">
                  <span class="material-icons initial-icon">{{ getCurrentTabIcon() }}</span>
                  <p class="initial-title">开始搜索</p>
                  <p class="initial-subtitle">输入关键词搜索{{ getCurrentTabTitle() }}</p>
                </div>
              </div>

              <!-- 键盘快捷键提示和分页 -->
              <div class="search-footer">
                <div class="shortcuts">
                  <div class="shortcut">
                    <span>切换</span>
                    <kbd>Tab</kbd>
                  </div>
                  <div class="shortcut">
                    <span>移动</span>
                    <kbd>↑</kbd>
                    <kbd>↓</kbd>
                  </div>
                  <div class="shortcut">
                    <span>选中</span>
                    <kbd>↵</kbd>
                  </div>
                </div>
                
                <!-- 分页控件 -->
                <div v-if="allResults.length > pageSize" class="pagination">
                  <button 
                    class="pagination-button"
                    :disabled="currentPage <= 1"
                    @click="goToPage(currentPage - 1)"
                  >
                    ‹
                  </button>
                  <span class="pagination-info">{{ paginationInfo }}</span>
                  <button 
                    class="pagination-button"
                    :disabled="currentPage >= totalPages"
                    @click="goToPage(currentPage + 1)"
                  >
                    ›
                  </button>
                </div>
                
                <div class="shortcut">
                  <span>关闭/清除</span>
                  <kbd>ESC</kbd>
                </div>
                <div class="shortcut">
                  <span>开发工具</span>
                  <kbd>F12</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      mounted() {
        // 设置全局键盘事件监听
        document.addEventListener('keydown', this.handleGlobalKeyDown)
        
        // 监听窗口失去焦点事件
        window.addEventListener('blur', this.handleWindowBlur)
        
        // 防止右键菜单和拖拽
        document.addEventListener('contextmenu', (e) => e.preventDefault())
        document.addEventListener('dragover', (e) => e.preventDefault())
        document.addEventListener('drop', (e) => e.preventDefault())
        
        // 监听来自主进程的MessagePort连接
        window.addEventListener('message', (event) => {
          // 检查是否是connect消息且包含搜索端口
          if (event.data?.role === 'search' && event.ports?.[0]) {
            console.log('🔗 设置MessagePort...')
            this.setupMessagePort(event.ports[0])
          }
        })
        
        // 自动聚焦搜索框
        this.$nextTick(() => {
          if (this.$refs.searchInput) {
            this.$refs.searchInput.focus()
          }
        })
      },
      beforeUnmount() {
        // 清理事件监听器
        document.removeEventListener('keydown', this.handleGlobalKeyDown)
        window.removeEventListener('blur', this.handleWindowBlur)
        
        // 关闭MessagePort连接
        if (this.messagePort) {
          this.messagePort.close()
          this.messagePort = null
        }
      },
      methods: {
        setupMessagePort(port) {
          this.messagePort = port
          this.messagePort.start()
          
          // 监听来自主进程的消息
          this.messagePort.onmessage = (event) => {
            this.handleMessage(event)
          }
          
          // 通知主进程搜索窗口已准备就绪
          this.messagePort.postMessage({
            type: 'search-window-ready',
            timestamp: Date.now()
          })
          
          console.log('✅ 搜索窗口MessagePort连接已建立')
        },
        handleDragStart(event) {
          // 通过MessagePort发送拖拽开始请求
          if (this.messagePort) {
            this.messagePort.postMessage({
              type: 'drag-start',
              timestamp: Date.now()
            })
          }
        },
        handleGlobalKeyDown(event) {
          // ESC 键清除搜索或关闭窗口
          if (event.key === 'Escape') {
            this.handleClose()
          }

          // Ctrl/Cmd + W 关闭窗口
          if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
            event.preventDefault()
            this.hideSearchWindow()
          }

          // F12 打开开发者工具
          if (event.key === 'F12') {
            event.preventDefault()
            if (this.messagePort) {
              this.messagePort.postMessage({
                type: 'toggle-devtools',
                timestamp: Date.now()
              })
            }
          }
        },
        handleSearchInput() {
          // 清除之前的定时器
          if (this.searchTimeout) {
            clearTimeout(this.searchTimeout)
          }
          
          // 使用防抖处理搜索请求
          if (this.searchKeyword.trim()) {
            this.searchTimeout = setTimeout(() => {
              this.isSearching = true
              this.selectedIndex = -1  // 重置选中索引
              this.currentPage = 1     // 重置到第一页
              // 不清空现有结果，等获取到新结果再更新
              this.sendSearchRequest(this.searchKeyword, this.activeTab)
            }, 300) // 300ms防抖延迟
          } else {
            this.allResults = []
            this.isSearching = false
            this.selectedIndex = -1
            this.currentPage = 1
          }
        },
        sendSearchRequest(keyword, type) {
          console.log('📤 [SearchWindow] 发送搜索请求:', { keyword, type })

          // 通过MessagePort发送搜索请求
          if (this.messagePort) {
            const searchRequest = {
              type: 'search-request',
              keyword: keyword,
              searchType: type,
              timestamp: Date.now()
            }
            console.log('📤 [SearchWindow] 搜索请求数据:', searchRequest)
            this.messagePort.postMessage(searchRequest)
          } else {
            console.error('❌ [SearchWindow] MessagePort未初始化')
          }
        },
        handleMessage(event) {
          console.log('🔥 [SearchWindow] 收到主进程消息:', event)
          console.log('🔥 [SearchWindow] 消息数据:', event.data)

          // 处理来自主进程的消息
          if (event.data && event.data.type === 'search-results') {
            console.log('🔍 [SearchWindow] 收到搜索结果:', event.data.results)
            console.log('🔍 [SearchWindow] 结果数量:', event.data.results?.length || 0)

            // 只有在有结果或者明确的空结果时才更新
            this.isSearching = false
            this.allResults = event.data.results || []
            this.currentPage = 1  // 重置到第一页
            this.selectedIndex = -1  // 重置选中索引

            console.log('✅ [SearchWindow] 已更新搜索结果，当前结果数:', this.allResults.length)
          } else if (event.data && event.data.type === 'search-error') {
            this.isSearching = false
            this.selectedIndex = -1  // 重置选中索引
            console.error('❌ [SearchWindow] 搜索错误:', event.data.error)
            // 可以显示错误提示
          } else {
            console.log('ℹ️ [SearchWindow] 收到其他类型消息:', event.data?.type)
          }
        },
        handleSearchInputKeydown(event) {
          if (event.key === 'Escape') {
            event.preventDefault()
            this.handleClose()
          } else if (event.key === 'Enter') {
            event.preventDefault()
            if (this.selectedIndex >= 0 && this.paginatedResults[this.selectedIndex]) {
              // 打开选中的搜索结果
              this.handleItemClick(this.paginatedResults[this.selectedIndex])
            } else if (this.searchKeyword.trim()) {
              // 如果没有选中项，触发搜索
              console.log('执行搜索:', this.searchKeyword)
              this.handleSearchInput()
            }
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (this.paginatedResults.length > 0) {
              this.selectedIndex = Math.min(this.selectedIndex + 1, this.paginatedResults.length - 1)
            }
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            if (this.paginatedResults.length > 0) {
              this.selectedIndex = Math.max(this.selectedIndex - 1, -1)
            }
          }
        },
        setActiveTab(tabId) {
          this.activeTab = tabId
          this.selectedIndex = -1  // 重置选中索引
          this.currentPage = 1     // 重置到第一页
          // 如果有搜索内容，重新搜索；否则不清空结果
          if (this.searchKeyword.trim()) {
            this.handleSearchInput()
          } else {
            // 没有搜索内容时才清空结果
            this.allResults = []
          }
        },
        getCurrentTabTitle() {
          const tab = this.availableTabs.find(t => t.id === this.activeTab)
          return tab ? tab.title : '内容'
        },
        getCurrentTabIcon() {
          const tab = this.availableTabs.find(t => t.id === this.activeTab)
          return tab ? tab.icon : 'search'
        },
        getResultIcon(type) {
          switch (type) {
            case 'file':
              return 'insert_drive_file'
            case 'folder':
              return 'folder'
            case 'tag':
              return 'label'
            default:
              return 'description'
          }
        },
        formatResultSubtitle(item) {
          if (item.path) {
            return item.path
          } else if (item.type === 'tag') {
            return `标签 - ${item.count || 0} 个文件`
          } else {
            return item.modifiedTime || '未知时间'
          }
        },
        handleItemClick(item) {
          console.log('点击搜索结果:', item)
          
          // 通过MessagePort发送打开请求
          if (this.messagePort) {
            this.messagePort.postMessage({
              type: 'open-item',
              item: JSON.parse(JSON.stringify(item)), // 深拷贝防止结构化克隆错误
              timestamp: Date.now()
            })
          }
          
          // 关闭搜索窗口
          this.hideSearchWindow()
        },
        handleClose() {
          // 如果有搜索内容，清除搜索；否则关闭窗口
          if (this.searchKeyword.trim()) {
            this.searchKeyword = ''
            this.allResults = []
            this.isSearching = false
            this.selectedIndex = -1
            this.currentPage = 1
            // 重新聚焦搜索框
            this.$nextTick(() => {
              if (this.$refs.searchInput) {
                this.$refs.searchInput.focus()
              }
            })
          } else {
            this.hideSearchWindow()
          }
        },
        handleWindowBlur() {
          // 窗口失去焦点时关闭窗口
          // this.hideSearchWindow()
        },
        handleThumbnailError(event) {
          // 缩略图加载失败时，隐藏图片元素
          event.target.style.display = 'none'
        },
        goToPage(page) {
          if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page
            this.selectedIndex = -1  // 重置选中索引
          }
        },
        hideSearchWindow() {
          // 通过MessagePort请求关闭搜索窗口
          if (this.messagePort) {
            this.messagePort.postMessage({
              type: 'close-search',
              timestamp: Date.now()
            })
          }
        },
        handleDragStart(event, item) {
          console.log('🖱️ [SearchWindow] 拖拽开始:', item)

          const localFile = item.localFile
          if (!localFile) {
            console.warn('⚠️ [SearchWindow] 项目没有本地文件路径，取消拖拽')
            event.preventDefault()
            return
          }

          console.log('📁 [SearchWindow] 拖拽文件路径:', localFile)

          // 阻止默认拖拽行为，我们将通过消息传递给主窗口处理
          event.preventDefault()

          // 通过MessagePort请求父窗口处理拖拽
          if (this.messagePort) {
            this.messagePort.postMessage({
              type: 'drag-file',
              filePath: localFile,
              fileName: item.title,
              timestamp: Date.now()
            })
            console.log('📤 [SearchWindow] 已发送拖拽请求到主窗口')
          } else {
            console.error('❌ [SearchWindow] MessagePort不可用，无法处理拖拽')
          }
        }
      }
    })

    // 挂载应用到DOM
    const searchApp = document.getElementById('search-app')
    app.mount(searchApp)
    
    console.log('✅ 搜索窗口Vue应用初始化完成')
  } catch (error) {
    console.error('搜索窗口初始化失败:', error)
    showError('搜索窗口初始化失败')
  }
}

/**
 * 显示错误信息
 */
function showError(message) {
  const searchApp = document.getElementById('search-app')
  if (searchApp) {
    searchApp.innerHTML = `
      <div style="
        padding: 2rem;
        text-align: center;
        color: #EF4444;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        background: transparent;
      ">
        <span class="material-icons" style="font-size: 4rem; margin-bottom: 1rem;">error</span>
        <h3 style="margin: 0 0 1rem 0; color: #d1d5db;">搜索窗口错误</h3>
        <p style="margin: 0; color: #9CA3AF;">${message}</p>
      </div>
    `
  }
}
