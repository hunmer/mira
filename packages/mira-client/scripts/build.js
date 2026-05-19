#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Mira Desktop build process...\n');

// 构建配置
const BUILD_CONFIG = {
  production: process.env.NODE_ENV === 'production',
  platform: process.platform,
  arch: process.arch,
  outDir: 'build',
  distDir: {
    renderer: 'dist-renderer',
    main: 'dist-main',
    preload: 'dist-preload'
  }
};

console.log('📋 Build Configuration:');
console.log(`   Environment: ${BUILD_CONFIG.production ? 'Production' : 'Development'}`);
console.log(`   Platform: ${BUILD_CONFIG.platform}`);
console.log(`   Architecture: ${BUILD_CONFIG.arch}\n`);

// 清理构建目录
function cleanBuildDirs() {
  console.log('🧹 Cleaning build directories...');
  
  const dirsToClean = [
    BUILD_CONFIG.outDir,
    ...Object.values(BUILD_CONFIG.distDir)
  ];
  
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`   ✓ Cleaned ${dir}`);
    }
  });
  
  console.log('');
}

// 构建渲染进程
function buildRenderer() {
  console.log('🎨 Building renderer process...');
  
  try {
    const cmd = BUILD_CONFIG.production 
      ? 'vue-tsc && vite build'
      : 'vite build';
    
    execSync(cmd, { 
      stdio: 'pipe',
      env: { 
        ...process.env, 
        NODE_ENV: BUILD_CONFIG.production ? 'production' : 'development'
      }
    });
    
    console.log('   ✓ Renderer process built successfully\n');
  } catch (error) {
    console.error('   ❌ Renderer build failed:', error.message);
    process.exit(1);
  }
}

// 构建主进程
function buildMain() {
  console.log('⚡ Building main process...');
  
  try {
    // 主进程构建通过 vite-plugin-electron 自动处理
    console.log('   ✓ Main process built successfully\n');
  } catch (error) {
    console.error('   ❌ Main process build failed:', error.message);
    process.exit(1);
  }
}

// 验证构建结果
function validateBuild() {
  console.log('🔍 Validating build results...');
  
  const requiredFiles = [
    path.join(BUILD_CONFIG.distDir.renderer, 'index.html'),
    path.join(BUILD_CONFIG.distDir.main, 'main.js'),
    path.join(BUILD_CONFIG.distDir.preload, 'preload.js')
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✓ ${file}`);
    } else {
      console.log(`   ❌ ${file} (missing)`);
      allFilesExist = false;
    }
  });
  
  if (!allFilesExist) {
    console.error('\n❌ Build validation failed - some required files are missing');
    process.exit(1);
  }
  
  console.log('\n✅ Build validation passed\n');
}

// 计算构建大小
function calculateBuildSize() {
  console.log('📊 Calculating build sizes...');
  
  function getDirSize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;
    
    let totalSize = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += getDirSize(filePath);
      } else {
        totalSize += fs.statSync(filePath).size;
      }
    });
    
    return totalSize;
  }
  
  function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  Object.entries(BUILD_CONFIG.distDir).forEach(([name, dir]) => {
    const size = getDirSize(dir);
    console.log(`   ${name}: ${formatSize(size)}`);
  });
  
  console.log('');
}

// 生成构建报告
function generateBuildReport() {
  console.log('📄 Generating build report...');
  
  const buildInfo = {
    timestamp: new Date().toISOString(),
    config: BUILD_CONFIG,
    nodeVersion: process.version,
    npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
    gitCommit: (() => {
      try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      } catch {
        return 'unknown';
      }
    })(),
    gitBranch: (() => {
      try {
        return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      } catch {
        return 'unknown';
      }
    })()
  };
  
  const reportPath = path.join(BUILD_CONFIG.outDir, 'build-report.json');
  
  // 确保输出目录存在
  if (!fs.existsSync(BUILD_CONFIG.outDir)) {
    fs.mkdirSync(BUILD_CONFIG.outDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(buildInfo, null, 2));
  console.log(`   ✓ Build report saved to ${reportPath}\n`);
}

// 主构建流程
async function main() {
  const startTime = Date.now();
  
  try {
    cleanBuildDirs();
    buildRenderer();
    buildMain();
    validateBuild();
    calculateBuildSize();
    generateBuildReport();
    
    const endTime = Date.now();
    const buildTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('🎉 Build completed successfully!');
    console.log(`⏱️  Total build time: ${buildTime}s\n`);
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// 运行构建
main();
