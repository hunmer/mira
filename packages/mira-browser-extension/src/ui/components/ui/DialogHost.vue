<script setup lang="ts">
/**
 * 全局弹窗宿主:消费 useDialog 的模块级 state.current,渲染遮罩 + 居中卡片。
 *
 * 支持 alert / confirm / prompt / confirmCheck 四态,由 state.kind 决定按钮与输入框。
 * confirmCheck 在正文下方多一个复选框(需 state.checkboxLabel),确认时带回勾选态。
 * 一次只显示一个弹窗(单例)。Teleport 到 body,避开父级 overflow 裁剪。
 * - 点遮罩 / ESC / 关闭× → 视为取消(alert 视为确定)
 * - 确认 → resolve(true / 输入值 / {ok,checked});取消 → resolve(false / null)
 */
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDialog } from '@/ui/composables/useDialog';
import Button from './Button.vue';
import Input from './Input.vue';

const { t } = useI18n();
const { state, _resolve } = useDialog();
const input = ref('');
const checked = ref(false);
// Input.vue 根元素就是 <input>,组件实例 $el 即输入框 DOM
const inputEl = ref<any>(null);

const dlg = computed(() => state.value);

// 弹窗打开时按 kind 初始化本地态
watch(
  () => dlg.value?.kind,
  async kind => {
    if (kind === 'prompt' || kind === 'textarea') {
      input.value = dlg.value?.defaultValue ?? '';
      await nextTick();
      (inputEl.value?.$el as HTMLInputElement | null)?.focus();
    }
    if (kind === 'confirmCheck') {
      checked.value = !!dlg.value?.checkboxChecked;
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
  if (k === 'prompt' || k === 'textarea') _resolve(input.value);
  else if (k === 'confirmCheck') _resolve({ ok: true, checked: checked.value });
  else if (k === 'confirm') _resolve(true);
  else _resolve(undefined);
}
function onCancel() {
  const k = dlg.value?.kind;
  if (k === 'prompt' || k === 'textarea') _resolve(null);
  else if (k === 'confirmCheck') _resolve({ ok: false, checked: checked.value });
  else _resolve(false);
}
function onMaskClick() {
  // 点遮罩:等同取消(alert 也按取消关掉即可)
  onCancel();
}
function onKey(e: KeyboardEvent) {
  if (!dlg.value) return;
  if (e.key === 'Escape') onCancel();
  // 单行输入回车确认;textarea 保留换行
  if (e.key === 'Enter' && dlg.value.kind !== 'textarea') onOk();
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
        <textarea
          v-if="dlg.kind === 'textarea'"
          v-model="input"
          class="editor"
          spellcheck="false"
          @keydown.escape="onCancel"
        />
        <!-- confirmCheck:复选框 -->
        <label v-if="dlg.checkboxLabel" class="check">
          <input v-model="checked" type="checkbox" />
          <span>{{ dlg.checkboxLabel }}</span>
        </label>
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
.msg { margin: 0; font-size: 12px; color: var(--muted-foreground); white-space: pre-wrap; word-break: break-word; }
.editor { min-height: 260px; resize: vertical; padding: 8px; background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: var(--radius); font: 12px/1.45 monospace; }
.check {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--fg); cursor: pointer; user-select: none;
}
.check input { accent-color: var(--primary); cursor: pointer; }
.ops { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
</style>
