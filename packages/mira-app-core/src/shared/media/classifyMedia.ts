/**
 * 媒体类型单一判定（自检报告 重复#4 收敛基础）。
 *
 * mime 优先、扩展名兜底的纯函数，无任何依赖；
 * client / plugin-ui / dashboard 统一经 `mira-app-core/shared/sdk` 导入使用。
 */

/** 媒体大类 */
export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'other';

/** classifyMedia 结果：主判定 kind + 派生布尔（对应 client 侧 isImageFile/isVideoFile/isAudioFile/isDocumentFile） */
export interface MediaClassification {
    kind: MediaKind;
    isImage: boolean;
    isVideo: boolean;
    isAudio: boolean;
    isDocument: boolean;
}

/** MIME 前缀 → 大类 */
const MIME_PREFIX_KINDS: ReadonlyArray<readonly [string, MediaKind]> = [
    ['image/', 'image'],
    ['video/', 'video'],
    ['audio/', 'audio'],
];

/** 文档类 MIME 的包含式判定 token（与 client isDocumentFile 现状对齐） */
const DOCUMENT_MIME_TOKENS: readonly string[] = ['pdf', 'document', 'text', 'spreadsheet', 'presentation'];

/** 扩展名（小写、不含点）→ 大类；三组媒体扩展名与 FileOperations.getFiles 的 category extMap 对齐，另补常见图片与文档格式 */
const EXT_KINDS: Readonly<Record<string, MediaKind>> = {
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', bmp: 'image', webp: 'image',
    svg: 'image', ico: 'image', tiff: 'image', tif: 'image', avif: 'image', heic: 'image',
    mp4: 'video', avi: 'video', mkv: 'video', mov: 'video', wmv: 'video', flv: 'video',
    webm: 'video', m4v: 'video', mpg: 'video', mpeg: 'video', '3gp': 'video',
    mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio', ogg: 'audio', wma: 'audio',
    m4a: 'audio', ape: 'audio', opus: 'audio',
    pdf: 'document', doc: 'document', docx: 'document', xls: 'document', xlsx: 'document',
    ppt: 'document', pptx: 'document', txt: 'document', md: 'document', csv: 'document',
};

function kindFromMime(mimeType?: string): MediaKind | undefined {
    if (!mimeType) return undefined;
    const mime = mimeType.toLowerCase();
    for (const [prefix, kind] of MIME_PREFIX_KINDS) {
        if (mime.startsWith(prefix)) return kind;
    }
    if (DOCUMENT_MIME_TOKENS.some((token) => mime.includes(token))) return 'document';
    return undefined;
}

function kindFromExtension(extension?: string): MediaKind | undefined {
    if (!extension) return undefined;
    const ext = extension.toLowerCase().replace(/^\./, '');
    return EXT_KINDS[ext];
}

/**
 * 媒体类型单一判定：mime 优先，扩展名兜底，均未识别时为 'other'。
 *
 * @param mimeType MIME 类型（如 'image/png'），优先使用
 * @param extension 扩展名（如 '.jpg' / 'jpg'，大小写不敏感），mime 缺失或未识别时兜底
 * @returns `{ kind, isImage, isVideo, isAudio, isDocument }`
 *
 * @example
 * classifyMedia('image/png').isImage;        // true
 * classifyMedia(undefined, '.mp4').kind;     // 'video'
 * classifyMedia('application/pdf').kind;     // 'document'
 * classifyMedia('foo/bar', '.xyz').kind;     // 'other'
 */
export function classifyMedia(mimeType?: string, extension?: string): MediaClassification {
    const kind = kindFromMime(mimeType) ?? kindFromExtension(extension) ?? 'other';
    return {
        kind,
        isImage: kind === 'image',
        isVideo: kind === 'video',
        isAudio: kind === 'audio',
        isDocument: kind === 'document',
    };
}
