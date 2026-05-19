<template>
  <div class="p-4">
    <!-- 页面标题和操作按钮 -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold ">管理员管理</h1>
        <p class="mt-1 text-sm ">管理系统管理员账户，包括创建、编辑和删除操作</p>
      </div>
      <Button type="primary" @click="showAddDialog = true">
        ➕ 添加管理员
      </Button>
    </div>

    <!-- 管理员列表 -->
    <Card>
      <Table
        :loading="loading"
        :dataSource="admins"
        :columns="columns"
        :pagination="{ pageSize: 10 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'username'">
            <div class="flex items-center space-x-3">
              <Avatar size="small">
                👤
              </Avatar>
              <span class="font-medium">{{ record.username }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'role'">
            <Tag color="blue">{{ record.role === 'admin' ? '管理员' : '用户' }}</Tag>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDate(record.updatedAt) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="flex space-x-2">
              <Button size="small" @click="editAdmin(record as User)">
                ✏️ 编辑
              </Button>
              <Button
                size="small"
                danger
                :disabled="record.id === currentUserId"
                @click="deleteAdmin(record as User)"
              >
                🗑️ 删除
              </Button>
            </div>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 添加/编辑管理员对话框 -->
    <Modal
      v-model:open="showAddDialog"
      :title="editingAdmin ? '编辑管理员' : '添加管理员'"
      width="500px"
      @cancel="closeDialog"
    >
      <Form
        ref="formRef"
        :model="adminForm"
        :rules="adminRules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <FormItem label="用户名" name="username">
          <Input
            v-model:value="adminForm.username"
            placeholder="请输入用户名"
            :disabled="!!editingAdmin"
          />
        </FormItem>

        <FormItem label="邮箱" name="email">
          <Input
            v-model:value="adminForm.email"
            placeholder="请输入邮箱地址"
            type="email"
          />
        </FormItem>

        <FormItem
          v-if="!editingAdmin"
          label="密码"
          name="password"
        >
          <InputPassword
            v-model:value="adminForm.password"
            placeholder="请输入密码"
          />
        </FormItem>

        <FormItem
          v-if="!editingAdmin"
          label="确认密码"
          name="confirmPassword"
        >
          <InputPassword
            v-model:value="adminForm.confirmPassword"
            placeholder="请确认密码"
          />
        </FormItem>
      </Form>

      <template #footer>
        <Button @click="closeDialog">取消</Button>
        <Button type="primary" :loading="submitting" @click="submitForm">
          确定
        </Button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form';
import type { TableColumnsType } from 'ant-design-vue';

import { onMounted, ref, computed } from 'vue';
import {
  Avatar,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputPassword,
  Modal,
  Table,
  Tag,
  message
} from 'ant-design-vue';

import type { User, CreateAdminForm } from '#/types/mira/auth';
import AdminApi from '#/api/mira/admin';

defineOptions({ name: 'MiraAdmin' });

const loading = ref(false);
const submitting = ref(false);
const showAddDialog = ref(false);
const editingAdmin = ref<User | null>(null);
const formRef = ref<FormInstance>();

// 模拟当前用户ID - 从session storage获取
const currentUserId = computed(() => {
  const userStr = sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.id;
    } catch {
      return null;
    }
  }
  return null;
});

const admins = ref<User[]>([]);

const adminForm = ref<CreateAdminForm>({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

// 表格列定义
const columns: TableColumnsType<User> = [
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: 200,
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
    width: 250,
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
  },
  {
    title: '最后更新',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 180,
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
  }
];

// 表单验证规则
const validatePasswordConfirm = (_rule: any, value: string) => {
  if (value !== adminForm.value.password) {
    return Promise.reject(new Error('两次输入的密码不一致'));
  }
  return Promise.resolve();
};

const adminRules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validatePasswordConfirm, trigger: 'blur' }
  ]
};

// 工具函数
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

const closeDialog = () => {
  showAddDialog.value = false;
  editingAdmin.value = null;
  adminForm.value = { username: '', email: '', password: '', confirmPassword: '' };
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// API操作
const loadAdmins = async () => {
  loading.value = true;
  try {
    admins.value = await AdminApi.getAdmins();
  } catch (error) {
    message.error('加载管理员列表失败');
    console.error('Failed to load admins:', error);
    admins.value = [];
  } finally {
    loading.value = false;
  }
};

const editAdmin = (admin: User) => {
  editingAdmin.value = admin;
  adminForm.value = {
    username: admin.username,
    email: admin.email,
    password: '',
    confirmPassword: ''
  };
  showAddDialog.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    await saveAdmin();
  } catch (error) {
    console.error('Form validation failed:', error);
  }
};

const saveAdmin = async () => {
  submitting.value = true;
  try {
    if (editingAdmin.value) {
      // 更新管理员（只更新邮箱）
      await AdminApi.updateAdmin(editingAdmin.value.id, {
        email: adminForm.value.email
      });
      message.success('管理员信息更新成功');
    } else {
      // 添加管理员
      const { confirmPassword, ...adminData } = adminForm.value;
      const response = await AdminApi.createAdmin(adminData);

      if (response.success) {
        message.success('管理员添加成功');
      }
    }

    closeDialog();
    await loadAdmins();
  } catch (error: any) {
    console.error('Save admin error:', error);

    // 处理特定的错误情况
    const errorMessage = error.response?.data?.message ||
                        error.response?.data?.error ||
                        error.message ||
                        '操作失败，请稍后重试';
    message.error(errorMessage);
  } finally {
    submitting.value = false;
  }
};

const deleteAdmin = async (admin: User) => {
  try {
    await new Promise<void>((resolve, reject) => {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除管理员 "${admin.username}" 吗？此操作不可撤销。`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => resolve(),
        onCancel: () => reject(new Error('用户取消操作'))
      });
    });

    await AdminApi.deleteAdmin(admin.id);
    message.success('管理员删除成功');
    await loadAdmins();
  } catch (error: any) {
    if (error.message !== '用户取消操作') {
      console.error('Delete admin error:', error);
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          '删除失败';
      message.error(errorMessage);
    }
  }
};

onMounted(() => {
  loadAdmins();
});
</script>

<style scoped>
/* 添加一些自定义样式 */
.p-4 {
  padding: 1rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.space-x-3 > * + * {
  margin-left: 0.75rem;
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.text-2xl {
  font-size: 1.5rem;
  line-height: 2rem;
}

.font-bold {
  font-weight: 700;
}

.text-gray-900 {
  color: #111827;
}

.mt-1 {
  margin-top: 0.25rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-gray-600 {
  color: #4b5563;
}

.font-medium {
  font-weight: 500;
}
</style>
