/**
 * content script 内的「批量导入」通用对话框(纯 DOM,共用 .mira-overlay 暗色风格)。
 *
 * 触发入口:
 *  - 右键菜单「从选中批量导入」→ 由 content script 从 window.getSelection().toString()
 *    提取 URL,再调用本对话框
 *
 * 功能:
 *  - URL 列表(可逐条删除 / 整体清空)
 *  - 文件夹单选(含「不使用文件夹」+ 列表项 + 「➕ 新建文件夹」内联输入)
 *  - 标签多选(chip)
 *  - 提交 → 调用方提供的 onImport,逐条按现有 UPLOAD_FROM_URL 路径上传
 *
 * 数据获取(getFolders / getTags / createFolder)均由调用方注入,内部不直接与 background 通信,
 * 便于测试与解耦。
 */
import type { Folder, Tag } from 'mira-app-core/shared/sdk';
import { dbg } from '@/shared/debug';
import { ensureOverlayStyles, OVERLAY_Z } from './styles';

export interface ImportDialogPayload {
  urls: string[];
  folderId?: number;
  tags: string[];
  referrer?: string;
}

export interface ImportDialogHandlers {
  getFolders: () => Promise<Folder[] | null>;
  getTags: () => Promise<Tag[] | null>;
  createFolder: (title: string) => Promise<number | null>;
  onImport: (payload: ImportDialogPayload) => void;
}

export interface ImportDialogOptions extends ImportDialogHandlers {
  /** 初始 URL 列表 */
  urls: string[];
  /** referrer(通常为 location.href) */
  referrer?: string;
}

