#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Running post-pack optimization...\n');

// 配置
const PACK_CONFIG = {
  platform: process.platform,
  arch: process.arch,
  appName: 'Mira Media Library',
  buildDir: 'build',
  distDir: 'dist'
};

// 获取应用路径
function getAppPath(context) {
  // 使用 electron-builder 提供的上下文信息
  if (context && context.appOutDir) {
    // macOS 下 appOutDir 是输出目录，应用实际在其下的 .app 包内
    if (PACK_CONFIG.platform === 'darwin') {
      const appName = (context.packager && context.packager.appInfo && context.packager.appInfo.productFilename) || PACK_CONFIG.appName;
      const appPackage = path.join(context.appOutDir, `${appName}.app`);
      if (fs.existsSync(appPackage)) return appPackage;
    }
    return context.appOutDir;
  }

  // 备用方案：基于平台猜测路径
  const baseName = PACK_CONFIG.appName;
  
  switch (PACK_CONFIG.platform) {
    case 'win32':
      return path.join(PACK_CONFIG.buildDir, `win-unpacked`);
    case 'darwin':
      return path.join(PACK_CONFIG.buildDir, `mac/${baseName}.app`);
    case 'linux':
      return path.join(PACK_CONFIG.buildDir, `linux-unpacked`);
    default:
      return null;
  }
}

// 优化文件大小
function optimizeFileSize(context) {
  console.log('🗜️  Optimizing file sizes...');
  
  const appPath = getAppPath(context);
  if (!appPath || !fs.existsSync(appPath)) {
    console.log(`   ⚠️  App path not found: ${appPath || 'undefined'}, skipping optimization`);
    return;
  }
  
  try {
    // 移除不必要的文件
    const filesToRemove = [
      '**/*.map',
      '**/*.d.ts',
      '**/LICENSE*',
      '**/README*',
      '**/CHANGELOG*',
      '**/.gitignore',
      '**/.npmignore',
      '**/package-lock.json',
      '**/yarn.lock'
    ];
    
    // 移除开发依赖相关文件
    const devPaths = [
      'node_modules/@types',
      'node_modules/.bin',
      'node_modules/typescript',
      'node_modules/eslint',
      'node_modules/@typescript-eslint'
    ];
    
    let removedFiles = 0;
    let savedBytes = 0;
    
    function removeFiles(dir, patterns) {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      files.forEach(file => {
        const filePath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          removeFiles(filePath, patterns);
          
          // 检查是否为要移除的开发目录
          const relativePath = path.relative(appPath, filePath);
          if (devPaths.some(devPath => relativePath.includes(devPath))) {
            try {
              const stats = fs.statSync(filePath);
              fs.rmSync(filePath, { recursive: true, force: true });
              removedFiles++;
              savedBytes += getDirSize(filePath);
              console.log(`     Removed dev directory: ${relativePath}`);
            } catch (error) {
              // 目录可能已被删除或无法访问
            }
          }
        } else {
          // 检查文件是否匹配移除模式
          const shouldRemove = patterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
            return regex.test(file.name);
          });
          
          if (shouldRemove) {
            try {
              const stats = fs.statSync(filePath);
              fs.unlinkSync(filePath);
              removedFiles++;
              savedBytes += stats.size;
            } catch (error) {
              // 文件可能已被删除
            }
          }
        }
      });
    }
    
    removeFiles(appPath, filesToRemove);
    
    console.log(`   ✓ Removed ${removedFiles} files`);
    console.log(`   ✓ Saved ${formatBytes(savedBytes)}`);
    
  } catch (error) {
    console.error('   ❌ Optimization failed:', error.message);
  }
}

// 计算目录大小
function getDirSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  
  let totalSize = 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file.name);
      try {
        if (file.isDirectory()) {
          totalSize += getDirSize(filePath);
        } else {
          totalSize += fs.statSync(filePath).size;
        }
      } catch (error) {
        // 跳过无法访问的文件
      }
    });
  } catch (error) {
    // 跳过无法访问的目录
  }
  
  return totalSize;
}

