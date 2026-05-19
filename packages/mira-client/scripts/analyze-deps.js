#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting dependency analysis for Mira Desktop...\n');

// 分析配置
const ANALYSIS_CONFIG = {
  sourceDir: 'src',
  outputDir: 'docs',
  formats: ['html', 'svg', 'json'],
  includeTests: false,
  includeNodeModules: false
};

// 确保输出目录存在
function ensureOutputDir() {
  if (!fs.existsSync(ANALYSIS_CONFIG.outputDir)) {
    fs.mkdirSync(ANALYSIS_CONFIG.outputDir, { recursive: true });
    console.log(`✓ Created output directory: ${ANALYSIS_CONFIG.outputDir}`);
  }
}

// 检查 dependency-cruiser 是否可用
function checkDependencyCruiser() {
  try {
    execSync('npx depcruise --version', { stdio: 'pipe' });
    console.log('✓ dependency-cruiser is available\n');
  } catch (error) {
    console.error('❌ dependency-cruiser is not installed');
    console.error('   Run: npm install --save-dev dependency-cruiser');
    process.exit(1);
  }
}

// 生成 HTML 格式的依赖图
function generateHtmlReport() {
  console.log('📊 Generating HTML dependency report...');
  
  try {
    const outputFile = path.join(ANALYSIS_CONFIG.outputDir, 'dependencies.html');
    const cmd = `npx depcruise ${ANALYSIS_CONFIG.sourceDir} --output-type html --output-to ${outputFile}`;
    
    execSync(cmd, { stdio: 'pipe' });
    console.log(`   ✓ HTML report saved to ${outputFile}`);
    
    return outputFile;
  } catch (error) {
    console.error('   ❌ Failed to generate HTML report:', error.message);
    return null;
  }
}

// 生成 SVG 格式的依赖图
function generateSvgDiagram() {
  console.log('🎨 Generating SVG dependency diagram...');
  
  try {
    const outputFile = path.join(ANALYSIS_CONFIG.outputDir, 'dependencies.svg');
    const cmd = `npx depcruise ${ANALYSIS_CONFIG.sourceDir} --output-type dot | dot -T svg > ${outputFile}`;
    
    execSync(cmd, { stdio: 'pipe', shell: true });
    console.log(`   ✓ SVG diagram saved to ${outputFile}`);
    
    return outputFile;
  } catch (error) {
    console.error('   ❌ Failed to generate SVG diagram (Graphviz may not be installed)');
    console.error('   Install Graphviz: https://graphviz.org/download/');
    return null;
  }
}

// 生成 JSON 格式的依赖数据
function generateJsonReport() {
  console.log('📄 Generating JSON dependency data...');
  
  try {
    const outputFile = path.join(ANALYSIS_CONFIG.outputDir, 'dependencies.json');
    const cmd = `npx depcruise ${ANALYSIS_CONFIG.sourceDir} --output-type json --output-to ${outputFile}`;
    
    execSync(cmd, { stdio: 'pipe' });
    console.log(`   ✓ JSON data saved to ${outputFile}`);
    
    return outputFile;
  } catch (error) {
    console.error('   ❌ Failed to generate JSON report:', error.message);
    return null;
  }
}

// 检测循环依赖
function detectCircularDependencies() {
  console.log('🔄 Checking for circular dependencies...');
  
  try {
    const result = execSync(`npx depcruise ${ANALYSIS_CONFIG.sourceDir} --output-type err-only`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (result.trim()) {
      console.log('   ⚠️  Circular dependencies found:');
      console.log(result);
      return false;
    } else {
      console.log('   ✓ No circular dependencies detected');
      return true;
    }
  } catch (error) {
    if (error.stdout && error.stdout.includes('circular')) {
      console.log('   ⚠️  Circular dependencies found:');
      console.log(error.stdout);
      return false;
    } else {
      console.log('   ✓ No circular dependencies detected');
      return true;
    }
  }
}

// 分析依赖统计
function analyzeDependencyStats(jsonFile) {
  console.log('📈 Analyzing dependency statistics...');
  
  if (!fs.existsSync(jsonFile)) {
    console.log('   ⚠️  JSON report not available for statistics');
    return;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const modules = data.modules || [];
    
    // 计算统计信息
    const stats = {
      totalModules: modules.length,
      totalDependencies: modules.reduce((sum, mod) => sum + (mod.dependencies?.length || 0), 0),
      modulesByType: {},
      dependencyTypes: {},
      orphanModules: modules.filter(mod => (mod.dependencies?.length || 0) === 0 && !mod.dependents?.length).length,
      hubModules: modules.filter(mod => (mod.dependents?.length || 0) > 5).length
    };
    
    // 按文件类型分组
    modules.forEach(mod => {
      const ext = path.extname(mod.source);
      stats.modulesByType[ext] = (stats.modulesByType[ext] || 0) + 1;
      
      if (mod.dependencies) {
        mod.dependencies.forEach(dep => {
          const type = dep.dependencyType || 'unknown';
          stats.dependencyTypes[type] = (stats.dependencyTypes[type] || 0) + 1;
        });
      }
    });
    
    console.log('\n📊 Dependency Statistics:');
    console.log(`   Total Modules: ${stats.totalModules}`);
    console.log(`   Total Dependencies: ${stats.totalDependencies}`);
    console.log(`   Orphan Modules: ${stats.orphanModules}`);
    console.log(`   Hub Modules (>5 dependents): ${stats.hubModules}`);
    
    console.log('\n   Modules by Type:');
    Object.entries(stats.modulesByType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`     ${type || 'no extension'}: ${count}`);
      });
    
    console.log('\n   Dependencies by Type:');
    Object.entries(stats.dependencyTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
    
    // 保存统计信息
    const statsFile = path.join(ANALYSIS_CONFIG.outputDir, 'dependency-stats.json');
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
    console.log(`\n   ✓ Statistics saved to ${statsFile}`);
    
  } catch (error) {
    console.error('   ❌ Failed to analyze statistics:', error.message);
  }
}

