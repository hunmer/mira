/**
 * 基于 Promise 的弹窗 composable:alert / confirm / prompt。
 *
 * 替代浏览器原生 alert/confirm/prompt(后者在扩展环境/iframe 里体验差、样式不一致)。
 * 模块级单例 state:同一时刻只展示一个弹窗;调用方 await 结果。
 *
 * 用法:
 *   const dialog = useDialog();
 *   if (!(await dialog.confirm({ message: '确定删除?' }))) return;
 *   const name = await dialog.prompt({ message: '名称', defaultValue: 'x' });
 *   await dialog.alert({ message: '失败:xxx' });
 *
 * 实际 DOM 渲染由 <DialogHost>(挂在 App.vue 顶层)消费 state.current 完成。
 */
import { ref } from 'vue';

export type DialogKind = 'alert' | 'confirm' | 'prompt' | 'confirmCheck';

export interface DialogOptions {
  /** 标题(可选,缺省用 kind 默认标题) */
  title?: string;
  /** 正文/提示 */
  message?: string;
  /** 仅 prompt:输入框默认值 */
  defaultValue?: string;
  /** 仅 prompt:输入框 placeholder */
  placeholder?: string;
  /** 确认按钮文案(可选) */
  okText?: string;
  /** 取消按钮文案(可选) */
  cancelText?: string;
  /** 确认按钮是否用危险色(删除场景) */
  danger?: boolean;
  /** 复选框文案;提供则在正文下方渲染一个复选框(见 confirmCheck) */
  checkboxLabel?: string;
  /** 复选框默认勾选状态(默认 false) */
  checkboxChecked?: boolean;
}

interface DialogState extends DialogOptions {
  kind: DialogKind;
  /** resolve 当前 promise(true/false/value/{ok,checked}) */
  resolve: (v: any) => void;
}

/** confirmCheck 的返回:取消为 null,否则带 ok + 复选框终值 */
export interface ConfirmCheckResult {
  ok: boolean;
  checked: boolean;
}

/** 当前弹窗;为 null 表示无弹窗。DialogHost 据此渲染。 */
const current = ref<DialogState | null>(null);

/** 结束当前弹窗并 resolve 结果 */
function done(value: any) {
  const c = current.value;
  if (!c) return;
  current.value = null;
  c.resolve(value);
}

export function useDialog() {
  function alert(options: DialogOptions): Promise<void> {
    return new Promise<void>(resolve => {
      current.value = { kind: 'alert', ...options, resolve: () => resolve() };
    });
  }

  function confirm(options: DialogOptions): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      current.value = { kind: 'confirm', ...options, resolve: (ok: boolean) => resolve(ok) };
    });
  }

  /** 返回输入值;取消返回 null */
  function prompt(options: DialogOptions): Promise<string | null> {
    return new Promise<string | null>(resolve => {
      current.value = { kind: 'prompt', ...options, resolve: (v: string | null) => resolve(v) };
    });
  }

  /**
   * 带复选框的确认弹窗:正文下方渲染一个复选框(需提供 checkboxLabel)。
   * 返回 { ok, checked };点取消/遮罩/ESC 时 ok=false 并带回当前勾选态。
   * 用于「删除文件夹? ☐ 同时删除其中的文件」这种合并二次确认的场景。
   */
  function confirmCheck(options: DialogOptions): Promise<ConfirmCheckResult> {
    return new Promise<ConfirmCheckResult>(resolve => {
      current.value = {
        kind: 'confirmCheck',
        ...options,
        resolve: (r: ConfirmCheckResult) => resolve(r),
      };
    });
  }

  return {
    /** 当前弹窗 state(供 DialogHost 读) */
    state: current,
    alert,
    confirm,
    prompt,
    confirmCheck,
    /** 内部:DialogHost 点确定/取消/关闭时调用 */
    _resolve: done,
  };
}
