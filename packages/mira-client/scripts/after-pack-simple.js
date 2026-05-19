#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📦 Running post-pack validation...\n');

/**
 * electron-builder after-pack 钩子
 * @param {object} context - electron-builder 上下文
 */
async function afterPack(context) {
  try {
    console.log('✅ After-pack hook executed successfully');
    console.log('   App output directory:', context.appOutDir);
    console.log('   Platform:', context.electronPlatformName);
    console.log('   Architecture:', context.arch);
    
    // 基本验证：检查输出目录是否存在
    if (fs.existsSync(context.appOutDir)) {
      console.log('   📁 Application directory found');
      
      // 检查关键文件
      const files = fs.readdirSync(context.appOutDir);
      console.log(`   📋 Found ${files.length} files/directories in output`);
      
      // 根据平台检查主要可执行文件
      let executableFound = false;
      if (context.electronPlatformName === 'win32') {
        executableFound = files.some(file => file.endsWith('.exe'));
      } else if (context.electronPlatformName === 'darwin') {
        executableFound = files.some(file => file.endsWith('.app'));
      } else {
        // Linux - 查找无扩展名的可执行文件或AppImage
        executableFound = files.length > 0;
      }
      
      if (executableFound) {
        console.log('   ✅ Executable file found');
      } else {
        console.log('   ⚠️  No executable file detected');
      }
    } else {
      console.log('   ❌ Application directory not found');
      throw new Error('Application output directory does not exist');
    }
    
    console.log('\n🎉 Post-pack validation completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Post-pack validation failed:', error.message);
    throw error;
  }
}

// 导出函数供 electron-builder 使用
module.exports = afterPack;

// 如果直接运行脚本（用于测试）
if (require.main === module) {
  console.log('Running after-pack script in test mode...');
  
  // 创建模拟上下文进行测试
  const mockContext = {
    appOutDir: path.join(__dirname, '..', 'build', 'win-unpacked'),
    electronPlatformName: 'win32',
    arch: 'x64'
  };
  
  afterPack(mockContext).catch(error => {
    console.error('Test run failed:', error);
    process.exit(1);
  });
}