// 生成依赖报告摘要
function generateSummaryReport() {
  console.log('\n📋 Generating dependency analysis summary...');
  
  const summaryFile = path.join(ANALYSIS_CONFIG.outputDir, 'dependency-summary.md');
  const timestamp = new Date().toISOString();
  
  const summary = `# Dependency Analysis Summary

Generated on: ${timestamp}

## Overview

This document provides a summary of the dependency analysis for Mira Desktop application.

## Files Generated

- \`dependencies.html\` - Interactive HTML dependency graph
- \`dependencies.svg\` - Static SVG dependency diagram  
- \`dependencies.json\` - Raw dependency data
- \`dependency-stats.json\` - Statistical analysis
- \`dependency-summary.md\` - This summary document

## Analysis Configuration

- Source Directory: \`${ANALYSIS_CONFIG.sourceDir}\`
- Output Directory: \`${ANALYSIS_CONFIG.outputDir}\`
- Include Tests: ${ANALYSIS_CONFIG.includeTests}
- Include Node Modules: ${ANALYSIS_CONFIG.includeNodeModules}

## How to Use

1. **HTML Report**: Open \`dependencies.html\` in a web browser for an interactive view
2. **SVG Diagram**: View \`dependencies.svg\` for a static overview of the dependency graph
3. **JSON Data**: Use \`dependencies.json\` for programmatic analysis
4. **Statistics**: Check \`dependency-stats.json\` for numerical insights

## Rules Applied

The analysis uses the rules defined in \`.dependency-cruiser.js\`:

- ✅ Circular dependency detection
- ✅ Orphan module detection  
- ✅ Deprecated dependency detection
- ✅ Missing dependency detection
- ✅ Spec file isolation
- ✅ Dev dependency validation

## Recommendations

1. Review any circular dependencies and refactor if possible
2. Consider removing orphan modules that are no longer needed
3. Update deprecated dependencies to their latest versions
4. Keep test files properly isolated from production code

---

*Generated by Mira Desktop build system*
`;

  fs.writeFileSync(summaryFile, summary);
  console.log(`   ✓ Summary saved to ${summaryFile}`);
}

// 主分析流程
async function main() {
  const startTime = Date.now();
  
  try {
    ensureOutputDir();
    checkDependencyCruiser();
    
    // 生成各种格式的报告
    const htmlFile = generateHtmlReport();
    const svgFile = generateSvgDiagram();
    const jsonFile = generateJsonReport();
    
    // 执行分析
    const hasCircularDeps = !detectCircularDependencies();
    
    // 生成统计和摘要
    if (jsonFile) {
      analyzeDependencyStats(jsonFile);
    }
    
    generateSummaryReport();
    
    const endTime = Date.now();
    const analysisTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 Dependency analysis completed!');
    console.log(`⏱️  Analysis time: ${analysisTime}s`);
    
    if (hasCircularDeps) {
      console.log('\n⚠️  Warning: Circular dependencies detected - consider refactoring');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// 处理命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Mira Desktop Dependency Analyzer

Usage: node scripts/analyze-deps.js [options]

Options:
  --help, -h     Show this help message
  --format       Specify output format (html,svg,json,all) [default: all]
  --no-svg       Skip SVG generation (useful if Graphviz is not installed)
  
Examples:
  node scripts/analyze-deps.js
  node scripts/analyze-deps.js --format html
  node scripts/analyze-deps.js --no-svg
`);
  process.exit(0);
}

// 处理格式选项
if (args.includes('--no-svg')) {
  ANALYSIS_CONFIG.formats = ANALYSIS_CONFIG.formats.filter(f => f !== 'svg');
}

const formatIndex = args.findIndex(arg => arg === '--format');
if (formatIndex !== -1 && args[formatIndex + 1]) {
  const requestedFormat = args[formatIndex + 1];
  if (['html', 'svg', 'json', 'all'].includes(requestedFormat)) {
    ANALYSIS_CONFIG.formats = requestedFormat === 'all' 
      ? ['html', 'svg', 'json'] 
      : [requestedFormat];
  }
}

// 运行分析
main();
