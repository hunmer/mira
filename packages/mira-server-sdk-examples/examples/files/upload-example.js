"use strict";
/**
 * 文件上传示例
 * 演示如何使用 Mira SDK 进行文件上传操作
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.basicUploadExample = basicUploadExample;
exports.batchUploadExample = batchUploadExample;
exports.advancedUploadExample = advancedUploadExample;
exports.downloadExample = downloadExample;
exports.errorHandlingExample = errorHandlingExample;
exports.createTestFiles = createTestFiles;
exports.cleanupTestFiles = cleanupTestFiles;
const mira_server_sdk_1 = require("mira-server-sdk");
const dotenv = __importStar(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 加载环境变量
dotenv.config();
const SERVER_URL = process.env.MIRA_SERVER_URL || 'http://localhost:8081';
const USERNAME = process.env.MIRA_USERNAME || 'admin';
const PASSWORD = process.env.MIRA_PASSWORD || 'admin123';
const LIBRARY_ID = process.env.MIRA_LIBRARY_ID || 'default-library';
/**
 * 创建测试文件
 */
function createTestFiles() {
    const testDir = path.join(__dirname, 'test-files');
    // 确保测试目录存在
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    const files = {};
    // 创建文本文件
    const textContent = `测试文本文件
创建时间: ${new Date().toISOString()}
这是一个用于测试 Mira SDK 上传功能的示例文件。

包含多行内容：
- 第一行内容
- 第二行内容  
- 第三行内容

文件大小应该足够小以便快速上传测试。`;
    files.textFile = path.join(testDir, 'test-document.txt');
    fs.writeFileSync(files.textFile, textContent, 'utf8');
    // 创建JSON文件
    const jsonContent = {
        name: 'Test JSON File',
        version: '1.0.0',
        description: 'This is a test JSON file for Mira SDK upload testing',
        timestamp: new Date().toISOString(),
        metadata: {
            fileType: 'json',
            purpose: 'testing',
            size: 'small'
        },
        data: [
            { id: 1, name: 'Item 1', value: 100 },
            { id: 2, name: 'Item 2', value: 200 },
            { id: 3, name: 'Item 3', value: 300 }
        ]
    };
    files.jsonFile = path.join(testDir, 'test-data.json');
    fs.writeFileSync(files.jsonFile, JSON.stringify(jsonContent, null, 2), 'utf8');
    // 创建小型二进制文件 (模拟图片)
    const binaryData = Buffer.alloc(1024, 0);
    for (let i = 0; i < 1024; i++) {
        binaryData[i] = i % 256;
    }
    files.binaryFile = path.join(testDir, 'test-binary.dat');
    fs.writeFileSync(files.binaryFile, binaryData);
    console.log(chalk_1.default.green('✅ 测试文件创建完成:'));
    Object.entries(files).forEach(([type, filePath]) => {
        const stats = fs.statSync(filePath);
        console.log(`  ${type}: ${path.basename(filePath)} (${stats.size} bytes)`);
    });
    return files;
}
/**
 * 基本文件上传示例
 */
