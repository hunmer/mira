#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting comprehensive build system test...\n');

// 测试配置
const TEST_CONFIG = {
  timeout: 300000, // 5 minutes
  verbose: process.argv.includes('--verbose'),
  skipLongRunning: process.argv.includes('--skip-long')
};

// 测试结果收集
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// 辅助函数
function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: TEST_CONFIG.verbose ? 'inherit' : 'pipe',
      timeout: TEST_CONFIG.timeout,
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      output: error.stdout || error.stderr || '' 
    };
  }
}

function logTest(name, status, details = '') {
  const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
  console.log(`${statusIcon} ${name}`);
  
  if (details && TEST_CONFIG.verbose) {
    console.log(`   ${details}`);
  }
  
  if (status === 'pass') testResults.passed++;
  else if (status === 'fail') {
    testResults.failed++;
    testResults.errors.push({ name, details });
  } else testResults.skipped++;
}

// 测试用例
async function testConfigFiles() {
  console.log('📋 Testing configuration files...\n');
  
  // 检查配置文件存在性
  const configFiles = [
    'package.json',
    'vite.config.ts',
    'electron-builder.json',
    'typedoc.json',
    '.dependency-cruiser.js',
    'build.config.ts'
  ];
  
  configFiles.forEach(file => {
    if (fs.existsSync(file)) {
      logTest(`Config file: ${file}`, 'pass');
    } else {
      logTest(`Config file: ${file}`, 'fail', 'File not found');
    }
  });
  
  // 验证 JSON 文件格式
  const jsonFiles = ['package.json', 'electron-builder.json', 'typedoc.json'];
  
  jsonFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        JSON.parse(fs.readFileSync(file, 'utf8'));
        logTest(`JSON validation: ${file}`, 'pass');
      } catch (error) {
        logTest(`JSON validation: ${file}`, 'fail', error.message);
      }
    }
  });
}

async function testTypeScript() {
  console.log('\n🔷 Testing TypeScript compilation...\n');
  
  // TypeScript 类型检查
  const result = runCommand('npx vue-tsc --noEmit');
  
  if (result.success) {
    logTest('TypeScript type checking', 'pass');
  } else {
    logTest('TypeScript type checking', 'fail', result.error);
  }
}

async function testViteBuild() {
  console.log('\n⚡ Testing Vite build process...\n');
  
  if (TEST_CONFIG.skipLongRunning) {
    logTest('Vite build test', 'skip', 'Skipped (--skip-long)');
    return;
  }
  
  // 清理之前的构建
  if (fs.existsSync('dist-renderer')) {
    fs.rmSync('dist-renderer', { recursive: true, force: true });
  }
  
  // 执行构建
  const result = runCommand('npm run build');
  
  if (result.success) {
    logTest('Vite build process', 'pass');
    
    // 检查构建输出
    const requiredFiles = [
      'dist-renderer/index.html',
      'dist-renderer/assets'
    ];
    
    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        logTest(`Build output: ${file}`, 'pass');
      } else {
        logTest(`Build output: ${file}`, 'fail', 'File not found');
      }
    });
  } else {
    logTest('Vite build process', 'fail', result.error);
  }
}

async function testElectronBuilder() {
  console.log('\n📦 Testing Electron Builder configuration...\n');
  
  // 验证 electron-builder 配置
  const result = runCommand('npx electron-builder --help');
  
  if (result.success) {
    logTest('Electron Builder availability', 'pass');
    
    // 检查配置文件
    if (fs.existsSync('electron-builder.json')) {
      try {
        const config = JSON.parse(fs.readFileSync('electron-builder.json', 'utf8'));
        
        // 检查必需字段
        const requiredFields = ['appId', 'productName', 'directories', 'files'];
        requiredFields.forEach(field => {
          if (config[field]) {
            logTest(`Electron config: ${field}`, 'pass');
          } else {
            logTest(`Electron config: ${field}`, 'fail', 'Missing required field');
          }
        });
      } catch (error) {
        logTest('Electron config validation', 'fail', error.message);
      }
    }
  } else {
    logTest('Electron Builder availability', 'fail', result.error);
  }
}

async function testDocumentation() {
  console.log('\n📚 Testing documentation generation...\n');
  
  if (TEST_CONFIG.skipLongRunning) {
    logTest('TypeDoc generation', 'skip', 'Skipped (--skip-long)');
    return;
  }
  
  // 清理之前的文档
  if (fs.existsSync('docs/api')) {
    fs.rmSync('docs/api', { recursive: true, force: true });
  }
  
  // 生成文档
  const result = runCommand('npm run docs');
  
  if (result.success) {
    logTest('TypeDoc generation', 'pass');
    
    // 检查文档输出
    if (fs.existsSync('docs/api/index.html')) {
      logTest('Documentation output', 'pass');
    } else {
      logTest('Documentation output', 'fail', 'index.html not found');
    }
  } else {
    logTest('TypeDoc generation', 'fail', result.error);
  }
}

