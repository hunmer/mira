#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running pre-build checks and setup...\n');

// 检查 Node.js 版本
function checkNodeVersion() {
  const requiredVersion = '18.0.0';
  const currentVersion = process.version.slice(1); // 移除 'v' 前缀
  
  console.log(`Node.js version: ${process.version}`);
  
  if (compareVersions(currentVersion, requiredVersion) < 0) {
    console.error(`❌ Node.js ${requiredVersion} or higher is required`);
    process.exit(1);
  }
  
  console.log('✓ Node.js version check passed');
}

// 版本比较函数
function compareVersions(current, required) {
  const currentParts = current.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const requiredPart = requiredParts[i] || 0;
    
    if (currentPart > requiredPart) return 1;
    if (currentPart < requiredPart) return -1;
  }
  
  return 0;
}

// 检查必需的文件和目录
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'src/main/main.ts',
    'src/renderer/main.ts',
    'src/preload/preload.ts',
    'vite.config.ts',
    'electron-builder.json'
  ];
  
  console.log('\n🔍 Checking required files...');
  
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
    console.error('\n❌ Some required files are missing');
    process.exit(1);
  }
  
  console.log('✓ All required files exist');
}

// 检查依赖
function checkDependencies() {
  console.log('\n📦 Checking dependencies...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'electron',
    'vue',
    'typescript',
    'vite',
    'pinia'
  ];
  
  const installedDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  let allDepsInstalled = true;
  
  requiredDeps.forEach(dep => {
    if (installedDeps[dep]) {
      console.log(`   ✓ ${dep} (${installedDeps[dep]})`);
    } else {
      console.log(`   ❌ ${dep} (not installed)`);
      allDepsInstalled = false;
    }
  });
  
  if (!allDepsInstalled) {
    console.error('\n❌ Some required dependencies are missing');
    console.error('   Run: npm install');
    process.exit(1);
  }
  
  console.log('✓ All required dependencies are installed');
}