// 格式化字节大小
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// 验证应用完整性
function validateApp(context) {
  console.log('🔍 Validating packed application...');
  
  const appPath = getAppPath(context);
  if (!appPath || !fs.existsSync(appPath)) {
    console.error(`   ❌ Packed application not found at: ${appPath || 'undefined'}`);
    return false;
  }
  
  // 检查关键文件
  const requiredFiles = [];
  
  switch (PACK_CONFIG.platform) {
    case 'win32':
      requiredFiles.push(
        path.join(appPath, `${PACK_CONFIG.appName}.exe`),
        path.join(appPath, 'resources/app.asar')
      );
      break;
    case 'darwin':
      requiredFiles.push(
        path.join(appPath, 'Contents/MacOS', PACK_CONFIG.appName),
        path.join(appPath, 'Contents/Resources/app.asar')
      );
      break;
    case 'linux':
      requiredFiles.push(
        path.join(appPath, PACK_CONFIG.appName.toLowerCase().replace(/\s+/g, '-')),
        path.join(appPath, 'resources/app.asar')
      );
      break;
  }
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✓ ${path.relative(appPath, file)}`);
    } else {
      console.log(`   ❌ ${path.relative(appPath, file)} (missing)`);
      allFilesExist = false;
    }
  });
  
  if (!allFilesExist) {
    console.error('   ❌ Application validation failed');
    return false;
  }
  
  console.log('   ✓ Application validation passed');
  return true;
}

// 生成应用信息
function generateAppInfo(context) {
  console.log('📋 Generating application information...');
  
  const appPath = getAppPath(context);
  if (!appPath || !fs.existsSync(appPath)) {
    console.log('   ⚠️  App path not found, skipping info generation');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const buildMetadata = fs.existsSync('build/metadata.json') 
    ? JSON.parse(fs.readFileSync('build/metadata.json', 'utf8'))
    : {};
  
  const appInfo = {
    name: packageJson.name,
    productName: PACK_CONFIG.appName,
    version: packageJson.version,
    description: packageJson.description,
    author: packageJson.author,
    license: packageJson.license,
    platform: PACK_CONFIG.platform,
    arch: PACK_CONFIG.arch,
    packDate: new Date().toISOString(),
    buildMetadata,
    size: {
      raw: getDirSize(appPath),
      formatted: formatBytes(getDirSize(appPath))
    },
    files: countFiles(appPath)
  };
  
  // 保存应用信息
  const infoPath = path.join(PACK_CONFIG.buildDir, 'app-info.json');
  fs.writeFileSync(infoPath, JSON.stringify(appInfo, null, 2));
  console.log(`   ✓ App info saved to ${infoPath}`);
  
  // 显示摘要
  console.log('\n📊 Application Summary:');
  console.log(`   Name: ${appInfo.productName}`);
  console.log(`   Version: ${appInfo.version}`);
  console.log(`   Platform: ${appInfo.platform}-${appInfo.arch}`);
  console.log(`   Size: ${appInfo.size.formatted}`);
  console.log(`   Files: ${appInfo.files}`);
  
  return appInfo;
}

// 计算文件数量
function countFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  
  let fileCount = 0;
  
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        fileCount += countFiles(filePath);
      } else {
        fileCount++;
      }
    });
  } catch (error) {
    // 跳过无法访问的目录
  }
  
  return fileCount;
}

// 创建启动脚本（仅限 Linux）
function createLaunchScript(context) {
  if (PACK_CONFIG.platform !== 'linux') return;
  
  console.log('🐧 Creating Linux launch script...');
  
  const appPath = getAppPath(context);
  if (!appPath || !fs.existsSync(appPath)) {
    console.log('   ⚠️  App path not found, skipping script creation');
    return;
  }
  
  const scriptName = 'mira-desktop';
  const scriptPath = path.join(appPath, scriptName);
  const executableName = PACK_CONFIG.appName.toLowerCase().replace(/\s+/g, '-');
  
  const script = `#!/bin/bash
# Mira Desktop Launch Script
# Generated automatically - do not edit manually

DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
EXEC="$DIR/${executableName}"

# Check if executable exists
if [ ! -f "$EXEC" ]; then
    echo "Error: Application executable not found at $EXEC"
    exit 1
fi

# Make sure executable has proper permissions
chmod +x "$EXEC"

# Launch application
exec "$EXEC" "$@"
`;
  
  try {
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, 0o755);
    console.log(`   ✓ Launch script created: ${scriptName}`);
  } catch (error) {
    console.error('   ❌ Failed to create launch script:', error.message);
  }
}

// 主函数
async function main(context) {
  const startTime = Date.now();
  
  try {
    console.log(`Processing packed application for ${PACK_CONFIG.platform}-${PACK_CONFIG.arch}...\n`);
    
    // 运行后处理步骤
    optimizeFileSize(context);
    
    const isValid = validateApp(context);
    if (!isValid) {
      throw new Error('Application validation failed');
    }
    
    generateAppInfo(context);
    createLaunchScript(context);
    
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 Post-pack processing completed successfully!');
    console.log(`⏱️  Processing time: ${processingTime}s`);
    
  } catch (error) {
    console.error('\n❌ Post-pack processing failed:', error.message);
    throw error;
  }
}

// 如果作为模块导出
module.exports = main;

// 如果直接运行
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}
