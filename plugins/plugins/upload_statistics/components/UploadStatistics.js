/**
 * 上传统计组件 - 编译后的JS版本
 * 用于在 Mira Dashboard 中动态加载
 */

(function () {
  'use strict';

  // 确保全局命名空间存在
  if (!window.MiraPluginComponents) {
    window.MiraPluginComponents = {};
  }

  // 定义组件
  const UploadStatisticsComponent = {
    name: 'UploadStatistics',
    template: `
      <div class="upload-statistics p-6 ">
        <div class="stats-header mb-6">
          <div class="flex justify-between items-center">
            <h2 class="text-2xl font-semibold m-0">上传统计</h2>
            <div class="header-actions">
              <button @click="refreshData" class="btn btn-secondary mr-2">
                🔄 刷新
              </button>
              <button @click="exportStatistics" class="btn btn-primary">
                📊 导出统计
              </button>
            </div>
          </div>
        </div>

        <!-- 简单筛选表单 -->
        <div class="filter-form  p-4 rounded-lg shadow border border-gray-200 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">日期范围</label>
              <div class="flex space-x-2">
                <input 
                  v-model="filters.startDate" 
                  @change="fetchStats"
                  type="date"
                  placeholder="开始日期"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span class="self-center text-gray-500">至</span>
                <input 
                  v-model="filters.endDate" 
                  @change="fetchStats"
                  type="date"
                  placeholder="结束日期"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div class="flex items-end">
              <button 
                @click="clearFilters"
                class="px-4 py-2 bg-primary text-white rounded-md transition-colors mr-2"
              >
                清除筛选
              </button>
              <button 
                @click="fetchStats"
                class="px-4 py-2 bg-primary text-white rounded-md transition-colors"
              >
                查询
              </button>
            </div>
          </div>
        </div>

        <div v-if="loading" class="text-center py-12">
          <div class="loading-spinner inline-block">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
          <div class="mt-4 text-gray-600">正在加载统计数据...</div>
        </div>

        <div v-else-if="error" class="alert alert-error mb-4">
          <span class="alert-icon">⚠️</span>
          <div class="alert-content">
            <div class="alert-title">加载失败</div>
            <div class="alert-description">{{ error }}</div>
            <div class="mt-2">
              <button @click="fetchStatistics" class="btn btn-primary btn-sm">重试</button>
            </div>
          </div>
        </div>

        <div v-else class="stats-content">
          <!-- 统计卡片 -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div class="stats-card text-white p-6 rounded-lg shadow-lg" style="background: linear-gradient(to right, #3b82f6, #1d4ed8);">
              <div class="flex justify-between items-start">
                <div>
                  <div class="text-3xl font-bold">{{ totalFiles }}</div>
                  <div class="text-blue-100 mt-1">总文件数</div>
                </div>
                <div class="text-4xl opacity-30">📁</div>
              </div>
            </div>
            
            <div class="stats-card text-white p-6 rounded-lg shadow-lg" style="background: linear-gradient(to right, #10b981, #059669);">
              <div class="flex justify-between items-start">
                <div>
                  <div class="text-3xl font-bold">{{ totalSize }}</div>
                  <div class="text-green-100 mt-1">总大小</div>
                </div>
                <div class="text-4xl opacity-30">💾</div>
              </div>
            </div>
            
            <div class="stats-card text-white p-6 rounded-lg shadow-lg" style="background: linear-gradient(to right, #8b5cf6, #7c3aed);">
              <div class="flex justify-between items-start">
                <div>
                  <div class="text-3xl font-bold">{{ totalUsers }}</div>
                  <div class="text-purple-100 mt-1">活跃用户</div>
                </div>
                <div class="text-4xl opacity-30">👥</div>
              </div>
            </div>
            
            <div class="stats-card text-white p-6 rounded-lg shadow-lg" style="background: linear-gradient(to right, #f59e0b, #d97706);">
              <div class="flex justify-between items-start">
                <div>
                  <div class="text-3xl font-bold">{{ averageFileSize }}</div>
                  <div class="text-orange-100 mt-1">平均文件大小</div>
                </div>
                <div class="text-4xl opacity-30">📊</div>
              </div>
            </div>
          </div>

          <!-- 图表和排行榜 -->
          <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <!-- 上传趋势图表 -->
            <div class="xl:col-span-2">
              <div class="card bg-white rounded-lg shadow border border-gray-200">
                <div class="card-header p-4 border-b">
                  <div class="card-title text-lg font-semibold">上传趋势</div>
                </div>
                <div class="card-body p-4">
                  <div ref="uploadTrendChart" class="w-full h-80 bg-gray-50" style="min-height: 320px;"></div>
                </div>
              </div>
            </div>

            <!-- 用户排行榜 -->
            <div class="xl:col-span-1">
              <div class="card  rounded-lg shadow border border-gray-200">
                <div class="card-header p-4 border-b">
                  <div class="card-title text-lg font-semibold">用户排行榜</div>
                </div>
                <div class="card-body p-4">
                  <div class="ranking-list space-y-2">
                    <div v-for="(user, index) in topUsers" :key="user.username" 
                         class="ranking-item flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                      <div class="flex items-center">
                        <div class="ranking-position text-lg font-bold mr-3 w-8 h-8 rounded-full flex items-center justify-center text-white"
                             :class="getRankingClass(index)">
                          {{ index + 1 }}
                        </div>
                        <div>
                          <div class="username font-medium">{{ user.username }}</div>
                          <div class="upload-count text-sm text-gray-500">{{ user.fileCount }} 个文件</div>
                        </div>
                      </div>
                      <div class="upload-size text-sm font-medium text-blue-600">
                        {{ formatSize(user.totalSize) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 文件类型分布图表 -->
          <div class="mt-6">
            <div class="card bg-white rounded-lg shadow border border-gray-200">
              <div class="card-header p-4 border-b">
                <div class="card-title text-lg font-semibold">文件类型分布</div>
              </div>
              <div class="card-body p-4">
                <div ref="fileTypeChart" class="w-full h-80 bg-gray-50" style="min-height: 320px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    data() {
      return {
        loading: false,
        error: null,
        statisticsData: [],
        userRankings: [],
        stats: {
          totalFiles: 0,
          totalSize: 0,
          totalUsers: 0,
          averageFileSize: 0
        },
        topUsers: [],
        filters: {
          startDate: '',
          endDate: ''
        },
        debounceTimer: null
      };
    },
    computed: {
      totalFiles() {
        return this.statisticsData.length;
      },
      totalSize() {
        const total = this.statisticsData.reduce((sum, file) => sum + (file.size || 0), 0);
        return this.formatSize(total);
      },
      totalUsers() {
        const users = new Set(this.statisticsData.map(file => file.uploader).filter(Boolean));
        return users.size;
      },
      averageFileSize() {
        if (this.statisticsData.length === 0) return this.formatSize(0);
        const total = this.statisticsData.reduce((sum, file) => sum + (file.size || 0), 0);
        return this.formatSize(total / this.statisticsData.length);
      }
    },
    mounted() {
      console.log('UploadStatistics component mounted');
      this.fetchStats();

      // 尝试预加载ECharts
      this.loadECharts().catch(console.error);
    },
    beforeDestroy() {
      // 清理图表实例
      if (this.$refs.uploadTrendChart && window.echarts) {
        const trendChart = window.echarts.getInstanceByDom(this.$refs.uploadTrendChart);
        if (trendChart) trendChart.dispose();
      }
      if (this.$refs.fileTypeChart && window.echarts) {
        const typeChart = window.echarts.getInstanceByDom(this.$refs.fileTypeChart);
        if (typeChart) typeChart.dispose();
      }
    },
    methods: {
      // Refresh data
      refreshData() {
        this.fetchStats();
      },

      // Export statistics
      exportStatistics() {
        this.exportData();
      },

      // Get ranking CSS class
      getRankingClass(index) {
        const classes = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-400'];
        return classes[index] || 'bg-blue-500';
      },

      // Generate trend values for display
      getTrendValues() {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dates.push(date.toLocaleDateString('zh-CN'));
        }

        return dates.map(date => {
          return this.statisticsData.filter(file => {
            const fileDate = new Date(file.created_at).toLocaleDateString('zh-CN');
            return fileDate === date;
          }).length;
        });
      },

      // Get top users for display  
      getTopUsers() {
        return this.topUsers.slice(0, 5).map(user => ({
          name: user.username,
          count: user.fileCount
        }));
      },

      // 渲染图表
      async renderCharts() {
        // 确保 ECharts 可用
        if (typeof window.echarts === 'undefined') {
          console.warn('ECharts not loaded, trying to load...');
          try {
            await this.loadECharts();
          } catch (error) {
            console.error('Failed to load ECharts:', error);
            return;
          }
        }

        // 等待DOM更新完成
        await this.$nextTick();

        // 延迟一点确保元素完全渲染
        setTimeout(() => {
          this.renderTrendChart();
          this.renderFileTypeChart();
        }, 100);
      },

      // 动态加载 ECharts
      async loadECharts() {
        return new Promise((resolve, reject) => {
          if (typeof window.echarts !== 'undefined') {
            console.log('ECharts already loaded');
            resolve(window.echarts);
            return;
          }

          console.log('Loading ECharts from CDN...');
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
          script.onload = () => {
            console.log('ECharts loaded successfully');
            resolve(window.echarts);
          };
          script.onerror = (error) => {
            console.error('Failed to load ECharts:', error);
            reject(error);
          };
          document.head.appendChild(script);
        });
      },

      // 渲染趋势图
      renderTrendChart() {
        console.log('Starting renderTrendChart...');

        if (!this.$refs.uploadTrendChart) {
          console.error('uploadTrendChart ref not found');
          return;
        }

        if (typeof window.echarts === 'undefined') {
          console.error('ECharts not available');
          return;
        }

        try {
          // 销毁已存在的图表实例
          const existingChart = window.echarts.getInstanceByDom(this.$refs.uploadTrendChart);
          if (existingChart) {
            existingChart.dispose();
          }

          const chart = window.echarts.init(this.$refs.uploadTrendChart);
          const trendData = this.getTrendValues();
          const trendDates = this.getTrendDates();

          console.log('Trend data:', trendData);
          console.log('Trend dates:', trendDates);

          const option = {
            title: {
              text: '最近7天上传趋势',
              left: 'center',
              textStyle: { fontSize: 16, fontWeight: 'normal' }
            },
            tooltip: {
              trigger: 'axis',
              formatter: '{b}: {c} 个文件'
            },
            xAxis: {
              type: 'category',
              data: trendDates,
              axisLabel: { rotate: 45 }
            },
            yAxis: {
              type: 'value',
              name: '文件数量'
            },
            series: [{
              name: '上传数量',
              type: 'line',
              data: trendData,
              smooth: true,
              symbol: 'circle',
              symbolSize: 6,
              itemStyle: { color: '#3b82f6' },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                    { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
                  ]
                }
              }
            }],
            grid: { top: 60, right: 20, bottom: 60, left: 40 }
          };

          chart.setOption(option);
          console.log('Trend chart rendered successfully');

          // 响应式调整 - 移除旧的监听器，添加新的
          const resizeHandler = () => chart.resize();
          window.removeEventListener('resize', resizeHandler);
          window.addEventListener('resize', resizeHandler);
        } catch (error) {
          console.error('Error rendering trend chart:', error);
        }
      },

      // 渲染文件类型分布图
      renderFileTypeChart() {
        console.log('Starting renderFileTypeChart...');

        if (!this.$refs.fileTypeChart) {
          console.error('fileTypeChart ref not found');
          return;
        }

        if (typeof window.echarts === 'undefined') {
          console.error('ECharts not available');
          return;
        }

        try {
          // 销毁已存在的图表实例
          const existingChart = window.echarts.getInstanceByDom(this.$refs.fileTypeChart);
          if (existingChart) {
            existingChart.dispose();
          }

          const chart = window.echarts.init(this.$refs.fileTypeChart);
          const fileTypeData = this.getFileTypeData();

          console.log('File type data:', fileTypeData);

          const option = {
            title: {
              text: '文件类型分布',
              left: 'center',
              textStyle: { fontSize: 16, fontWeight: 'normal' }
            },
            tooltip: {
              trigger: 'item',
              formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
              orient: 'vertical',
              left: 'left',
              top: 'middle'
            },
            series: [{
              name: '文件类型',
              type: 'pie',
              radius: ['30%', '70%'],
              center: ['60%', '50%'],
              data: fileTypeData,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              label: {
                formatter: '{b}: {d}%'
              }
            }],
            color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']
          };

          chart.setOption(option);
          console.log('File type chart rendered successfully');

          // 响应式调整
          const resizeHandler = () => chart.resize();
          window.removeEventListener('resize', resizeHandler);
          window.addEventListener('resize', resizeHandler);
        } catch (error) {
          console.error('Error rendering file type chart:', error);
        }
      },

      // 获取趋势日期
      getTrendDates() {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dates.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        }
        return dates;
      },

      // 获取文件类型数据
      getFileTypeData() {
        const typeStats = {};
        this.statisticsData.forEach(file => {
          const ext = file.name ? file.name.split('.').pop()?.toUpperCase() || '其他' : '其他';
          typeStats[ext] = (typeStats[ext] || 0) + 1;
        });

        return Object.entries(typeStats)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8); // 只显示前8种类型
      },

      getLibraryId() {
        // 尝试从URL路径中提取库ID
        const path = window.location.pathname;
        const match = path.match(/\/mira\/library\/([^\/]+)/);
        if (match) {
          return match[1];
        }

        // 如果没有找到，使用默认值
        return 'default';
      },

      async fetchStats() {
        this.loading = true;
        this.error = null;

        try {
          const params = new URLSearchParams();
          if (this.filters.startDate) params.append('startDate', this.filters.startDate);
          if (this.filters.endDate) params.append('endDate', this.filters.endDate);

          // 添加库ID参数
          const libraryId = this.getLibraryId();
          params.append('libraryId', libraryId);

          const response = await fetch(`http://127.0.0.1:8081/upload_statistics/list?${params}`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          this.statisticsData = await response.json();
          this.generateUserRankings();
          this.renderCharts();
        } catch (error) {
          this.error = error.message;
          console.error('获取统计数据失败:', error);
        } finally {
          this.loading = false;
        }
      },

      generateUserRankings() {
        const userStats = {};

        this.statisticsData.forEach(file => {
          const uploader = file.uploader || '未知用户';
          if (!userStats[uploader]) {
            userStats[uploader] = { fileCount: 0, totalSize: 0 };
          }
          userStats[uploader].fileCount++;
          userStats[uploader].totalSize += file.size || 0;
        });

        this.topUsers = Object.entries(userStats)
          .map(([username, stats]) => ({
            username,
            ...stats
          }))
          .sort((a, b) => b.fileCount - a.fileCount)
          .slice(0, 10); // 只显示前10名

        // 保持原有的userRankings格式以兼容旧模板
        this.userRankings = this.topUsers.map(user => ({
          username: user.username,
          count: user.fileCount,
          totalSize: user.totalSize
        }));
      },

      clearFilters() {
        this.filters = {
          startDate: '',
          endDate: ''
        };
        this.fetchStats();
      },

      async exportData() {
        try {
          const dataToExport = {
            统计概要: {
              总文件数: this.totalFiles,
              总大小: this.totalSize,
              活跃用户: this.totalUsers,
              平均文件大小: this.averageFileSize
            },
            用户排行: this.topUsers,
            原始数据: this.statisticsData,
            导出时间: new Date().toISOString()
          };

          const dataStr = JSON.stringify(dataToExport, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(dataBlob);

          const link = document.createElement('a');
          link.href = url;
          link.download = `upload_statistics_${new Date().toISOString().split('T')[0]}.json`;
          link.click();

          URL.revokeObjectURL(url);
        } catch (error) {
          alert(`数据导出失败: ${error.message}`);
        }
      },

      formatSize(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
      },

      debounce(func, wait) {
        return (...args) => {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => func.apply(this, args), wait);
        };
      }
    }
  };

  // 注册组件到全局对象
  window.MiraPluginComponents.upload_statistics_components_UploadStatistics_js = UploadStatisticsComponent;

  // 如果有Vue实例，也可以全局注册
  if (window.Vue && window.Vue.component) {
    window.Vue.component('UploadStatistics', UploadStatisticsComponent);
  }

  console.log('UploadStatistics component loaded and registered');
})();
