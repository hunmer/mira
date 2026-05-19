<
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  message,
  Modal,
  Statistic,
  Table,
  Tag,
  Textarea,
} from 'ant-design-vue';

import miraApiClient from '#/api/mira/client';

defineOptions({ name: 'MiraDeviceManager' });

// 接口定义
interface Device {
  id: string;
  name: string;
  ip: string;
  port: number;
  type: string;
  status: 'connecting' | 'offline' | 'online';
  lastConnectedAt?: string;
  deviceInfo?: string;
  connecting?: boolean;
}

interface DeviceMessage {
  id: string;
  deviceId: string;
  type: 'received' | 'sent';
  content: string;
  timestamp: string;
}

// 响应式数据
const loading = ref(false);
const connecting = ref(false);
const showDetailModal = ref(false);
const selectedDevice = ref<Device | null>(null);
const testMessage = ref('');
const devices = ref<Device[]>([]);
const deviceMessages = ref<DeviceMessage[]>([]);
const wsConnection = ref<null | WebSocket>(null);

// 设备列表表格列定义
const deviceColumns = [
  {
    title: '设备名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: 'IP地址',
    dataIndex: 'ip',
    key: 'ip',
    width: 150,
  },
  {
    title: '端口',
    dataIndex: 'port',
    key: 'port',
    width: 100,
  },
  {
    title: '设备类型',
    dataIndex: 'type',
    key: 'type',
    width: 120,
  },
  {
    title: '连接状态',
    key: 'status',
    width: 120,
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
  },
];

// 计算属性
const deviceStats = computed(() => {
  // 确保 devices.value 是数组
  const deviceArray = Array.isArray(devices.value) ? devices.value : [];
  const total = deviceArray.length;
  const online = deviceArray.filter((d) => d.status === 'online').length;

  return { total, online };
});

// 方法
const refreshDevices = async () => {
  loading.value = true;
  try {
    const response = await miraApiClient.get('/devices');
    // 处理新的数据结构：从对象中提取所有设备数组
    const responseData = response.data?.data || {};
    const allDevices: Device[] = [];

    // 遍历所有 libraryId 键，合并设备数组
    Object.values(responseData).forEach((deviceArray: any) => {
      if (Array.isArray(deviceArray)) {
        deviceArray.forEach((device: any) => {
          allDevices.push({
            id: device.clientId,
            name: device.clientId, // 使用 clientId 作为名称
            ip: device.ipAddress?.replace('::ffff:', '') || 'Unknown', // 清理IPv6前缀
            port: 0, // API中没有端口信息
            type: device.userAgent || 'Unknown',
            status: device.status === 'connected' ? 'online' : 'offline',
            lastConnectedAt: device.lastActivity,
            deviceInfo: `Library: ${device.libraryId}`,
          });
        });
      }
    });

    devices.value = allDevices;
  } catch (error) {
    message.error('获取设备列表失败');
    console.error('Failed to load devices:', error);
    devices.value = [];
  } finally {
    loading.value = false;
  }
};

const connectDevice = async (device: Device) => {
  device.connecting = true;
  try {
    await miraApiClient.post(`/devices/${device.id}/connect`);
    message.success(`正在连接设备 ${device.name}`);
    // 更新设备状态
    device.status = 'connecting';
  } catch (error) {
    message.error(`连接设备失败: ${device.name}`);
    console.error('Failed to connect device:', error);
  } finally {
    device.connecting = false;
  }
};

const disconnectDevice = async (device: Device) => {
  try {
    await miraApiClient.post(`/devices/${device.id}/disconnect`);
    message.success(`已断开设备 ${device.name}`);
    device.status = 'offline';
  } catch (error) {
    message.error(`断开设备失败: ${device.name}`);
    console.error('Failed to disconnect device:', error);
  }
};

const connectAllDevices = async () => {
  connecting.value = true;
  try {
    await miraApiClient.post('/devices/connect-all');
    message.success('正在连接所有设备');
    // 更新所有离线设备状态为连接中
    devices.value.forEach((device) => {
      if (device.status === 'offline') {
        device.status = 'connecting';
      }
    });
  } catch (error) {
    message.error('连接所有设备失败');
    console.error('Failed to connect all devices:', error);
  } finally {
    connecting.value = false;
  }
};

const disconnectAllDevices = async () => {
  try {
    await miraApiClient.post('/devices/disconnect-all');
    message.success('已断开所有设备连接');
    // 更新所有设备状态为离线
    devices.value.forEach((device) => {
      device.status = 'offline';
    });
  } catch (error) {
    message.error('断开所有设备失败');
    console.error('Failed to disconnect all devices:', error);
  }
};

const sendTestMessage = async (device: Device) => {
  try {
    await miraApiClient.post(`/devices/${device.id}/test`);
    message.success(`测试消息已发送到 ${device.name}`);
  } catch (error) {
    message.error(`发送测试消息失败: ${device.name}`);
    console.error('Failed to send test message:', error);
  }
};

const viewDeviceDetail = async (device: Device) => {
  selectedDevice.value = device;
  showDetailModal.value = true;

  // 加载设备消息历史
  try {
    const response = await miraApiClient.get(`/devices/${device.id}/messages`);
    deviceMessages.value = response.data || [];
  } catch (error) {
    console.error('Failed to load device messages:', error);
    deviceMessages.value = [];
  }
};

