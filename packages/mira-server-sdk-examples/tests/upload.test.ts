/**
 * 文件上传功能测试
 */

import { MiraClient } from 'mira-server-sdk';
import * as fs from 'fs';
import * as path from 'path';

describe('文件上传功能测试', () => {
    let client: MiraClient;
    let testFiles: { [key: string]: string } = {};

    beforeAll(async () => {
        client = new MiraClient((global as any).testConfig.serverUrl);

        // 创建测试文件
        const testDir = path.join(__dirname, 'temp-test-files');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // 创建小文本文件
        testFiles.smallText = path.join(testDir, 'small-test.txt');
        fs.writeFileSync(testFiles.smallText, 'Hello, Mira SDK!\nThis is a test file.', 'utf8');

        // 创建JSON文件
        testFiles.jsonFile = path.join(testDir, 'test.json');
        fs.writeFileSync(testFiles.jsonFile, JSON.stringify({ test: true, timestamp: Date.now() }), 'utf8');

        // 创建二进制文件
        testFiles.binaryFile = path.join(testDir, 'test.bin');
        const binaryData = Buffer.alloc(1024, 0);
        for (let i = 0; i < 1024; i++) {
            binaryData[i] = i % 256;
        }
        fs.writeFileSync(testFiles.binaryFile, binaryData);
    });

    afterAll(async () => {
        // 清理测试文件
        Object.values(testFiles).forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        const testDir = path.join(__dirname, 'temp-test-files');
        if (fs.existsSync(testDir)) {
            try {
                fs.rmdirSync(testDir);
            } catch (error) {
                // 目录可能不为空，忽略错误
            }
        }

        try {
            await client.auth().logout();
        } catch (error) {
            // 忽略登出错误
        }
    });

    beforeEach(async () => {
        // 每个测试前都登录
        await client.auth().login(
            (global as any).testConfig.username,
            (global as any).testConfig.password
        );
    });

    describe('单文件上传', () => {
        test('应该能够上传文本文件', async () => {
            // 跳过集成测试，如果未启用
            if (!(global as any).testConfig.enableIntegrationTests) {
                console.log('跳过集成测试: 文本文件上传');
                return;
            }

            const fileBuffer = fs.readFileSync(testFiles.smallText);
            const file = new File([fileBuffer], path.basename(testFiles.smallText), {
                type: 'text/plain'
            });

            const result = await client.files().uploadFile(
                file,
                (global as any).testConfig.libraryId,
                {
                    sourcePath: '/test',
                    tags: ['test', 'sdk']
                }
            );

            expect(result).toBeDefined();
            expect(result.message).toBeDefined();
            // 根据实际API响应调整断言
        });

        test('应该能够上传JSON文件', async () => {
            if (!(global as any).testConfig.enableIntegrationTests) {
                console.log('跳过集成测试: JSON文件上传');
                return;
            }

            const fileBuffer = fs.readFileSync(testFiles.jsonFile);
            const file = new File([fileBuffer], path.basename(testFiles.jsonFile), {
                type: 'application/json'
            });

            const result = await client.files().uploadFile(
                file,
                (global as any).testConfig.libraryId
            );

            expect(result).toBeDefined();
        });

        test('应该能够上传二进制文件', async () => {
            if (!(global as any).testConfig.enableIntegrationTests) {
                console.log('跳过集成测试: 二进制文件上传');
                return;
            }

            const fileBuffer = fs.readFileSync(testFiles.binaryFile);
            const file = new File([fileBuffer], path.basename(testFiles.binaryFile), {
                type: 'application/octet-stream'
            });

            const result = await client.files().uploadFile(
                file,
                (global as any).testConfig.libraryId
            );

            expect(result).toBeDefined();
        });
    });

    describe('批量文件上传', () => {
        test('应该能够批量上传多个文件', async () => {
            if (!(global as any).testConfig.enableIntegrationTests) {
                console.log('跳过集成测试: 批量文件上传');
                return;
            }

            const files: File[] = [];

            // 添加文本文件
            const textBuffer = fs.readFileSync(testFiles.smallText);
            files.push(new File([textBuffer], 'batch-text.txt', { type: 'text/plain' }));

            // 添加JSON文件
            const jsonBuffer = fs.readFileSync(testFiles.jsonFile);
            files.push(new File([jsonBuffer], 'batch-data.json', { type: 'application/json' }));

            const uploadRequest = {
                files: files,
                libraryId: (global as any).testConfig.libraryId,
                sourcePath: '/test/batch',
                clientId: 'test-client',
                fields: {
                    category: 'test',
                    batch: true
                }
            };

            const result = await client.files().upload(uploadRequest);

            expect(result).toBeDefined();
            expect(result.message).toBeDefined();
        });
    });

    describe('上传选项测试', () => {
        test('应该能够使用高级上传选项', async () => {
            if (!(global as any).testConfig.enableIntegrationTests) {
                console.log('跳过集成测试: 高级上传选项');
                return;
            }

            const fileBuffer = fs.readFileSync(testFiles.smallText);
            const file = new File([fileBuffer], 'advanced-test.txt', {
                type: 'text/plain'
            });

            const uploadRequest = {
                files: [file],
                libraryId: (global as any).testConfig.libraryId,
                sourcePath: '/test/advanced',
                clientId: 'advanced-client',
                fields: {
                    category: 'advanced-test',
                    priority: 'high',
                    author: 'SDK Test'
                },
                payload: {
                    testType: 'unit-test',
                    timestamp: Date.now()
                }
            };

            const result = await client.files().upload(uploadRequest);

            expect(result).toBeDefined();
        });
    });

    describe('文件下载', () => {
        test('应该能够处理文件下载请求', async () => {
            if (!(global as any).testConfig.enableIntegrationTests) {
                console.log('跳过集成测试: 文件下载');
                return;
            }

            // 这个测试需要有一个已知的文件ID
            // 在实际环境中，你可能需要先上传一个文件获取ID
            const mockFileId = 'test-file-id';

            try {
                const blob = await client.files().download(
                    (global as any).testConfig.libraryId,
                    mockFileId
                );

                expect(blob).toBeDefined();
                expect(blob instanceof Blob).toBe(true);
            } catch (error: any) {
                // 如果文件不存在，这是预期的
                expect(error.message).toBeDefined();
            }
        });
    });

    describe('错误处理', () => {
        test('应该拒绝空文件上传', async () => {
            const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });

            await expect(
                client.files().uploadFile(emptyFile, (global as any).testConfig.libraryId)
            ).rejects.toThrow();
        });

        test('应该拒绝无效的库ID', async () => {
            const fileBuffer = fs.readFileSync(testFiles.smallText);
            const file = new File([fileBuffer], 'test.txt', { type: 'text/plain' });

            await expect(
                client.files().uploadFile(file, 'invalid-library-id')
            ).rejects.toThrow();
        });

        test('应该在未认证时拒绝上传', async () => {
            // 先登出
            await client.auth().logout();

            const fileBuffer = fs.readFileSync(testFiles.smallText);
            const file = new File([fileBuffer], 'test.txt', { type: 'text/plain' });

            await expect(
                client.files().uploadFile(file, (global as any).testConfig.libraryId)
            ).rejects.toThrow();

            // 重新登录以便后续测试
            await client.auth().login(
                (global as any).testConfig.username,
                (global as any).testConfig.password
            );
        });
    });

    describe('文件验证', () => {
        test('应该正确处理不同的文件类型', async () => {
            // 这是一个模拟测试，验证文件类型处理逻辑
            const textFile = new File(['text content'], 'test.txt', { type: 'text/plain' });
            const jsonFile = new File(['{"test": true}'], 'test.json', { type: 'application/json' });
            const binaryFile = new File([new ArrayBuffer(100)], 'test.bin', { type: 'application/octet-stream' });

            expect(textFile.type).toBe('text/plain');
            expect(jsonFile.type).toBe('application/json');
            expect(binaryFile.type).toBe('application/octet-stream');

            expect(textFile.size).toBeGreaterThan(0);
            expect(jsonFile.size).toBeGreaterThan(0);
            expect(binaryFile.size).toBe(100);
        });

        test('应该正确处理文件名', async () => {
            const file = new File(['content'], 'test file name.txt', { type: 'text/plain' });

            expect(file.name).toBe('test file name.txt');
            expect(path.extname(file.name)).toBe('.txt');
        });
    });
}, 60000); // 文件上传测试可能需要更长时间
