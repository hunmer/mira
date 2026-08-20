<script setup lang="ts">
/**
 * 薄包装:mira-plugin-ui/library 的 ServerManagerView + 扩展运行时注入。
 *
 * 组件本体(列表/表单/测试连接/切换激活/删除确认)在组件库中,
 * 删除确认走组件内置 AlertDialog;
 * 这里提供扩展侧依赖:settings 中的 servers 配置、background 数据服务、vue-i18n 文案。
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ServerManagerView as MiraServerManagerView } from 'mira-plugin-ui/library';
import { useServers } from '@/ui/composables/useServers';
import { useConnection } from '@/ui/composables/useConnection';

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { servers, activeServer, add, edit, remove, test } = useServers();
const { switchServer } = useConnection();

const activeServerId = computed(() => activeServer.value?.id ?? '');

// 扩展数据服务:settings 持久化 + background 桥;激活走 switchServer(含重登)
const services = {
  add,
  edit,
  remove,
  test,
  activate: switchServer,
};
</script>

<template>
  <MiraServerManagerView
    :servers="servers"
    :active-server-id="activeServerId"
    :services="services"
    :t="(key, params) => (t as any)(key, params)"
    @close="emit('close')"
  />
</template>