const sendCustomMessage = async () => {
  if (!selectedDevice.value || !testMessage.value.trim()) {
    message.warning('请输入要发送的消息');
    return;
  }

  try {
    await miraApiClient.post(`/devices/${selectedDevice.value.id}/message`, {
      content: testMessage.value,
    });
    message.success('消息发送成功');
    testMessage.value = '';

    // 添加到消息历史
    deviceMessages.value.unshift({
      id: Date.now().toString(),
      deviceId: selectedDevice.value.id,
      type: 'sent',
      content: testMessage.value,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    message.error('发送消息失败');
    console.error('Failed to send custom message:', error);
  }
};

// 工具方法
const getStatusColor = (status: string) => {
  switch (status) {
    case 'connecting': {
      return 'orange';
    }
    case 'offline': {
      return 'red';
    }
    case 'online': {
      return 'green';
    }
    default: {
      return 'default';
    }
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'connecting': {
      return '连接中';
    }
    case 'offline': {
      return '离线';
    }
    case 'online': {
      return '在线';
    }
    default: {
      return '未知';
    }
  }
};

const formatTime = (timeString?: string) => {
  if (!timeString) return '无';
  return new Date(timeString).toLocaleString('zh-CN');
};

// 生命周期
onMounted(() => {
  refreshDevices();
});

onUnmounted(() => {
  if (wsConnection.value) {
    wsConnection.value.close();
  }
});
</script>

<template>
  <div class="p-4">
    <!-- 页面标题和操作按钮 -->
    <div class="header-section">
      <div>
        <h1 class="page-title">设备管理器</h1>
        <p class="page-description">实时监控和管理连接的设备</p>
      </div>
      <div class="header-actions">
        <Button @click="refreshDevices"> 刷新设备 </Button>
        <Button type="primary" @click="connectAllDevices" :loading="connecting">
          连接所有设备
        </Button>
        <Button danger @click="disconnectAllDevices"> 断开所有连接 </Button>
      </div>
    </div>

    <!-- 设备统计卡片 -->
    <div class="stats-grid">
      <Card size="small">
        <Statistic
          title="总设备数"
          :value="deviceStats.total"
          :value-style="{ color: '#1890ff' }"
          prefix="📱"
        />
      </Card>
      <Card size="small">
        <Statistic
          title="在线设备"
          :value="deviceStats.online"
          :value-style="{ color: '#52c41a' }"
          prefix="🟢"
        />
      </Card>
    </div>

    <!-- 设备列表 -->
    <Card title="设备列表" class="device-list-card">
      <Table
        :loading="loading"
        :data-source="devices"
        :columns="deviceColumns"
        :pagination="{ pageSize: 10 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="action-buttons">
              <Button
                v-if="record.status === 'offline'"
                size="small"
                type="primary"
                @click="connectDevice(record as Device)"
                :loading="record.connecting"
              >
                连接
              </Button>
              <Button
                v-else
                size="small"
                danger
                @click="disconnectDevice(record as Device)"
              >
                断开
              </Button>
              <Button
                size="small"
                @click="sendTestMessage(record as Device)"
                :disabled="record.status !== 'online'"
              >
                测试
              </Button>
              <Button size="small" @click="viewDeviceDetail(record as Device)">
                详情
              </Button>
            </div>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 设备详情对话框 -->
    <Modal
      v-model:open="showDetailModal"
      :title="`设备详情: ${selectedDevice?.name}`"
      width="800px"
    >
      <div v-if="selectedDevice" class="device-detail">
        <Descriptions :column="2" bordered>
          <DescriptionsItem label="设备名称">
            {{ selectedDevice.name }}
          </DescriptionsItem>
          <DescriptionsItem label="设备ID">
            {{ selectedDevice.id }}
          </DescriptionsItem>
          <DescriptionsItem label="IP地址">
            {{ selectedDevice.ip }}
          </DescriptionsItem>
          <DescriptionsItem label="端口">
            {{ selectedDevice.port }}
          </DescriptionsItem>
          <DescriptionsItem label="设备类型">
            {{ selectedDevice.type }}
          </DescriptionsItem>
          <DescriptionsItem label="连接状态">
            <Tag :color="getStatusColor(selectedDevice.status)">
              {{ getStatusText(selectedDevice.status) }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="最后连接时间">
            {{ formatTime(selectedDevice.lastConnectedAt) }}
          </DescriptionsItem>
          <DescriptionsItem label="设备信息">
            {{ selectedDevice.deviceInfo || '无' }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 消息发送区域 -->
        <div class="message-section">
          <h4>发送消息</h4>
          <div class="message-input-group">
            <Textarea
              v-model:value="testMessage"
              :rows="3"
              placeholder="输入要发送的测试消息..."
            />
            <Button
              type="primary"
              @click="sendCustomMessage"
              :disabled="selectedDevice.status !== 'online'"
              class="send-button"
            >
              发送
            </Button>
          </div>
        </div>

        <!-- 最近消息历史 -->
        <div class="message-history">
          <h4>消息历史</h4>
          <div class="message-list">
            <div
              v-for="msg in deviceMessages"
              :key="msg.id"
              class="message-item"
              :class="msg.type"
            >
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
              <div class="message-content">{{ msg.content }}</div>
            </div>
            <div v-if="deviceMessages.length === 0" class="no-messages">
              暂无消息记录
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.p-4 {
  padding: 1rem;
}

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 2rem;
}

.page-description {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.device-list-card {
  margin-bottom: 1rem;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.device-detail {
  max-height: 600px;
  overflow-y: auto;
}

.message-section {
  padding-top: 1rem;
  margin-top: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.message-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  margin-top: 0.5rem;
}

.send-button {
  flex-shrink: 0;
}

.message-history {
  padding-top: 1rem;
  margin-top: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.message-list {
  max-height: 200px;
  padding: 0.5rem;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.message-item {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.message-item.sent {
  text-align: right;
}

.message-time {
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
}

.message-content {
  word-break: break-word;
}

.no-messages {
  padding: 1rem;
  text-align: center;
}

h4 {
  margin-bottom: 0.5rem;
  font-weight: 600;
}
</style>
