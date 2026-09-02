// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import BatchUploadForm from 'mira-plugin-ui/src/BatchUploadForm.vue';

describe('BatchUploadForm 上传关联', () => {
  it('提交标签 ID，不把 ID 转回标签标题', async () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const onUpload = vi.fn();
    const app = createApp(BatchUploadForm, {
      libraries: [{ id: 'lib-1', name: '测试库' }],
      folders: [{ id: 3, title: '人物', parent_id: 0 }],
      tags: [{ id: 7, title: '人物设定图', parent_id: 0 }],
      initialLibraryId: 'lib-1',
      initialFolderId: '3',
      initialTagTitles: ['7'],
      initialFiles: [new File(['image'], 'character.png', { type: 'image/png' })],
      onUpload,
    });

    app.mount(mount);
    await nextTick();
    const submit = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('开始上传'));
    expect(submit).toBeDefined();
    submit!.click();
    await nextTick();

    expect(onUpload).toHaveBeenCalledOnce();
    expect(onUpload.mock.calls[0][0]).toMatchObject({
      libraryId: 'lib-1',
      files: [expect.objectContaining({ name: 'character.png' })],
      metas: [expect.objectContaining({ folderId: '3', tags: ['7'] })],
    });
    app.unmount();
    mount.remove();
  });
});
