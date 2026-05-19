#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Mira Desktop deployment process...\n');

// 部署配置
const DEPLOY_CONFIG = {
  environment: process.env.NODE_ENV || 'production',
  platform: process.platform,
  version: require('../package.json').version,
  buildDir: 'build',
  uploadEndpoint: process.env.UPLOAD_ENDPOINT,
  githubToken: process.env.GITHUB_TOKEN,
  releaseNotes: process.env.RELEASE_NOTES || 'Automated release'
};

console.log('📋 Deployment Configuration:');
console.log(`   Environment: ${DEPLOY_CONFIG.environment}`);
console.log(`   Platform: ${DEPLOY_CONFIG.platform}`);
console.log(`   Version: ${DEPLOY_CONFIG.version}\n`);

// 部署前检查
function preDeployChecks() {
  console.log('🔍 Running pre-deployment checks...');
  
  // 检查构建输出
  if (!fs.existsSync(DEPLOY_CONFIG.buildDir)) {
    throw new Error('Build directory not found. Run build first.');
  }
  
  // 检查版本标签
  try {
    const gitTag = execSync('git describe --tags --exact-match HEAD', { encoding: 'utf8' }).trim();
    console.log(`   ✓ Git tag: ${gitTag}`);
  } catch (error) {
    console.log('   ⚠️  No git tag found for current commit');
  }
  
  // 检查工作目录状态
  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (gitStatus) {
      console.log('   ⚠️  Working directory has uncommitted changes');
    } else {
      console.log('   ✓ Working directory clean');
    }
  } catch (error) {
    console.log('   ⚠️  Git status check failed');
  }
  
  console.log('   ✓ Pre-deployment checks completed\n');
}

// 创建发布包
function createReleasePackage() {
  console.log('📦 Creating release package...');
  
  const packageInfo = {
    name: require('../package.json').name,
    version: DEPLOY_CONFIG.version,
    platform: DEPLOY_CONFIG.platform,
    arch: process.arch,
    buildDate: new Date().toISOString(),
    files: []
  };
  
  // 收集构建文件
  if (fs.existsSync(DEPLOY_CONFIG.buildDir)) {
    const files = fs.readdirSync(DEPLOY_CONFIG.buildDir, { withFileTypes: true });
    
    files.forEach(file => {
      if (file.isFile() && (file.name.endsWith('.exe') || file.name.endsWith('.dmg') || file.name.endsWith('.AppImage') || file.name.endsWith('.deb') || file.name.endsWith('.rpm'))) {
        const filePath = path.join(DEPLOY_CONFIG.buildDir, file.name);
        const stats = fs.statSync(filePath);
        
        packageInfo.files.push({
          name: file.name,
          size: stats.size,
          path: filePath
        });
        
        console.log(`   ✓ ${file.name} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    });
  }
  
  // 保存包信息
  fs.writeFileSync(
    path.join(DEPLOY_CONFIG.buildDir, 'release-package.json'),
    JSON.stringify(packageInfo, null, 2)
  );
  
  console.log(`   ✓ Release package created with ${packageInfo.files.length} files\n`);
  return packageInfo;
}

// GitHub Release 上传
async function uploadToGitHub(packageInfo) {
  if (!DEPLOY_CONFIG.githubToken) {
    console.log('⚠️  GitHub token not provided, skipping GitHub release\n');
    return;
  }
  
  console.log('📤 Uploading to GitHub Releases...');
  
  try {
    // 创建 GitHub release
    const createReleaseCmd = [
      'gh release create',
      `v${DEPLOY_CONFIG.version}`,
      '--title', `"Mira Desktop v${DEPLOY_CONFIG.version}"`,
      '--notes', `"${DEPLOY_CONFIG.releaseNotes}"`,
      DEPLOY_CONFIG.environment === 'production' ? '' : '--prerelease'
    ].filter(Boolean).join(' ');
    
    execSync(createReleaseCmd, { stdio: 'inherit' });
    console.log('   ✓ GitHub release created');
    
    // 上传文件
    for (const file of packageInfo.files) {
      const uploadCmd = `gh release upload v${DEPLOY_CONFIG.version} "${file.path}"`;
      execSync(uploadCmd, { stdio: 'inherit' });
      console.log(`   ✓ Uploaded ${file.name}`);
    }
    
    console.log('   ✓ All files uploaded to GitHub\n');
    
  } catch (error) {
    console.error('   ❌ GitHub upload failed:', error.message);
    throw error;
  }
}

// 生成部署报告
function generateDeploymentReport(packageInfo) {
  console.log('📄 Generating deployment report...');
  
  const report = {
    deployment: {
      timestamp: new Date().toISOString(),
      version: DEPLOY_CONFIG.version,
      environment: DEPLOY_CONFIG.environment,
      platform: DEPLOY_CONFIG.platform,
      arch: process.arch
    },
    package: packageInfo,
    git: {
      commit: (() => {
        try {
          return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        } catch {
          return 'unknown';
        }
      })(),
      branch: (() => {
        try {
          return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        } catch {
          return 'unknown';
        }
      })()
    },
    build: fs.existsSync('build/metadata.json') 
      ? JSON.parse(fs.readFileSync('build/metadata.json', 'utf8'))
      : null
  };
  
  const reportPath = path.join(DEPLOY_CONFIG.buildDir, 'deployment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`   ✓ Deployment report saved to ${reportPath}\n`);
  return report;
}

// 主部署流程
async function main() {
  const startTime = Date.now();
  
  try {
    preDeployChecks();
    
    const packageInfo = createReleasePackage();
    
    if (packageInfo.files.length === 0) {
      throw new Error('No release files found to deploy');
    }
    
    // 上传到各个目标
    if (DEPLOY_CONFIG.githubToken) {
      await uploadToGitHub(packageInfo);
    }
    
    const report = generateDeploymentReport(packageInfo);
    
    const endTime = Date.now();
    const deployTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('🎉 Deployment completed successfully!');
    console.log(`⏱️  Deployment time: ${deployTime}s`);
    console.log(`📦 Version: ${DEPLOY_CONFIG.version}`);
    console.log(`🌍 Environment: ${DEPLOY_CONFIG.environment}\n`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// 处理命令行参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Mira Desktop Deployment Script

Usage: node scripts/deploy.js [options]

Environment Variables:
  NODE_ENV          Deployment environment (production/staging)
  GITHUB_TOKEN      GitHub personal access token for releases
  UPLOAD_ENDPOINT   Custom upload endpoint URL
  RELEASE_NOTES     Release notes for the deployment

Examples:
  NODE_ENV=production GITHUB_TOKEN=... node scripts/deploy.js
  NODE_ENV=staging node scripts/deploy.js
`);
  process.exit(0);
}

main();
