"use strict";
/**
 * 测试环境设置
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
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
// 加载环境变量
dotenv.config();
// 设置测试超时时间
jest.setTimeout(30000);
// 全局测试配置
global.testConfig = {
    serverUrl: process.env.MIRA_SERVER_URL || 'http://localhost:8081',
    username: process.env.MIRA_USERNAME || 'admin',
    password: process.env.MIRA_PASSWORD || 'admin123',
    libraryId: process.env.MIRA_LIBRARY_ID || 'default-library',
    enableIntegrationTests: process.env.ENABLE_INTEGRATION_TESTS === 'true'
};
// 在测试开始前的全局设置
beforeAll(async () => {
    console.log('🔧 设置测试环境...');
    console.log(`服务器地址: ${global.testConfig.serverUrl}`);
    console.log(`集成测试: ${global.testConfig.enableIntegrationTests ? '启用' : '禁用'}`);
});
// 在所有测试完成后的清理
afterAll(async () => {
    console.log('🧹 清理测试环境...');
});
//# sourceMappingURL=setup.js.map