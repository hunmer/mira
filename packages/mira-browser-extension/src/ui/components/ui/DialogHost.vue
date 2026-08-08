<script setup lang="ts">
/**
 * 全局弹窗宿主:消费 useDialog 的模块级 state.current,渲染遮罩 + 居中卡片。
 *
 * 支持 alert / confirm / prompt 三态,由 state.kind 决定按钮与输入框。
 * 一次只显示一个弹窗(单例)。Teleport 到 body,避开父级 overflow 裁剪。
 * - 点遮罩 / ESC / 关闭× → 视为取消(alert 视为确定)
 * - 确认 → resolve(true / 输入值);取消 → resolve(false / null)
 */
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDialog } from '@/ui/composables/useDialog';
import Button from './Button.vue';
import Input from './Input.vue';

const { t } = useI18n();
const { state, _resolve } = useDialog();
const input = ref('');
// Input.vue 根元素就是 <input>,组件实例 $el 即输入框 DOM
const inputEl = ref<any>(null);

const dlg = computed(() => state.value);

// 弹窗打开(prompt)时:初始化输入值并聚焦
watch(
  () => dlg.value?.kind,
  async kind => {
    if (kind === 'prompt') {
      input.value = dlg.value?.defaultValue ?? '';
      await nextTick();
      (inputEl.value?.$el as HTMLInputElement | null)?.focus();
    }
  },
);

// 默认标题/按钮文案
const titleText = computed(() => {
  if (dlg.value?.title) return dlg.value.title;
  return t(`dialog.${dlg.value?.kind ?? 'alert'}`);
});
const okText = computed(() => dlg.value?.okText ?? t('dialog.ok'));
const cancelText = computed(() => dlg.value?.cancelText ?? t('dialog.cancel'));

// ---- 结果 ----
function onOk() {
  const k = dlg.value?.kind;
  if (k === 'prompt') _resolve(input.value);
  else if (k === 'confirm') _resolve(true);
  else _resolve(undefined);
}
function onCancel() {
  const k = dlg.value?.kind;
  if (k === 'prompt') _resolve(null);
  else _resolve(false);
}
function onMaskClick() {
  // 点遮罩:等同取消(alert 也按取消关掉即可)
  onCancel();
}
function onKey(e: KeyboardEvent) {
  if (!dlg.value) return;
  if (e.key === 'Escape') onCancel();
  // prompt:回车确认;confirm:回车确认(避免误触)
  if (e.key === 'Enter') onOk();
}
</script>

<template>
  <Teleport to="body">
    <div v-if="dlg" class="mask" @click.self="onMaskClick" @keydown="onKey">
      <div class="card" :class="{ danger: dlg.danger }">
        <div class="title">{{ titleText }}</div>
        <p v-if="dlg.message" class="msg">{{ dlg.message }}</p>
        <Input
          v-if="dlg.kind === 'prompt'"
          ref="inputEl"
          v-model="input"
          :placeholder="dlg.placeholder"
          @keydown.enter="onOk"
          @keydown.escape="onCancel"
        />
        <div class="ops">
          <!-- alert:仅一个确定按钮 -->
          <template v-if="dlg.kind === 'alert'">
            <Button size="sm" :variant="dlg.danger ? 'danger' : 'default'" @click="onOk">{{ okText }}</Button>
          </template>
          <template v-else>
            <Button size="sm" variant="outline" @click="onCancel">{{ cancelText }}</Button>
            <Button size="sm" :variant="dlg.danger ? 'danger' : 'default'" @click="onOk">{{ okText }}</Button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: #0008;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.card {
  width: 100%;
  max-width: 300px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 12px 36px #0008;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.title { font-size: 14px; font-weight: 600; color: var(--fg); }
.msg { margin: 0; font-size: 12px; color: var(--muted); white-space: pre-wrap; word-break: break-word; }
.ops { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
</style>