// 创建必要的目录
function createDirectories() {
  console.log('\n📁 Creating build directories...');
  
  const requiredDirs = [
    'build',
    'build/icons',
    'docs',
    'assets'
  ];
  
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   ✓ Created ${dir}`);
    } else {
      console.log(`   ✓ ${dir} (exists)`);
    }
  });
}

// 生成构建元数据
function generateBuildMetadata() {
  console.log('\n📋 Generating build metadata...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const metadata = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    author: packageJson.author,
    license: packageJson.license,
    buildDate: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: process.env.NODE_ENV || 'development',
    gitInfo: getGitInfo()
  };
  
  // 确保构建目录存在
  if (!fs.existsSync('build')) {
    fs.mkdirSync('build', { recursive: true });
  }
  
  fs.writeFileSync('build/metadata.json', JSON.stringify(metadata, null, 2));
  console.log('   ✓ Build metadata saved to build/metadata.json');
  
  return metadata;
}

// 获取 Git 信息
function getGitInfo() {
  const { execSync } = require('child_process');
  
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const isDirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim() !== '';
    
    return {
      commit,
      branch,
      isDirty,
      shortCommit: commit.substring(0, 7)
    };
  } catch (error) {
    return {
      commit: 'unknown',
      branch: 'unknown',
      isDirty: false,
      shortCommit: 'unknown'
    };
  }
}

// 检查环境变量
function checkEnvironment() {
  console.log('\n🌍 Checking environment...');
  
  const requiredEnvVars = [];
  const optionalEnvVars = [
    'NODE_ENV',
    'CI',
    'GITHUB_TOKEN',
    'CSC_LINK',
    'CSC_KEY_PASSWORD'
  ];
  
  // 检查必需的环境变量
  let missingRequired = false;
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`   ✓ ${envVar}=***`);
    } else {
      console.log(`   ❌ ${envVar} (required)`);
      missingRequired = true;
    }
  });
  
  if (missingRequired) {
    console.error('\n❌ Some required environment variables are missing');
    process.exit(1);
  }
  
  // 显示可选的环境变量
  optionalEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`   ✓ ${envVar}=${process.env[envVar]}`);
    } else {
      console.log(`   - ${envVar} (not set)`);
    }
  });
  
  console.log('✓ Environment check completed');
}

// 验证 TypeScript 配置
function validateTypeScriptConfig() {
  console.log('\n🔷 Validating TypeScript configuration...');
  
  const tsConfigFiles = [
    'tsconfig.json',
    'tsconfig.node.json'
  ];
  
  tsConfigFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const config = JSON.parse(fs.readFileSync(file, 'utf8'));
        console.log(`   ✓ ${file} (valid JSON)`);
        
        // 检查关键配置
        if (config.compilerOptions) {
          if (config.compilerOptions.strict) {
            console.log(`     ✓ Strict mode enabled`);
          } else {
            console.log(`     ⚠️  Strict mode disabled`);
          }
          
          if (config.compilerOptions.target) {
            console.log(`     ✓ Target: ${config.compilerOptions.target}`);
          }
        }
      } catch (error) {
        console.error(`   ❌ ${file} (invalid JSON): ${error.message}`);
        process.exit(1);
      }
    } else {
      console.log(`   ⚠️  ${file} (not found)`);
    }
  });
  
  console.log('✓ TypeScript configuration validated');
}

// 解析 cnpm 符号链接：把 .store 里的实际内容拷贝到 node_modules 下
// electron-builder 不会跟随符号链接，导致打包后缺模块
function resolveSymlinks() {
  console.log('\n🔗 Resolving cnpm symlinks in node_modules...');
  const nmDir = path.resolve('node_modules');
  if (!fs.existsSync(nmDir)) return;

  let resolved = 0;
  const entries = fs.readdirSync(nmDir, { withFileTypes: true });

  for (const entry of entries) {
    // 跳过 .store、.bin、.package-lock.json 等
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(nmDir, entry.name);

    if (entry.isDirectory()) {
      // 处理 @scope 目录
      if (entry.name.startsWith('@')) {
        try {
          const scopeEntries = fs.readdirSync(fullPath, { withFileTypes: true });
          for (const sub of scopeEntries) {
            const subPath = path.join(fullPath, sub.name);
            if (sub.isDirectory() && fs.lstatSync(subPath).isSymbolicLink()) {
              resolveSymlink(subPath);
              resolved++;
            }
          }
        } catch {}
      } else if (fs.lstatSync(fullPath).isSymbolicLink()) {
        resolveSymlink(fullPath);
        resolved++;
      }
    }
  }
  console.log(`   ✓ Resolved ${resolved} symlinks`);
}

function resolveSymlink(symlinkPath) {
  const realPath = fs.realpathSync(symlinkPath);
  const parentDir = path.dirname(symlinkPath);
  const linkName = path.basename(symlinkPath);
  const tmpDir = symlinkPath + '___tmp';

  // 先拷贝真实内容到临时目录，再替换
  fs.cpSync(realPath, tmpDir, { recursive: true });
  fs.rmSync(symlinkPath, { recursive: true, force: true });
  fs.renameSync(tmpDir, symlinkPath);
}

// 主函数
async function main() {
  console.log('Starting pre-build validation for Mira Desktop...\n');

  try {
    checkNodeVersion();
    checkRequiredFiles();
    checkDependencies();
    resolveSymlinks();
    createDirectories();
    checkEnvironment();
    validateTypeScriptConfig();

    const metadata = generateBuildMetadata();
    
    console.log('\n🎉 Pre-build checks completed successfully!');
    console.log(`Building ${metadata.name} v${metadata.version}`);
    console.log(`Environment: ${metadata.environment}`);
    console.log(`Platform: ${metadata.platform}-${metadata.arch}`);
    
    if (metadata.gitInfo.isDirty) {
      console.log('\n⚠️  Warning: Working directory has uncommitted changes');
    }
    
  } catch (error) {
    console.error('\n❌ Pre-build checks failed:', error.message);
    process.exit(1);
  }
}

module.exports = async function () {
  await main();
};