/**
 * 从一段文本中提取 http(s) URL(空白分隔)。
 * - 仅返回 URL;调用方可在此基础上做扩展过滤
 * - 单独导出便于单元测试
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const re = /https?:\/\/[^\s<>"')]+/gi;
  const out = text.match(re) ?? [];
  // 去重保序
  const seen = new Set<string>();
  const result: string[] = [];
  for (const u of out) {
    // 去掉末尾常见标点(. , ; ! ? ))
    const clean = u.replace(/[.,;:!?)\]]+$/, '');
    if (!seen.has(clean)) { seen.add(clean); result.push(clean); }
  }
  return result;
}

let dialogStyleInjected = false;
function ensureDialogStyles() {
  if (dialogStyleInjected) return;
  dialogStyleInjected = true;
  const style = document.createElement('style');
  style.id = 'mira-import-dialog-style';
  style.textContent = `
.mira-import-dialog { width: min(560px, 94vw); max-height: 86vh; }
.mira-import-dialog .mira-overlay-title { display: flex; align-items: center; justify-content: space-between; }
.mira-import-dialog .mira-overlay-title .close-x {
  background: transparent; border: none; color: #a1a1aa; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;
}
.mira-import-dialog .mira-overlay-title .close-x:hover { color: #fafafa; }
.mira-import-content {
  padding: 12px 14px; display: flex; flex-direction: column; gap: 12px;
  overflow-y: auto; min-height: 0; flex: 1;
}
.mira-import-section { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.mira-import-section-label { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: .04em; }
.mira-import-urls { display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto; padding-right: 2px; }
.mira-import-url-row {
  display: flex; align-items: center; gap: 8px; padding: 4px 6px;
  border: 1px solid #3f3f46; border-radius: 6px; background: #18181b;
}
.mira-import-url-row img { width: 32px; height: 32px; object-fit: cover; border-radius: 4px; flex-shrink: 0; background: #27272a; }
.mira-import-url-row .url-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.mira-import-url-row .url-broken { display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; background: #27272a; border-radius: 4px; flex-shrink: 0; color: #71717a; }
.mira-import-url-row .remove-btn { background: transparent; border: none; color: #a1a1aa; cursor: pointer; padding: 0 6px; font-size: 16px; line-height: 1; }
.mira-import-url-row .remove-btn:hover { color: #f87171; }
.mira-import-empty { color: #71717a; font-size: 12px; padding: 8px; text-align: center; }
.mira-import-folder-list { display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto; }
.mira-import-folder-row, .mira-import-folder-new {
  display: flex; align-items: center; gap: 6px; padding: 5px 8px;
  border: 1px solid #3f3f46; border-radius: 6px; background: #18181b; cursor: pointer; font-size: 12px;
}
.mira-import-folder-row:hover { background: #27272a; }
.mira-import-folder-row.selected { border-color: #4ade80; background: rgba(74,222,128,.1); }
.mira-import-folder-row .icon { flex-shrink: 0; }
.mira-import-folder-new { border-style: dotted; color: #71717a; }
.mira-import-folder-new:hover { color: #fafafa; }
.mira-import-folder-new-form { display: flex; gap: 6px; }
.mira-import-folder-new-form input { flex: 1; }
.mira-import-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.mira-import-tag-chip {
  padding: 3px 10px; border-radius: 9999px; font-size: 12px; cursor: pointer;
  background: #27272a; color: #a1a1aa; border: 1px solid #3f3f46; transition: background .12s, color .12s, border-color .12s;
}
.mira-import-tag-chip:hover { color: #fafafa; }
.mira-import-tag-chip.selected { background: #4ade80; color: #052e16; border-color: #4ade80; font-weight: 600; }
.mira-import-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-top: 1px solid #3f3f46; }
.mira-import-footer .count { font-size: 12px; color: #a1a1aa; }
.mira-import-footer .ops { display: flex; gap: 8px; }
.mira-import-mask {
  position: fixed; inset: 0; z-index: ${OVERLAY_Z}; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
`;
  document.documentElement.appendChild(style);
}

export function openImportDialog(opts: ImportDialogOptions): void {
  ensureOverlayStyles();
  ensureDialogStyles();

  // 局部状态
  let urls: string[] = [...opts.urls];
  let folderId: number | undefined = undefined;
  const selectedTags = new Set<string>();
  let folders: Folder[] = [];
  let tags: Tag[] = [];

  // ---- DOM 骨架 ----
  const mask = document.createElement('div');
  mask.className = 'mira-import-mask';

  const dlg = document.createElement('div');
  dlg.className = 'mira-overlay mira-ready mira-import-dialog';

  // 标题栏
  const titleBar = document.createElement('div');
  titleBar.className = 'mira-overlay-title';
  const titleText = document.createElement('span');
  titleText.textContent = '批量导入到 Mira';
  titleBar.appendChild(titleText);
  const closeX = document.createElement('button');
  closeX.className = 'close-x';
  closeX.textContent = '×';
  closeX.title = '关闭';
  titleBar.appendChild(closeX);
  dlg.appendChild(titleBar);

  const content = document.createElement('div');
  content.className = 'mira-import-content';
  dlg.appendChild(content);

  // URL 列表区
  const urlSection = document.createElement('div');
  urlSection.className = 'mira-import-section';
  const urlLabel = document.createElement('div');
  urlLabel.className = 'mira-import-section-label';
  urlLabel.textContent = '图片 / 资源 URL';
  urlSection.appendChild(urlLabel);
  const urlList = document.createElement('div');
  urlList.className = 'mira-import-urls';
  urlSection.appendChild(urlList);
  content.appendChild(urlSection);

  // 文件夹区
  const folderSection = document.createElement('div');
  folderSection.className = 'mira-import-section';
  const folderLabel = document.createElement('div');
  folderLabel.className = 'mira-import-section-label';
  folderLabel.textContent = '文件夹(可选)';
  folderSection.appendChild(folderLabel);
  const folderList = document.createElement('div');
  folderList.className = 'mira-import-folder-list';
  folderSection.appendChild(folderList);
  content.appendChild(folderSection);

  // 标签区
  const tagSection = document.createElement('div');
  tagSection.className = 'mira-import-section';
  const tagLabel = document.createElement('div');
  tagLabel.className = 'mira-import-section-label';
  tagLabel.textContent = '标签(可多选)';
  tagSection.appendChild(tagLabel);
  const tagWrap = document.createElement('div');
  tagWrap.className = 'mira-import-tags';
  tagSection.appendChild(tagWrap);
  content.appendChild(tagSection);

  // 错误信息
  const errLine = document.createElement('div');
  errLine.className = 'mira-error';
  errLine.style.minHeight = '0';
  content.appendChild(errLine);

  // 底部
  const footer = document.createElement('div');
  footer.className = 'mira-import-footer';
  const countSpan = document.createElement('span');
  countSpan.className = 'count';
  footer.appendChild(countSpan);
  const ops = document.createElement('div');
  ops.className = 'ops';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '取消';
  const importBtn = document.createElement('button');
  importBtn.className = 'mira-primary';
  importBtn.textContent = '导入';
  ops.appendChild(cancelBtn);
  ops.appendChild(importBtn);
  footer.appendChild(ops);
  dlg.appendChild(footer);

  mask.appendChild(dlg);
  document.documentElement.appendChild(mask);

  // ---- 渲染逻辑 ----
  function rerenderUrls() {
    urlList.innerHTML = '';
    if (!urls.length) {
      const empty = document.createElement('div');
      empty.className = 'mira-import-empty';
      empty.textContent = '无 URL(可关闭对话框或重新从选区触发)';
      urlList.appendChild(empty);
    } else {
      urls.forEach((u, idx) => {
        const row = document.createElement('div');
        row.className = 'mira-import-url-row';
        // 缩略图(失败回退到占位图标)
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.src = u;
        const fallback = document.createElement('span');
        fallback.className = 'url-broken';
        fallback.textContent = '🖼';
        fallback.style.display = 'none';
        img.addEventListener('error', () => {
          img.style.display = 'none';
          fallback.style.display = 'inline-flex';
        });
        row.appendChild(img);
        row.appendChild(fallback);
        const txt = document.createElement('span');
        txt.className = 'url-text';
        txt.textContent = u;
        txt.title = u;
        row.appendChild(txt);
        const rm = document.createElement('button');
        rm.className = 'remove-btn';
        rm.title = '移除';
        rm.textContent = '×';
        rm.addEventListener('click', () => {
          urls.splice(idx, 1);
          rerenderUrls();
          updateCount();
        });
        row.appendChild(rm);
        urlList.appendChild(row);
      });
    }
  }

  function rerenderFolders() {
    folderList.innerHTML = '';
    // 「不使用文件夹」
    const none = document.createElement('div');
    none.className = 'mira-import-folder-row' + (folderId === undefined ? ' selected' : '');
    none.innerHTML = '<span class="icon">📂</span><span>不使用文件夹</span>';
    none.addEventListener('click', () => { folderId = undefined; rerenderFolders(); });
    folderList.appendChild(none);

    for (const f of folders) {
      const row = document.createElement('div');
      row.className = 'mira-import-folder-row' + (folderId === f.id ? ' selected' : '');
      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = '📁';
      const name = document.createElement('span');
      name.textContent = f.title || `#${f.id}`;
      row.appendChild(icon);
      row.appendChild(name);
      row.addEventListener('click', () => { folderId = f.id; rerenderFolders(); });
      folderList.appendChild(row);
    }

    // 「➕ 新建文件夹」(展开内联表单)
    const newWrap = document.createElement('div');
    newWrap.className = 'mira-import-folder-new';
    newWrap.innerHTML = '<span class="icon">➕</span><span>新建文件夹</span>';
    newWrap.addEventListener('click', () => {
      // 切换为输入表单
      newWrap.innerHTML = '';
      newWrap.classList.remove('mira-import-folder-new');
      newWrap.classList.add('mira-import-folder-new-form');
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '文件夹名称';
      input.value = '新建文件夹';
      const ok = document.createElement('button');
      ok.textContent = '创建';
      const cancel = document.createElement('button');
      cancel.className = 'mira-ghost';
      cancel.textContent = '取消';
      newWrap.appendChild(input);
      newWrap.appendChild(ok);
      newWrap.appendChild(cancel);
      input.focus();
      input.select();

      async function doCreate() {
        const name = input.value.trim();
        if (!name) return;
        ok.disabled = true;
        ok.textContent = '…';
        try {
          const id = await opts.createFolder(name);
          if (id == null) throw new Error('创建失败');
          // 刷新文件夹列表并选中新建项
          const fresh = await opts.getFolders();
          folders = fresh ?? [];
          folderId = id;
          rerenderFolders();
        } catch (e: any) {
          errLine.textContent = e?.message ?? '创建失败';
          ok.disabled = false;
          ok.textContent = '创建';
        }
      }
      ok.addEventListener('click', doCreate);
      cancel.addEventListener('click', () => rerenderFolders());
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); doCreate(); }
        if (e.key === 'Escape') { e.preventDefault(); rerenderFolders(); }
      });
    });
    folderList.appendChild(newWrap);
  }

  function rerenderTags() {
    tagWrap.innerHTML = '';
    if (!tags.length) {
      const empty = document.createElement('span');
      empty.className = 'mira-hint';
      empty.textContent = '当前素材库暂无标签';
      tagWrap.appendChild(empty);
      return;
    }
    for (const t of tags) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'mira-import-tag-chip' + (selectedTags.has(t.title) ? ' selected' : '');
      chip.textContent = t.title;
      chip.addEventListener('click', () => {
        if (selectedTags.has(t.title)) selectedTags.delete(t.title);
        else selectedTags.add(t.title);
        rerenderTags();
      });
      tagWrap.appendChild(chip);
    }
  }

  function updateCount() {
    if (urls.length === 0) {
      countSpan.textContent = '无可导入项';
      importBtn.disabled = true;
    } else {
      countSpan.textContent = `将导入 ${urls.length} 项`;
      importBtn.disabled = false;
    }
  }

  // ---- 异步加载文件夹/标签 ----
  Promise.all([opts.getFolders(), opts.getTags()])
    .then(([f, t]) => {
      folders = f ?? [];
      tags = t ?? [];
      rerenderFolders();
      rerenderTags();
    })
    .catch(e => {
      dbg.warn('import-dialog', 'load folders/tags failed', e);
      errLine.textContent = '加载文件夹/标签失败';
    });

  // ---- 事件 ----
  function close() {
    mask.remove();
  }
  function submit() {
    if (!urls.length) return;
    errLine.textContent = '';
    try {
      opts.onImport({
        urls: [...urls],
        folderId,
        tags: [...selectedTags],
        referrer: opts.referrer,
      });
      close();
    } catch (e: any) {
      errLine.textContent = e?.message ?? '导入失败';
    }
  }
  closeX.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  importBtn.addEventListener('click', submit);
  // 点遮罩关闭
  mask.addEventListener('click', e => { if (e.target === mask) close(); });
  // ESC 关闭
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); document.removeEventListener('keydown', onKey); }
  }
  document.addEventListener('keydown', onKey);

  // 首次渲染
  rerenderUrls();
  rerenderFolders();
  rerenderTags();
  updateCount();
}