async function basicUploadExample(client, files) {
    console.log(chalk_1.default.blue('📁 基本文件上传示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    try {
        // 上传文本文件
        console.log(chalk_1.default.yellow('上传文本文件...'));
        const fileBuffer = fs.readFileSync(files.textFile);
        const textFile = new File([fileBuffer], path.basename(files.textFile), {
            type: 'text/plain'
        });
        const uploadResult = await client.files().uploadFile(textFile, LIBRARY_ID, {
            sourcePath: '/test/documents',
            tags: ['test', 'document', 'upload-example']
        });
        console.log(chalk_1.default.green('✅ 文本文件上传成功:'));
        console.log(`  文件ID: ${uploadResult.fileId || 'N/A'}`);
        console.log(`  文件路径: ${uploadResult.filePath || 'N/A'}`);
        console.log(`  文件大小: ${uploadResult.fileSize || 'N/A'} bytes`);
        return uploadResult;
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 基本上传失败:'), error);
        throw error;
    }
}
/**
 * 批量文件上传示例
 */
async function batchUploadExample(client, files) {
    console.log(chalk_1.default.blue('\n📦 批量文件上传示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    try {
        // 准备多个文件
        const fileList = [];
        // 添加JSON文件
        const jsonBuffer = fs.readFileSync(files.jsonFile);
        const jsonFile = new File([jsonBuffer], path.basename(files.jsonFile), {
            type: 'application/json'
        });
        fileList.push(jsonFile);
        // 添加二进制文件
        const binaryBuffer = fs.readFileSync(files.binaryFile);
        const binaryFile = new File([binaryBuffer], path.basename(files.binaryFile), {
            type: 'application/octet-stream'
        });
        fileList.push(binaryFile);
        console.log(chalk_1.default.yellow(`准备上传 ${fileList.length} 个文件...`));
        // 批量上传
        const uploadRequest = {
            files: fileList,
            libraryId: LIBRARY_ID,
            sourcePath: '/test/batch-upload',
            clientId: 'batch-upload-client',
            fields: {
                category: 'test-files',
                batch: true,
                uploadedBy: 'sdk-example'
            }
        };
        const batchResult = await client.files().upload(uploadRequest);
        console.log(chalk_1.default.green('✅ 批量上传成功:'));
        console.log(`  上传的文件数: ${fileList.length}`);
        console.log(`  批次ID: ${batchResult.batchId || 'N/A'}`);
        if (batchResult.results && Array.isArray(batchResult.results)) {
            batchResult.results.forEach((result, index) => {
                console.log(`  文件 ${index + 1}: ${result.fileName} - ${result.status}`);
            });
        }
        return batchResult;
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 批量上传失败:'), error);
        throw error;
    }
}
/**
 * 高级上传选项示例
 */
async function advancedUploadExample(client, files) {
    console.log(chalk_1.default.blue('\n⚙️  高级上传选项示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    try {
        // 创建一个新的测试文件用于高级示例
        const advancedContent = `高级上传测试文件
时间戳: ${Date.now()}
随机数: ${Math.random()}

这个文件用于测试高级上传选项，包括：
- 自定义元数据
- 文件夹分组  
- 客户端标识
- 负载数据`;
        const advancedTestFile = path.join(path.dirname(files.textFile), 'advanced-test.txt');
        fs.writeFileSync(advancedTestFile, advancedContent, 'utf8');
        const fileBuffer = fs.readFileSync(advancedTestFile);
        const file = new File([fileBuffer], 'advanced-test.txt', {
            type: 'text/plain'
        });
        console.log(chalk_1.default.yellow('上传带有高级选项的文件...'));
        const uploadRequest = {
            files: [file],
            libraryId: LIBRARY_ID,
            sourcePath: '/test/advanced',
            clientId: 'advanced-upload-client',
            fields: {
                category: 'advanced-test',
                priority: 'high',
                tags: ['advanced', 'metadata', 'test'],
                author: 'SDK Example',
                description: '这是一个高级上传示例文件'
            },
            payload: {
                uploadType: 'advanced-example',
                clientInfo: {
                    version: '1.0.0',
                    platform: process.platform,
                    nodeVersion: process.version
                },
                metrics: {
                    startTime: Date.now(),
                    fileSize: fileBuffer.length
                }
            }
        };
        const result = await client.files().upload(uploadRequest);
        console.log(chalk_1.default.green('✅ 高级上传成功:'));
        console.log(`  文件ID: ${result.fileId || 'N/A'}`);
        console.log(`  处理状态: ${result.status || 'N/A'}`);
        console.log(`  元数据已保存: ${result.metadataSaved ? '是' : '否'}`);
        // 清理临时文件
        fs.unlinkSync(advancedTestFile);
        return result;
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 高级上传失败:'), error);
        throw error;
    }
}
/**
 * 文件下载示例
 */
async function downloadExample(client, uploadResult) {
    console.log(chalk_1.default.blue('\n⬇️  文件下载示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    try {
        if (!uploadResult.fileId) {
            console.log(chalk_1.default.yellow('⚠️  跳过下载示例: 没有可用的文件ID'));
            return;
        }
        console.log(chalk_1.default.yellow(`下载文件 ID: ${uploadResult.fileId}...`));
        const blob = await client.files().download(LIBRARY_ID, uploadResult.fileId);
        console.log(chalk_1.default.green('✅ 文件下载成功:'));
        console.log(`  文件大小: ${blob.size} bytes`);
        console.log(`  文件类型: ${blob.type || 'unknown'}`);
        // 保存下载的文件
        const downloadPath = path.join(__dirname, 'test-files', 'downloaded-file.txt');
        const arrayBuffer = await blob.arrayBuffer();
        fs.writeFileSync(downloadPath, Buffer.from(arrayBuffer));
        console.log(`  已保存到: ${downloadPath}`);
        return blob;
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 文件下载失败:'), error);
        throw error;
    }
}
/**
 * 错误处理示例
 */
async function errorHandlingExample(client) {
    console.log(chalk_1.default.blue('\n⚠️  上传错误处理示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    // 测试无效库ID
    try {
        console.log(chalk_1.default.yellow('测试无效的库ID...'));
        const dummyFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        await client.files().uploadFile(dummyFile, 'invalid-library-id');
    }
    catch (error) {
        console.log(chalk_1.default.orange('✅ 正确捕获了无效库ID错误:'), error.message);
    }
    // 测试空文件上传
    try {
        console.log(chalk_1.default.yellow('测试空文件上传...'));
        const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });
        await client.files().uploadFile(emptyFile, LIBRARY_ID);
    }
    catch (error) {
        console.log(chalk_1.default.orange('✅ 正确捕获了空文件错误:'), error.message);
    }
    // 测试过大文件 (如果有限制)
    try {
        console.log(chalk_1.default.yellow('测试大文件上传...'));
        const largeData = Buffer.alloc(50 * 1024 * 1024, 'x'); // 50MB
        const largeFile = new File([largeData], 'large.txt', { type: 'text/plain' });
        await client.files().uploadFile(largeFile, LIBRARY_ID);
        console.log(chalk_1.default.green('✅ 大文件上传成功'));
    }
    catch (error) {
        console.log(chalk_1.default.orange('✅ 大文件上传限制:'), error.message);
    }
}
/**
 * 清理测试文件
 */
function cleanupTestFiles(files) {
    console.log(chalk_1.default.blue('\n🧹 清理测试文件'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    try {
        Object.values(files).forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`删除: ${path.basename(filePath)}`);
            }
        });
        // 删除下载的文件
        const downloadPath = path.join(__dirname, 'test-files', 'downloaded-file.txt');
        if (fs.existsSync(downloadPath)) {
            fs.unlinkSync(downloadPath);
            console.log(`删除: downloaded-file.txt`);
        }
        // 删除测试目录 (如果为空)
        const testDir = path.join(__dirname, 'test-files');
        if (fs.existsSync(testDir)) {
            const remainingFiles = fs.readdirSync(testDir);
            if (remainingFiles.length === 0) {
                fs.rmdirSync(testDir);
                console.log(`删除目录: test-files`);
            }
        }
        console.log(chalk_1.default.green('✅ 清理完成'));
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 清理失败:'), error);
    }
}
/**
 * 主函数
 */
async function main() {
    console.log(chalk_1.default.bold.cyan('🚀 Mira SDK 文件上传示例集合\n'));
    let client;
    let testFiles;
    try {
        // 创建客户端并登录
        client = new mira_server_sdk_1.MiraClient(SERVER_URL);
        console.log(chalk_1.default.yellow('登录到服务器...'));
        await client.auth().login(USERNAME, PASSWORD);
        console.log(chalk_1.default.green('✅ 登录成功\n'));
        // 创建测试文件
        testFiles = createTestFiles();
        // 执行各种上传示例
        const basicResult = await basicUploadExample(client, testFiles);
        await batchUploadExample(client, testFiles);
        await advancedUploadExample(client, testFiles);
        await downloadExample(client, basicResult);
        await errorHandlingExample(client);
        console.log(chalk_1.default.bold.green('\n🎉 所有上传示例执行完成!'));
    }
    catch (error) {
        console.error(chalk_1.default.bold.red('\n💥 示例执行失败:'), error);
        process.exit(1);
    }
    finally {
        // 清理资源
        if (testFiles) {
            cleanupTestFiles(testFiles);
        }
        if (client) {
            try {
                await client.auth().logout();
                console.log(chalk_1.default.green('✅ 已登出'));
            }
            catch (error) {
                console.error(chalk_1.default.yellow('⚠️  登出失败:'), error);
            }
        }
    }
}
// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=upload-example.js.map