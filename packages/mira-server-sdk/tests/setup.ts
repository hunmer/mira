/**
 * 测试环境配置和工具
 */

import { TextEncoder, TextDecoder } from 'util';

// 设置全局对象
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// 模拟浏览器环境的 FormData
if (typeof FormData === 'undefined') {
    class MockFormData {
        private data: Map<string, any> = new Map();

        append(key: string, value: any) {
            this.data.set(key, value);
        }

        get(key: string) {
            return this.data.get(key);
        }

        has(key: string) {
            return this.data.has(key);
        }

        entries() {
            return this.data.entries();
        }
    }

    global.FormData = MockFormData as any;
}

// 模拟 File 对象
if (typeof File === 'undefined') {
    class MockFile {
        constructor(
            public content: string | ArrayBuffer,
            public name: string,
            public options?: { type?: string }
        ) { }

        get type() {
            return this.options?.type || '';
        }

        get size() {
            return typeof this.content === 'string'
                ? this.content.length
                : this.content.byteLength;
        }
    }

    global.File = MockFile as any;
}

// 模拟 Blob 对象
if (typeof Blob === 'undefined') {
    class MockBlob {
        constructor(public content: any[], public options?: { type?: string }) { }

        get type() {
            return this.options?.type || '';
        }

        get size() {
            return this.content.reduce((size, chunk) => {
                if (typeof chunk === 'string') {
                    return size + chunk.length;
                }
                return size + (chunk.byteLength || 0);
            }, 0);
        }
    }

    global.Blob = MockBlob as any;
}

// 模拟 URL.createObjectURL 和 revokeObjectURL
if (typeof URL === 'undefined' || !URL.createObjectURL) {
    global.URL = {
        createObjectURL: (blob: any) => `mock-url://blob-${Math.random()}`,
        revokeObjectURL: (url: string) => { },
    } as any;
}

// 模拟 document 对象（用于文件下载测试）
if (typeof document === 'undefined') {
    const mockDocument = {
        createElement: (tagName: string) => {
            if (tagName === 'a') {
                return {
                    href: '',
                    download: '',
                    click: jest.fn(),
                };
            }
            return {};
        },
        body: {
            appendChild: jest.fn(),
            removeChild: jest.fn(),
        },
    };

    global.document = mockDocument as any;
}