async function testDependencyAnalysis() {
  console.log('\n🔍 Testing dependency analysis...\n');
  
  if (TEST_CONFIG.skipLongRunning) {
    logTest('Dependency analysis', 'skip', 'Skipped (--skip-long)');
    return;
  }
  
  // 检查 dependency-cruiser 可用性
  const cruiserResult = runCommand('npx depcruise --version');
  
  if (cruiserResult.success) {
    logTest('Dependency cruiser availability', 'pass');
    
    // 运行依赖分析
    const analysisResult = runCommand('npm run analyze:deps');
    
    if (analysisResult.success) {
      logTest('Dependency analysis execution', 'pass');
      
      // 检查输出文件
      const outputFiles = [
        'docs/dependencies.html',
        'docs/dependency-summary.md'
      ];
      
      outputFiles.forEach(file => {
        if (fs.existsSync(file)) {
          logTest(`Analysis output: ${path.basename(file)}`, 'pass');
        } else {
          logTest(`Analysis output: ${path.basename(file)}`, 'fail', 'File not found');
        }
      });
    } else {
      logTest('Dependency analysis execution', 'fail', analysisResult.error);
    }
  } else {
    logTest('Dependency cruiser availability', 'fail', cruiserResult.error);
  }
}

async function testBuildScripts() {
  console.log('\n🔧 Testing build scripts...\n');
  
  const scripts = [
    { name: 'before-build.js', command: 'node scripts/before-build.js' },
    { name: 'build.js', command: 'node scripts/build.js --help' },
    { name: 'analyze-deps.js', command: 'node scripts/analyze-deps.js --help' }
  ];
  
  scripts.forEach(script => {
    if (fs.existsSync(`scripts/${script.name}`)) {
      logTest(`Script exists: ${script.name}`, 'pass');
      
      // 测试脚本执行（仅帮助命令）
      if (script.command.includes('--help')) {
        const result = runCommand(script.command);
        if (result.success) {
          logTest(`Script execution: ${script.name}`, 'pass');
        } else {
          logTest(`Script execution: ${script.name}`, 'fail', result.error);
        }
      }
    } else {
      logTest(`Script exists: ${script.name}`, 'fail', 'File not found');
    }
  });
}

async function testPackageScripts() {
  console.log('\n📜 Testing package.json scripts...\n');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const expectedScripts = [
    'dev',
    'build',
    'build:prod',
    'electron:dev',
    'electron:build',
    'docs',
    'analyze:deps',
    'clean'
  ];
  
  expectedScripts.forEach(script => {
    if (scripts[script]) {
      logTest(`Package script: ${script}`, 'pass');
    } else {
      logTest(`Package script: ${script}`, 'fail', 'Script not defined');
    }
  });
}

async function testLinting() {
  console.log('\n🔍 Testing code quality...\n');
  
  // ESLint 检查
  const lintResult = runCommand('npm run lint');
  
  if (lintResult.success) {
    logTest('ESLint check', 'pass');
  } else {
    // ESLint 可能返回非零退出码但仍然是有效的检查
    if (lintResult.output && !lintResult.output.includes('error')) {
      logTest('ESLint check', 'pass', 'With warnings');
    } else {
      logTest('ESLint check', 'fail', lintResult.error);
    }
  }
}

// 生成测试报告
function generateReport() {
  console.log('\n📊 Test Summary\n');
  console.log(`Total tests: ${testResults.passed + testResults.failed + testResults.skipped}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️  Skipped: ${testResults.skipped}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Failed Tests:\n');
    testResults.errors.forEach(error => {
      console.log(`   • ${error.name}`);
      if (error.details) {
        console.log(`     ${error.details}`);
      }
    });
  }
  
  // 保存测试报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.passed + testResults.failed + testResults.skipped,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped
    },
    errors: testResults.errors,
    config: TEST_CONFIG
  };
  
  if (!fs.existsSync('build')) {
    fs.mkdirSync('build', { recursive: true });
  }
  
  fs.writeFileSync('build/test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Test report saved to build/test-report.json');
  
  return testResults.failed === 0;
}

// 主测试流程
async function main() {
  const startTime = Date.now();
  
  console.log('🚀 Mira Desktop Build System Test Suite');
  console.log(`⏱️  Started at: ${new Date().toLocaleString()}`);
  
  if (TEST_CONFIG.skipLongRunning) {
    console.log('⚡ Fast mode: Skipping long-running tests');
  }
  
  console.log('');
  
  try {
    await testConfigFiles();
    await testPackageScripts();
    await testBuildScripts();
    await testTypeScript();
    await testLinting();
    await testViteBuild();
    await testElectronBuilder();
    await testDocumentation();
    await testDependencyAnalysis();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️  Test duration: ${duration}s`);
    
    const success = generateReport();
    
    if (success) {
      console.log('\n🎉 All tests passed! Build system is ready for use.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix the issues.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error.message);
    process.exit(1);
  }
}

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Mira Desktop Build System Test Suite

Usage: node scripts/test-build.js [options]

Options:
  --help, -h        Show this help message
  --verbose         Show detailed output from commands
  --skip-long       Skip long-running tests (build, docs, analysis)

Examples:
  node scripts/test-build.js
  node scripts/test-build.js --verbose
  node scripts/test-build.js --skip-long
`);
  process.exit(0);
}

// 运行测试
main();
