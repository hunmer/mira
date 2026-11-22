import { describe, it, expect } from 'vitest';
import { classifyMedia } from './classifyMedia';

describe('classifyMedia', () => {
    it('按 MIME 前缀判定 image/video/audio', () => {
        expect(classifyMedia('image/png').kind).toBe('image');
        expect(classifyMedia('image/png').isImage).toBe(true);
        expect(classifyMedia('video/mp4').kind).toBe('video');
        expect(classifyMedia('video/mp4').isVideo).toBe(true);
        expect(classifyMedia('audio/mpeg').kind).toBe('audio');
        expect(classifyMedia('audio/mpeg').isAudio).toBe(true);
    });

    it('MIME 大小写不敏感', () => {
        expect(classifyMedia('IMAGE/PNG').kind).toBe('image');
        expect(classifyMedia('Video/MP4').isVideo).toBe(true);
    });

    it('MIME 判定 document（token 包含式，与 client isDocumentFile 对齐）', () => {
        expect(classifyMedia('application/pdf').kind).toBe('document');
        expect(classifyMedia('application/pdf').isDocument).toBe(true);
        expect(
            classifyMedia('application/vnd.openxmlformats-officedocument.wordprocessingml.document').kind,
        ).toBe('document');
        expect(classifyMedia('text/plain').kind).toBe('document');
        expect(classifyMedia('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').kind).toBe('document');
    });

    it('扩展名兜底：带点/不带点/大写均可', () => {
        expect(classifyMedia(undefined, '.jpg').kind).toBe('image');
        expect(classifyMedia(undefined, 'JPG').isImage).toBe(true);
        expect(classifyMedia(undefined, '.MP4').kind).toBe('video');
        expect(classifyMedia(undefined, 'flac').kind).toBe('audio');
        expect(classifyMedia(undefined, '.pdf').kind).toBe('document');
    });

    it('扩展名表与 FileOperations.getFiles 的 category extMap 对齐', () => {
        // image 组
        for (const ext of ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif']) {
            expect(classifyMedia(undefined, ext).kind).toBe('image');
        }
        // video 组
        for (const ext of ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp']) {
            expect(classifyMedia(undefined, ext).kind).toBe('video');
        }
        // audio 组
        for (const ext of ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.ape', '.opus']) {
            expect(classifyMedia(undefined, ext).kind).toBe('audio');
        }
    });

    it('MIME 优先于扩展名', () => {
        expect(classifyMedia('video/mp4', '.jpg').kind).toBe('video');
        expect(classifyMedia('image/png', '.mp4').kind).toBe('image');
    });

    it('MIME 未识别时扩展名兜底', () => {
        expect(classifyMedia('application/octet-stream', '.mp3').kind).toBe('audio');
        expect(classifyMedia('foo/bar', '.svg').kind).toBe('image');
    });

    it('未识别与空输入 → other 且派生全 false', () => {
        const other = classifyMedia('application/octet-stream', '.xyz');
        expect(other.kind).toBe('other');
        expect(other.isImage).toBe(false);
        expect(other.isVideo).toBe(false);
        expect(other.isAudio).toBe(false);
        expect(other.isDocument).toBe(false);

        expect(classifyMedia().kind).toBe('other');
        expect(classifyMedia('', '').kind).toBe('other');
        expect(classifyMedia(undefined, '.').kind).toBe('other');
    });

    it('返回对象的派生布尔与 kind 一一对应', () => {
        const cases: Array<[string | undefined, string | undefined, 'image' | 'video' | 'audio' | 'document' | 'other']> = [
            ['image/webp', undefined, 'image'],
            ['audio/ogg', undefined, 'audio'],
            [undefined, '.docx', 'document'],
            ['unknown/x-y', '.zzz', 'other'],
        ];
        for (const [mime, ext, expected] of cases) {
            const result = classifyMedia(mime, ext);
            expect(result.kind).toBe(expected);
            expect(result.isImage).toBe(expected === 'image');
            expect(result.isVideo).toBe(expected === 'video');
            expect(result.isAudio).toBe(expected === 'audio');
            expect(result.isDocument).toBe(expected === 'document');
        }
    });
});
