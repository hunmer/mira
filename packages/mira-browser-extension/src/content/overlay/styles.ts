/**
 * content script 浮层共用样式注入器。
 *
 * dragdrop 浮层与「批量导入」对话框都跑在页面 DOM 里(非 Vue),共用同一套暗色风格。
 * 多次调用幂等(用 style id 去重)。z-index 与 selection.ts(最高)/ dragdrop 浮层对齐。
 */
export const OVERLAY_Z = 2147483646; // 仅次于选区覆盖层

let baseInjected = false;

/** 注入浮层基础样式(.mira-overlay / .mira-dropzone / .mira-folder-* 等)。 */
export function ensureOverlayStyles(): void {
  if (document.getElementById('mira-overlay-base-style')) {
    baseInjected = true;
    return;
  }
  baseInjected = true;
  const style = document.createElement('style');
  style.id = 'mira-overlay-base-style';
  style.textContent = `
.mira-overlay {
  position: fixed; left: 0; top: 0;
  z-index: ${OVERLAY_Z};
  width: min(440px, 92vw); max-height: 80vh;
  background: rgba(24,24,27,.96); color: #fafafa;
  border: 1px solid #3f3f46; border-radius: 12px;
  font: 13px/1.5 system-ui, -apple-system, sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
  display: flex; flex-direction: column; overflow: hidden;
  user-select: none;
  visibility: hidden;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity .16s ease-out, transform .16s ease-out;
}
.mira-overlay.mira-ready { visibility: visible; opacity: 1; transform: translateY(0); }
.mira-overlay-title { padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #3f3f46; }
.mira-overlay-body { display: flex; gap: 8px; padding: 12px; min-height: 0; }
.mira-dropzone {
  border: 2px dashed #52525b; border-radius: 8px;
  padding: 14px 10px; text-align: center; color: #a1a1aa;
  cursor: copy; transition: border-color .12s, background .12s, color .12s;
  flex-shrink: 0;
}
.mira-dropzone.mira-hover { border-color: #4ade80; background: rgba(74,222,128,.12); color: #fafafa; }
.mira-root { width: 130px; display: flex; align-items: center; justify-content: center; }
.mira-folder-list { flex: 1; display: flex; flex-direction: column; min-width: 0; border-left: 1px solid #3f3f46; padding-left: 8px; }
.mira-folder-list-title { font-size: 11px; color: #71717a; margin-bottom: 6px; text-transform: uppercase; }
.mira-folder-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; max-height: 50vh; }
.mira-folder-item { width: 100%; box-sizing: border-box; }
.mira-folder-scroll::-webkit-scrollbar { width: 6px; }
.mira-folder-scroll::-webkit-scrollbar-thumb { background: #52525b; border-radius: 3px; }
.mira-loading, .mira-empty { border: none; color: #71717a; padding: 8px; }

/* 浮层内的表单元素公共样式(新建文件夹输入/对话框按钮/输入框) */
.mira-overlay button {
  font: inherit; color: #fafafa; background: #27272a; border: 1px solid #3f3f46;
  border-radius: 6px; padding: 5px 10px; cursor: pointer; transition: background .12s, border-color .12s;
}
.mira-overlay button:hover { background: #3f3f46; }
.mira-overlay button.mira-primary { background: #4ade80; color: #052e16; border-color: #4ade80; font-weight: 600; }
.mira-overlay button.mira-primary:hover { background: #6ee7a3; }
.mira-overlay button.mira-ghost { background: transparent; border-color: transparent; color: #a1a1aa; }
.mira-overlay button.mira-ghost:hover { background: #27272a; color: #fafafa; }
.mira-overlay button:disabled { opacity: .5; cursor: not-allowed; }
.mira-overlay input[type=text], .mira-overlay textarea {
  font: inherit; color: #fafafa; background: #18181b;
  border: 1px solid #3f3f46; border-radius: 6px; padding: 6px 8px; outline: none;
  box-sizing: border-box; width: 100%;
}
.mira-overlay input[type=text]:focus { border-color: #4ade80; }
.mira-overlay .mira-error { color: #f87171; font-size: 12px; }
.mira-overlay .mira-hint { color: #71717a; font-size: 11px; }
`;
  document.documentElement.appendChild(style);
}
