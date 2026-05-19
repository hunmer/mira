/**
 * 缩略图管理组件 - 编译后的JS版本
 * 用于在 Mira Dashboard 中动态加载
 */

(function () {
    'use strict';

    // 确保全局命名空间存在
    if (!window.MiraPluginComponents) {
        window.MiraPluginComponents = {};
    }

    // 定义组件
    const ThumbnailManagerComponent = {
        name: 'ThumbnailManager',
        template: `
      <div class="thumbnail-manager p-6">
        <div class="header mb-8">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-2xl font-bold text-gray-800">缩略图管理</h2>
              <p class="text-gray-600 mt-1">管理和生成媒体文件缩略图</p>
            </div>
            <div class="header-actions flex items-center space-x-4">
              <button @click="refreshStats" 
                      :disabled="loading"
                      class="inline-flex items-center px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg"
                      style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);">
                <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-lg">🔄 刷新统计</span>
              </button>
              
              <button @click="startScan" 
                      :disabled="isScanning"
                      class="flex items-center justify-center px-6 py-3 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                      style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
                <svg v-if="isScanning" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-lg">{{ isScanning ? '正在扫描...' : '🔍 开始扫描' }}</span>
              </button>
              
              <button @click="cancelScan" 
                      :disabled="!isScanning"
                      class="px-6 py-3 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                      style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);">
                <span class="text-lg">⏹️ 取消扫描</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div class="text-white p-6 rounded-lg shadow-lg" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-3xl font-bold">{{ stats.totalFiles }}</div>
                <div class="text-blue-100 mt-1">总文件数</div>
              </div>
              <div class="text-4xl opacity-30">📁</div>
            </div>
          </div>
          
          <div class="text-white p-6 rounded-lg shadow-lg" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-3xl font-bold">{{ stats.withThumbnails }}</div>
                <div class="text-green-100 mt-1">已有缩略图</div>
              </div>
              <div class="text-4xl opacity-30">🖼️</div>
            </div>
          </div>
          
          <div class="text-white p-6 rounded-lg shadow-lg" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-3xl font-bold">{{ stats.withoutThumbnails }}</div>
                <div class="text-red-100 mt-1">缺失缩略图</div>
              </div>
              <div class="text-4xl opacity-30">❌</div>
            </div>
          </div>
          
          <div class="text-white p-6 rounded-lg shadow-lg" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-3xl font-bold">{{ progress.queueLength || stats.withoutThumbnails }}</div>
                <div class="text-orange-100 mt-1">剩余任务</div>
              </div>
              <div class="text-4xl opacity-30">�</div>
            </div>
          </div>
        </div>

        <!-- 缩略图操作面板 -->
        <div class="bg-white rounded-lg shadow-lg border border-gray-200 mb-6">
          <div class="p-8">
            <!-- 进度显示区域 -->
            <div v-if="progress.totalPending > 0" class="space-y-6">
              <div class="bg-gray-50 rounded-lg p-6">
                <div class="flex justify-between items-center mb-4">
                  <h4 class="text-lg font-semibold text-gray-800 flex items-center">
                    <span class="text-xl mr-2">📈</span>
                    处理进度
                  </h4>
                  <div class="text-right">
                    <div class="text-sm text-gray-600">进度: {{ progress.completed }} / {{ progress.totalPending }}</div>
                    <div class="text-2xl font-bold text-blue-600">{{ progress.progress }}%</div>
                  </div>
                </div>
                
                <!-- 进度条 -->
                <div class="relative w-full bg-gray-200 rounded-full h-4 mb-4 shadow-inner">
                  <div class="h-4 rounded-full transition-all duration-500 ease-out shadow-sm" 
                       :style="{ 
                         width: progress.progress + '%', 
                         background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%)'
                       }"></div>
                  <div class="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
                </div>
                
                <!-- 详细信息 -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                    <div class="text-lg font-semibold text-gray-800">{{ progress.totalPending }}</div>
                    <div class="text-sm text-gray-600">总任务</div>
                  </div>
                  <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                    <div class="text-lg font-semibold text-green-600">{{ progress.completed }}</div>
                    <div class="text-sm text-gray-600">已完成</div>
                  </div>
                  <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                    <div class="text-lg font-semibold text-orange-600">{{ progress.queueLength }}</div>
                    <div class="text-sm text-gray-600">队列中</div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-12">
              <div class="text-8xl mb-6">✅</div>
              <div class="text-xl text-gray-600 mb-2">暂无待处理的缩略图生成任务</div>
              <div class="text-gray-500">所有媒体文件的缩略图都已生成完成</div>
            </div>
          </div>
        </div>

        <!-- 实时日志 -->
        <div class="bg-white rounded-lg shadow-lg border border-gray-200">
          <div class="p-6 border-b border-gray-100" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
            <div class="flex justify-between items-center">
              <h3 class="text-xl font-semibold text-gray-800 flex items-center">
                <span class="text-2xl mr-3">📝</span>
                操作日志
              </h3>
              <button @click="clearLogs" 
                      class="text-sm px-4 py-2 text-white rounded-lg transition-all duration-200 hover:opacity-90 transform hover:scale-105 shadow-sm"
                      style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                🗑️ 清空日志
              </button>
            </div>
            <p class="text-gray-600 mt-2 text-sm">实时显示缩略图操作的详细日志信息</p>
          </div>
          <div class="p-6">
            <div class="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm max-h-80 overflow-y-auto shadow-inner" ref="logContainer">
              <div v-for="(log, index) in logs" :key="index" class="mb-1 hover:bg-gray-800 px-2 py-1 rounded transition-colors">
                <span class="text-gray-500">[{{ log.time }}]</span> 
                <span class="text-green-400">{{ log.message }}</span>
              </div>
              <div v-if="logs.length === 0" class="text-gray-500 text-center py-8">
                <div class="text-4xl mb-2">📋</div>
                <div>暂无操作日志...</div>
                <div class="text-xs mt-2">开始扫描后这里将显示详细的操作日志</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
        data() {
            return {
                loading: false,
                isScanning: false,
                stats: {
                    totalFiles: 0,
                    withThumbnails: 0,
                    withoutThumbnails: 0,
                    thumbnailRate: 0
                },
                progress: {
                    totalPending: 0,
                    queueLength: 0,
                    processing: false,
                    completed: 0,
                    progress: 0
                },
                logs: [],
                progressTimer: null
            };
        },
        mounted() {
            console.log('ThumbnailManager component mounted');
            this.refreshStats();
        },
        beforeDestroy() {
            // 清理定时器
            if (this.progressTimer) {
                clearInterval(this.progressTimer);
            }
        },
        methods: {
            // 获取库ID
            getLibraryId() {
            const path = window.location.href;
                const match = path.match(/\/mira\/library\/([^\/]+)/);
                if (match) {
                    return match[1];
                }
                return 'default';
            },

            // 添加日志
            addLog(message) {
                const now = new Date();
                this.logs.unshift({
                    time: now.toLocaleTimeString(),
                    message: message
                });
                // 只保留最近50条日志
                if (this.logs.length > 50) {
                    this.logs = this.logs.slice(0, 50);
                }
                // 滚动到最新日志
                this.$nextTick(() => {
                    if (this.$refs.logContainer) {
                        this.$refs.logContainer.scrollTop = 0;
                    }
                });
            },

            // 清空日志
            clearLogs() {
                this.logs = [];
                this.addLog('日志已清空');
            },

            // 刷新统计信息
            async refreshStats() {
                this.loading = true;
                try {
                    const response = await fetch(`http://127.0.0.1:8081/thumb/stats?libraryId=${this.getLibraryId()}`);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    const result = await response.json();
                    if (result.success) {
                        this.stats = result.data;
                        this.addLog(`统计信息已更新: 总文件 ${this.stats.totalFiles} 个，缩略图完成率 ${this.stats.thumbnailRate}%`);
                    }
                } catch (error) {
                    console.error('获取统计信息失败:', error);
                    this.addLog(`获取统计信息失败: ${error.message}`);
                } finally {
                    this.loading = false;
                }
            },

            // 开始扫描
            async startScan() {
                try {
                    const response = await fetch(`http://127.0.0.1:8081/thumb/scan?libraryId=${this.getLibraryId()}`);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    const result = await response.json();
                    if (result.success) {
                        this.isScanning = true;
                        this.addLog(result.message);
                        this.startProgressMonitoring();
                    }
                } catch (error) {
                    console.error('开始扫描失败:', error);
                    this.addLog(`开始扫描失败: ${error.message}`);
                }
            },

            // 取消扫描
            async cancelScan() {
                try {
                    const response = await fetch(`http://127.0.0.1:8081/thumb/cancel?libraryId=${this.getLibraryId()}`);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    const result = await response.json();
                    if (result.success) {
                        this.isScanning = false;
                        this.stopProgressMonitoring();
                        this.addLog(result.message);
                    }
                } catch (error) {
                    console.error('取消扫描失败:', error);
                    this.addLog(`取消扫描失败: ${error.message}`);
                }
            },

            // 开始监控进度
            startProgressMonitoring() {
                if (this.progressTimer) {
                    clearInterval(this.progressTimer);
                }

                this.progressTimer = setInterval(async () => {
                    try {
                        const response = await fetch(`http://127.0.0.1:8081/thumb/progress?libraryId=${this.getLibraryId()}`);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        const result = await response.json();
                        if (result.success) {
                            this.progress = result.data;

                            // 如果处理完成，停止监控
                            if (!this.progress.processing && this.progress.queueLength === 0) {
                                this.isScanning = false;
                                this.stopProgressMonitoring();
                                if (this.progress.progress === 100) {
                                    this.addLog('✅ 缩略图扫描任务已完成');
                                    // 刷新统计信息
                                    setTimeout(() => {
                                        this.refreshStats();
                                    }, 1000);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('获取进度失败:', error);
                        this.addLog(`获取进度失败: ${error.message}`);
                    }
                }, 1000); // 每秒更新一次进度
            },

            // 停止监控进度
            stopProgressMonitoring() {
                if (this.progressTimer) {
                    clearInterval(this.progressTimer);
                    this.progressTimer = null;
                }
            }
        }
    };

    // 注册组件到全局对象
    window.MiraPluginComponents.mira_thumb_components_ThumbnailManager_js = ThumbnailManagerComponent;

    // 如果有Vue实例，也可以全局注册
    if (window.Vue && window.Vue.component) {
        window.Vue.component('ThumbnailManager', ThumbnailManagerComponent);
    }

    console.log('ThumbnailManager component loaded and registered');
})();
