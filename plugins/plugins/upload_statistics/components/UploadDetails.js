/**
 * 上传详情组件 - 编译后的JS版本
 * 用于在 Mira Dashboard 中动态加载
 */

(function () {
    'use strict';

    // 确保全局命名空间存在
    if (!window.MiraPluginComponents) {
        window.MiraPluginComponents = {};
    }

    // 定义组件
    const UploadDetailsComponent = {
        name: 'UploadDetails',
        template: `
      <div class="upload-details p-6 ">
        <div class="details-header mb-6">
          <div class="flex justify-between items-center">
            <h2 class="text-2xl font-semibold m-0">上传详情</h2>
            <div class="header-actions">
              <button @click="refreshData" class="btn btn-secondary mr-2">
                🔄 刷新
              </button>
              <button @click="exportDetails" class="btn btn-primary">
                📤 导出详情
              </button>
            </div>
          </div>
        </div>

        <!-- 简单搜索表单 -->
        <div class="filter-form  p-4 rounded-lg shadow border border-gray-200 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
              <input 
                v-model="searchForm.username" 
                @input="handleSearch"
                type="text" 
                placeholder="输入用户名过滤"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">文件名</label>
              <input 
                v-model="searchForm.filename" 
                @input="handleSearch"
                type="text" 
                placeholder="输入文件名过滤"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input 
                v-model="searchForm.startDate" 
                @change="handleSearch"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
              <input 
                v-model="searchForm.endDate" 
                @change="handleSearch"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div class="mt-4 flex justify-end space-x-2">
            <button 
              @click="resetSearch"
              class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              重置
            </button>
            <button 
              @click="handleSearch"
              class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              查询
            </button>
          </div>
        </div>

        <div class="details-content">
          <!-- 数据表格 -->
          <div class=" rounded-lg shadow border border-gray-200">
            <div class="p-4 border-b">
              <h3 class="text-lg font-semibold text-gray-800">上传详情列表</h3>
            </div>
            
            <div v-if="loading" class="text-center py-12">
              <div class="loading-spinner inline-block">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
              <div class="mt-4 text-gray-600">正在加载数据...</div>
            </div>
            
            <div v-else-if="error" class="p-4 text-center text-red-600">
              <p>{{ error }}</p>
              <button @click="loadData" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                重试
              </button>
            </div>
            
            <div v-else>
              <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                  <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 cursor-pointer hover:bg-gray-100" @click="sortBy('name')">
                        文件名
                        <span v-if="sortField === 'name'" class="ml-1">
                          {{ sortOrder === 'asc' ? '↑' : '↓' }}
                        </span>
                      </th>
                      <th class="px-6 py-3">上传者</th>
                      <th class="px-6 py-3 cursor-pointer hover:bg-gray-100" @click="sortBy('size')">
                        文件大小
                        <span v-if="sortField === 'size'" class="ml-1">
                          {{ sortOrder === 'asc' ? '↑' : '↓' }}
                        </span>
                      </th>
                      <th class="px-6 py-3 cursor-pointer hover:bg-gray-100" @click="sortBy('created_at')">
                        上传时间
                        <span v-if="sortField === 'created_at'" class="ml-1">
                          {{ sortOrder === 'asc' ? '↑' : '↓' }}
                        </span>
                      </th>
                      <th class="px-6 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in paginatedData" :key="row.id" class=" border-b hover:bg-gray-50">
                      <td class="px-6 py-4 font-medium text-gray-900">{{ row.name }}</td>
                      <td class="px-6 py-4">
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {{ row.uploader || '未知用户' }}
                        </span>
                      </td>
                      <td class="px-6 py-4">{{ formatSize(row.size) }}</td>
                      <td class="px-6 py-4">{{ formatDate(row.created_at) }}</td>
                      <td class="px-6 py-4">
                        <div class="space-x-1">
                          <button @click="viewFile(row)" class="mr-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-blue-600">
                            查看
                          </button>
                          <button @click="downloadFile(row)" class="mr-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-green-600">
                            下载
                          </button>
                          <button @click="deleteFile(row)" class="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-red-600">
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- 分页 -->
              <div class="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
                <div class="text-sm text-gray-700">
                  显示 {{ startIndex + 1 }} 到 {{ Math.min(endIndex, filteredData.length) }} 条，共 {{ filteredData.length }} 条记录
                </div>
                <div class="flex space-x-2">
                  <button 
                    @click="currentPage = Math.max(1, currentPage - 1)"
                    :disabled="currentPage === 1"
                    class="px-3 py-1  border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span class="px-3 py-1 text-sm">第 {{ currentPage }} / {{ totalPages }} 页</span>
                  <button 
                    @click="currentPage = Math.min(totalPages, currentPage + 1)"
                    :disabled="currentPage === totalPages"
                    class="px-3 py-1  border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
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
                rawData: [],
                searchForm: {
                    username: '',
                    filename: '',
                    startDate: '',
                    endDate: ''
                },
                sortField: '',
                sortOrder: 'asc',
                currentPage: 1,
                pageSize: 10,
                debounceTimer: null
            };
        },
        computed: {
            filteredData() {
                let filtered = this.rawData;

                // 应用搜索过滤
                if (this.searchForm.username) {
                    filtered = filtered.filter(item =>
                        (item.uploader || '').toLowerCase().includes(this.searchForm.username.toLowerCase())
                    );
                }

                if (this.searchForm.filename) {
                    filtered = filtered.filter(item =>
                        (item.name || '').toLowerCase().includes(this.searchForm.filename.toLowerCase())
                    );
                }

                if (this.searchForm.startDate) {
                    filtered = filtered.filter(item =>
                        new Date(item.created_at) >= new Date(this.searchForm.startDate)
                    );
                }

                if (this.searchForm.endDate) {
                    filtered = filtered.filter(item =>
                        new Date(item.created_at) <= new Date(this.searchForm.endDate + ' 23:59:59')
                    );
                }

                // 应用排序
                if (this.sortField) {
                    filtered.sort((a, b) => {
                        let aVal = a[this.sortField];
                        let bVal = b[this.sortField];

                        if (this.sortField === 'size') {
                            aVal = Number(aVal) || 0;
                            bVal = Number(bVal) || 0;
                        } else if (this.sortField === 'created_at') {
                            aVal = new Date(aVal);
                            bVal = new Date(bVal);
                        }

                        if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
                        if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
                        return 0;
                    });
                }

                return filtered;
            },

            totalPages() {
                return Math.ceil(this.filteredData.length / this.pageSize);
            },

            startIndex() {
                return (this.currentPage - 1) * this.pageSize;
            },

            endIndex() {
                return this.startIndex + this.pageSize;
            },

            paginatedData() {
                return this.filteredData.slice(this.startIndex, this.endIndex);
            }
        },
        mounted() {
            this.loadData();
        },
        methods: {
            // 加载数据
            async loadData() {
                try {
                    this.loading = true;
                    this.error = null;

                    const libraryId = this.getLibraryId();
                    const params = new URLSearchParams({ libraryId });

                    const response = await fetch(`http://127.0.0.1:8081/upload_statistics/list?${params}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    this.rawData = Array.isArray(result) ? result : (result.data || []);
                } catch (error) {
                    console.error('加载数据失败:', error);
                    this.error = '加载数据失败: ' + error.message;
                } finally {
                    this.loading = false;
                }
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

            // 处理搜索
            handleSearch() {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.currentPage = 1; // 重置到第一页
                }, 300);
            },

            // 重置搜索
            resetSearch() {
                this.searchForm = {
                    username: '',
                    filename: '',
                    startDate: '',
                    endDate: ''
                };
                this.currentPage = 1;
            },

            // 排序
            sortBy(field) {
                if (this.sortField === field) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortField = field;
                    this.sortOrder = 'asc';
                }
            },

            refreshData() {
                this.loadData();
            },

            exportDetails() {
                const dataToExport = {
                    uploadDetails: this.filteredData,
                    exportTime: new Date().toISOString(),
                    totalRecords: this.filteredData.length
                };

                const dataStr = JSON.stringify(dataToExport, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `upload-details-${new Date().toISOString().split('T')[0]}.json`;
                link.click();

                URL.revokeObjectURL(url);
            },

            // 文件操作方法
            viewFile(file) {
                alert(`查看文件: ${file.name} (ID: ${file.id})`);
                // 这里可以实现文件预览功能
            },

            downloadFile(file) {
                alert(`下载文件: ${file.name} (ID: ${file.id})`);
                // 这里可以实现文件下载功能
            },

            async deleteFile(file) {
                if (!confirm(`确定要删除文件 "${file.name}" 吗？此操作不可恢复。`)) {
                    return;
                }

                try {
                    // 这里需要实现删除API调用
                    alert(`删除文件功能需要后端API支持: ${file.name}`);
                    // const response = await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
                    // if (response.ok) {
                    //   this.refreshData();
                    // }
                } catch (error) {
                    alert(`删除失败: ${error.message}`);
                }
            },

            // 格式化方法
            formatSize(bytes) {
                if (!bytes) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            },

            formatDate(dateString) {
                if (!dateString) return '未知时间';
                const date = new Date(dateString);
                return date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        }
    };

    // 注册组件到全局对象
    window.MiraPluginComponents.upload_statistics_components_UploadDetails_js = UploadDetailsComponent;

    // 如果有Vue实例，也可以全局注册
    if (window.Vue && window.Vue.component) {
        window.Vue.component('UploadDetails', UploadDetailsComponent);
    }

    console.log('UploadDetails component loaded and registered');
})();
