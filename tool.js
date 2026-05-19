#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load configuration from external file
let config;
try {
  // Determine system-specific config file name
  const platform = process.platform;
  const systemSuffix = platform === 'win32' ? 'windows' : (platform === 'darwin' ? 'macos' : 'linux');
  const configFileName = `dependency-switch-config-${systemSuffix}.json`;
  const configPath = path.resolve(configFileName);

  // Fall back to original filename if system-specific file doesn't exist
  const fallbackConfigPath = path.resolve('dependency-switch-config.json');
  const finalConfigPath = fs.existsSync(configPath) ? configPath : fallbackConfigPath;

  const configContent = fs.readFileSync(finalConfigPath, 'utf8');
  config = JSON.parse(configContent);
  console.log(`📋 Using configuration file: ${path.basename(finalConfigPath)}`);
} catch (error) {
  console.error('❌ Error loading configuration file:', error.message);
  console.error('Make sure dependency-switch-config.json or system-specific config file exists in the current directory');
  process.exit(1);
}

const PACKAGE_MAPPINGS = config.packageMappings;
const TARGET_FILES = config.targetFiles;

/**
 * Check if a package is enabled
 * @param {string} packageName - Name of the package
 * @returns {boolean} True if package is enabled, false otherwise
 */
function isPackageEnabled(packageName) {
  if (!PACKAGE_MAPPINGS[packageName]) {
    return false;
  }

  const mapping = PACKAGE_MAPPINGS[packageName];
  // If enable is not specified, default to true for backward compatibility
  return mapping.enable !== false;
}

/**
 * Display usage information
 */
function showUsage() {
  console.log(`
Usage: node tool.js [mode] [packages...] [options]

Modes:
  online    - Switch to online versions (npm registry, reads current version from package.json)
  offline   - Switch to local file paths
  list      - List current versions and paths for packages
  build     - Build packages without publishing
  publish   - Build, version bump, publish packages and update all dependencies
  
Packages (optional, if not specified, all configured packages will be used):
  ${Object.keys(PACKAGE_MAPPINGS).join(', ')}

Options:
  --version=X.X.X   - Specify which online version to use (only for online mode)
  --path=file:path  - Specify which offline path to use (only for offline mode)
  --dry-run         - Show what would be done without executing (for build/publish mode)
  --version-bump=type - Version bump type: patch, minor, major (for build/publish mode, default: patch)

Examples:
  node tool.js online
  node tool.js offline  
  node tool.js online mira-app-core --version=1.0.1
  node tool.js offline mira-app-core --path="file:../../packages/mira-app-core"
  node tool.js list
  node tool.js list mira-app-core
  node tool.js build mira-app-core
  node tool.js build --dry-run
  node tool.js publish mira-app-core mira-storage-sqlite
  node tool.js publish --dry-run
  node tool.js publish --version-bump=minor
  node tool.js publish mira-app-core --version-bump=major --dry-run

Configuration:
The script uses package mappings from dependency-switch-config.json
Version information is read directly from each package's package.json file
Packages with "enable": false will be skipped for all operations
`);
}

/**
 * Get current version from package.json
 * @param {string} packageName - Name of the package
 * @returns {string|null} Current version or null if not found
 */
function getCurrentVersion(packageName) {
  if (!PACKAGE_MAPPINGS[packageName]) {
    return null;
  }

  const mapping = PACKAGE_MAPPINGS[packageName];
  const buildPath = mapping.buildPath;

  if (!buildPath) {
    console.warn(`⚠️  No buildPath configured for ${packageName}`);
    return null;
  }

  try {
    const packageJsonPath = path.resolve(buildPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.warn(`⚠️  package.json not found at: ${packageJsonPath}`);
      return null;
    }

    const content = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(content);

    return packageJson.version || null;
  } catch (error) {
    console.warn(`⚠️  Error reading version for ${packageName}:`, error.message);
    return null;
  }
}

/**
 * List available versions and paths for packages
 * @param {string[]} targetPackages - Array of package names to list
 */
function listPackageOptions(targetPackages) {
  console.log('📋 Available package options:\n');

  targetPackages.forEach(packageName => {
    if (PACKAGE_MAPPINGS[packageName]) {
      const mapping = PACKAGE_MAPPINGS[packageName];
      const currentVersion = getCurrentVersion(packageName);

      const isEnabled = isPackageEnabled(packageName);
      console.log(`📦 ${packageName} ${isEnabled ? '✅' : '❌ (disabled)'}:`);

      console.log('  Current version:');
      if (currentVersion) {
        console.log(`    ^${currentVersion} (read from package.json)`);
      } else {
        console.log(`    Unable to read version`);
      }

      console.log('  Offline path:');
      console.log(`    ${mapping.defaultOffline}`);

      console.log('  Build configuration:');
      console.log(`    Path: ${mapping.buildPath || 'Not configured'}`);
      console.log(`    Command: ${mapping.buildCommand || 'npm install && npm run build && npm publish'}`);

      console.log('');
    }
  });
}

/**
 * Build packages without publishing
 * @param {string[]} targetPackages - Array of package names to build
 * @param {boolean} dryRun - Whether to show commands without executing
 * @param {string} versionBump - Type of version bump: patch, minor, major
 */
async function buildPackages(targetPackages, dryRun = false, versionBump = 'patch') {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  console.log(`🔨 ${dryRun ? 'Dry run - showing' : 'Executing'} build for packages: ${targetPackages.join(', ')}`);
  console.log(`📈 Version bump type: ${versionBump}\n`);

  for (const packageName of targetPackages) {
    if (!PACKAGE_MAPPINGS[packageName]) {
      console.warn(`⚠️  Package ${packageName} not found in configuration, skipping`);
      continue;
    }

    const mapping = PACKAGE_MAPPINGS[packageName];
    const buildPath = mapping.buildPath || `packages/${packageName}`;
    // Extract build command without publish
    const fullCommand = mapping.buildCommand || 'npm install && npm run build';
    const buildCommand = fullCommand.replace(/\s*&&\s*npm\s+publish\s*$/, '').trim();

    console.log(`\n📦 Processing ${packageName}:`);
    console.log(`   Path: ${buildPath}`);


    // Step 1: Execute build command (without publish)
    console.log(`   Command: ${buildCommand}`);

    if (dryRun) {
      console.log(`   📋 Would execute: cd ${buildPath} && ${buildCommand}`);
      continue;
    }

    try {
      console.log(`   🔄 Executing build...`);

      // Check if build path exists
      const buildAbsolutePath = path.resolve(buildPath);
      if (!fs.existsSync(buildAbsolutePath)) {
        console.error(`   ❌ Build path does not exist: ${buildAbsolutePath}`);
        continue;
      }

      // Execute the build command (without publish)
      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: buildAbsolutePath,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stdout) {
        console.log(`   📝 Output: ${stdout.trim()}`);
      }

      if (stderr) {
        console.warn(`   ⚠️  Warnings: ${stderr.trim()}`);
      }

      console.log(`   ✅ Successfully built ${packageName}`);

    } catch (error) {
      console.error(`   ❌ Error building ${packageName}:`, error.message);
      if (error.stdout) console.log(`   📝 Stdout: ${error.stdout}`);
      if (error.stderr) console.error(`   📝 Stderr: ${error.stderr}`);
    }
  }

  console.log(`\n🎉 Build process completed!`);
}

/**
 * Build, publish packages and update all dependencies
 * @param {string[]} targetPackages - Array of package names to publish
 * @param {boolean} dryRun - Whether to show commands without executing
 * @param {string} versionBump - Type of version bump: patch, minor, major
 */
async function publishPackages(targetPackages, dryRun = false, versionBump = 'patch') {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  console.log(`🚀 ${dryRun ? 'Dry run - showing' : 'Executing'} build, publish and update dependencies for packages: ${targetPackages.join(', ')}`);
  console.log(`📈 Version bump type: ${versionBump}\n`);

  const publishedVersions = new Map();

  for (const packageName of targetPackages) {
    if (!PACKAGE_MAPPINGS[packageName]) {
      console.warn(`⚠️  Package ${packageName} not found in configuration, skipping`);
      continue;
    }

    const mapping = PACKAGE_MAPPINGS[packageName];
    const buildPath = mapping.buildPath || `packages/${packageName}`;
    const buildCommand = mapping.buildCommand || 'npm install && npm run build && npm publish';

    console.log(`\n📦 Processing ${packageName}:`);
    console.log(`   Path: ${buildPath}`);

    // Step 1: Update version
    const newVersion = updatePackageVersion(buildPath, packageName, versionBump, dryRun);
    if (!newVersion) {
      console.error(`   ❌ Failed to update version for ${packageName}, skipping`);
      continue;
    }

    publishedVersions.set(packageName, newVersion);

    // Step 2: Execute build and publish command
    console.log(`   Command: ${buildCommand}`);

    if (dryRun) {
      console.log(`   📋 Would execute: cd ${buildPath} && ${buildCommand}`);
      console.log(`   📋 Would update configuration file defaultOnline to: ${newVersion}`);
      continue;
    }

    try {
      console.log(`   🔄 Executing build and publish...`);

      // Check if build path exists
      const buildAbsolutePath = path.resolve(buildPath);
      if (!fs.existsSync(buildAbsolutePath)) {
        console.error(`   ❌ Build path does not exist: ${buildAbsolutePath}`);
        continue;
      }

      // Execute the build and publish command
      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: buildAbsolutePath,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stdout) {
        console.log(`   📝 Output: ${stdout.trim()}`);
      }

      if (stderr) {
        console.warn(`   ⚠️  Warnings: ${stderr.trim()}`);
      }

      console.log(`   ✅ Successfully built and published ${packageName} v${newVersion}`);

      // Step 3: Update configuration file
      updateConfigurationFile(packageName, newVersion, false);

    } catch (error) {
      console.error(`   ❌ Error building/publishing ${packageName}:`, error.message);
      if (error.stdout) console.log(`   📝 Stdout: ${error.stdout}`);
      if (error.stderr) console.error(`   📝 Stderr: ${error.stderr}`);

      // Remove from published versions since it failed
      publishedVersions.delete(packageName);
    }
  }

  // Step 4: Update all target files with new versions
  if (publishedVersions.size > 0 && !dryRun) {
    console.log(`\n🔄 Updating dependencies in all target files...`);

    let totalUpdated = 0;
    for (const relativePath of TARGET_FILES) {
      const absolutePath = path.resolve(relativePath);
      console.log(`\n📁 Processing: ${relativePath}`);

      if (updatePackageJsonWithVersions(absolutePath, publishedVersions)) {
        totalUpdated++;
      }
    }

    console.log(`\n✅ Updated dependencies in ${totalUpdated} file(s)`);
  } else if (dryRun && publishedVersions.size > 0) {
    console.log(`\n📋 Would update dependencies in all target files with new versions:`);
    publishedVersions.forEach((version, packageName) => {
      console.log(`   ${packageName}: ^${version}`);
    });
  }

  console.log(`\n🎉 Publish process completed!`);
}

/**
 * Increment version number
 * @param {string} version - Current version (e.g., "1.0.2")
 * @param {string} bumpType - Type of bump: "patch", "minor", "major"
 * @returns {string} New version
 */
function incrementVersion(version, bumpType = 'patch') {
  const parts = version.split('.').map(Number);

  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}`);
  }

  let [major, minor, patch] = parts;

  switch (bumpType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
    default:
      patch += 1;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

/**
 * Update configuration file with new version
 * @param {string} packageName - Name of the package
 * @param {string} newVersion - New version to add
 * @param {boolean} dryRun - Whether to show changes without executing
 */
function updateConfigurationFile(packageName, newVersion, dryRun = false) {
  try {
    // Determine system-specific config file name
    const platform = process.platform;
    const systemSuffix = platform === 'win32' ? 'windows' : (platform === 'darwin' ? 'macos' : 'linux');
    const configFileName = `dependency-switch-config-${systemSuffix}.json`;
    const configPath = path.resolve(configFileName);

    // Fall back to original filename if system-specific file doesn't exist
    const fallbackConfigPath = path.resolve('dependency-switch-config.json');
    const finalConfigPath = fs.existsSync(configPath) ? configPath : fallbackConfigPath;

    if (dryRun) {
      console.log(`   📋 Would update configuration file ${path.basename(finalConfigPath)} defaultOnline to: ${newVersion}`);
      return;
    }

    // Read current config
    const configContent = fs.readFileSync(finalConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    if (config.packageMappings[packageName]) {
      // Update defaultOnline to new version
      config.packageMappings[packageName].defaultOnline = newVersion;

      // Write updated config back to file
      fs.writeFileSync(finalConfigPath, JSON.stringify(config, null, 2) + '\n');
      console.log(`   ✅ Updated configuration file ${path.basename(finalConfigPath)} defaultOnline to: ${newVersion}`);
    } else {
      console.warn(`   ⚠️  Package ${packageName} not found in configuration`);
    }

  } catch (error) {
    console.error(`   ❌ Error updating configuration file:`, error.message);
  }
}

/**
 * Update version in package.json file
 * @param {string} packagePath - Path to package.json file
 * @param {string} packageName - Name of the package (for config update)
 * @param {string} bumpType - Type of version bump
 * @param {boolean} dryRun - Whether to show changes without executing
 * @returns {string|null} New version if successful, null if failed
 */
function updatePackageVersion(packagePath, packageName, bumpType = 'patch', dryRun = false) {
  try {
    const packageJsonPath = path.join(packagePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.error(`   ❌ package.json not found in: ${packagePath}`);
      return null;
    }

    const content = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(content);

    if (!packageJson.version) {
      console.error(`   ❌ No version field found in: ${packageJsonPath}`);
      return null;
    }

    const oldVersion = packageJson.version;
    const newVersion = incrementVersion(oldVersion, bumpType);

    console.log(`   📈 Version: ${oldVersion} → ${newVersion} (${bumpType})`);

    if (!dryRun) {
      packageJson.version = newVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`   ✅ Version updated in package.json`);

      // Update configuration file with new version
      updateConfigurationFile(packageName, newVersion, dryRun);
    } else {
      console.log(`   📋 Would update version in package.json`);

      // Show what would be updated in configuration file
      updateConfigurationFile(packageName, newVersion, dryRun);
    }

    return newVersion;

  } catch (error) {
    console.error(`   ❌ Error updating version in ${packagePath}:`, error.message);
    return null;
  }
}

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed arguments
 */
function parseArguments(args) {
  const result = {
    mode: '',
    packages: [],
    version: null,
    path: null,
    dryRun: false,
    versionBump: 'patch'
  };

  if (args.length === 0) {
    return result;
  }

  result.mode = args[0];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--version=')) {
      result.version = arg.substring(10);
    } else if (arg.startsWith('--path=')) {
      result.path = arg.substring(7);
    } else if (arg.startsWith('--version-bump=')) {
      const bumpType = arg.substring(15);
      if (['patch', 'minor', 'major'].includes(bumpType)) {
        result.versionBump = bumpType;
      } else {
        console.warn(`⚠️  Invalid version bump type: ${bumpType}, using 'patch'`);
      }
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (!arg.startsWith('--')) {
      result.packages.push(arg);
    }
  }

  return result;
}
/**
 * Update dependencies in a package.json file with specific versions
 * @param {string} filePath - Path to package.json file
 * @param {Map} publishedVersions - Map of package name to version
 */
function updatePackageJsonWithVersions(filePath, publishedVersions) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    // Read and parse package.json
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);

    let hasChanges = false;

    // Update dependencies
    ['dependencies', 'devDependencies', "peerDependencies"].forEach(depType => {
      if (packageJson[depType]) {
        publishedVersions.forEach((version, packageName) => {
          if (packageJson[depType][packageName]) {
            const oldValue = packageJson[depType][packageName];
            const newValue = `^${version}`;

            packageJson[depType][packageName] = newValue;

            if (oldValue !== newValue) {
              console.log(`  ${packageName}: ${oldValue} → ${newValue}`);
              hasChanges = true;
            }
          }
        });
      }
    });

    // Write back to file if there were changes
    if (hasChanges) {
      fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ No changes needed: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Update dependencies in a package.json file
 * @param {string} filePath - Path to package.json file
 * @param {string} mode - 'online' or 'offline'
 * @param {string[]} targetPackages - Array of package names to update
 * @param {string|null} customVersion - Custom version for online mode
 * @param {string|null} customPath - Custom path for offline mode
 */
function updatePackageJson(filePath, mode, targetPackages, customVersion = null, customPath = null) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    // Read and parse package.json
    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);

    let hasChanges = false;

    // Update dependencies
    ['dependencies', 'devDependencies', "peerDependencies"].forEach(depType => {
      if (packageJson[depType]) {
        targetPackages.forEach(packageName => {
          if (packageJson[depType][packageName] && PACKAGE_MAPPINGS[packageName]) {
            const mapping = PACKAGE_MAPPINGS[packageName];
            const oldValue = packageJson[depType][packageName];
            let newValue;

            if (mode === 'online') {
              // Use custom version or get current version from package.json
              const version = customVersion || getCurrentVersion(packageName);
              if (!version) {
                console.warn(`⚠️  Could not determine version for ${packageName}, skipping`);
                return;
              }
              newValue = `^${version}`;
            } else if (mode === 'offline') {
              // Use custom path or default offline path
              newValue = customPath || mapping.defaultOffline;
            }

            packageJson[depType][packageName] = newValue;

            if (oldValue !== newValue) {
              console.log(`  ${packageName}: ${oldValue} → ${newValue}`);
              hasChanges = true;
            }
          }
        });
      }
    });

    // Write back to file if there were changes
    if (hasChanges) {
      fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ No changes needed: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) {
    showUsage();
    return;
  }

  const parsed = parseArguments(rawArgs);
  const mode = parsed.mode;

  if (!['online', 'offline', 'list', 'build', 'publish'].includes(mode)) {
    console.error('❌ Invalid mode. Use "online", "offline", "list", "build", or "publish"');
    showUsage();
    process.exit(1);
  }

  // Determine which packages to work with
  const specifiedPackages = parsed.packages;
  let candidatePackages = specifiedPackages.length > 0
    ? specifiedPackages.filter(pkg => PACKAGE_MAPPINGS[pkg])
    : Object.keys(PACKAGE_MAPPINGS);

  // Filter out disabled packages
  const targetPackages = candidatePackages.filter(pkg => isPackageEnabled(pkg));
  const disabledPackages = candidatePackages.filter(pkg => !isPackageEnabled(pkg));

  if (specifiedPackages.length > 0) {
    const invalidPackages = specifiedPackages.filter(pkg => !PACKAGE_MAPPINGS[pkg]);
    if (invalidPackages.length > 0) {
      console.warn(`⚠️  Unknown packages (will be ignored): ${invalidPackages.join(', ')}`);
    }
  }

  if (disabledPackages.length > 0) {
    console.warn(`⚠️  Disabled packages (will be skipped): ${disabledPackages.join(', ')}`);
  }

  if (targetPackages.length === 0) {
    console.error('❌ No valid packages specified');
    process.exit(1);
  }

  // Handle list mode
  if (mode === 'list') {
    listPackageOptions(targetPackages);
    return;
  }

  // Handle build mode
  if (mode === 'build') {
    await buildPackages(targetPackages, parsed.dryRun, parsed.versionBump);
    return;
  }

  // Handle publish mode
  if (mode === 'publish') {
    await publishPackages(targetPackages, parsed.dryRun, parsed.versionBump);
    return;
  }

  // Validate custom options for online/offline modes
  if (mode === 'online' && parsed.version) {
    console.log(`   Using custom version: ${parsed.version} (override current package.json version)`);
  }

  if (mode === 'offline' && parsed.path) {
    console.log(`   Using custom path: ${parsed.path} (override default offline path)`);
  }

  console.log(`🔄 Switching to ${mode} mode for packages: ${targetPackages.join(', ')}`);
  if (parsed.version) console.log(`   Using custom version: ${parsed.version}`);
  if (parsed.path) console.log(`   Using custom path: ${parsed.path}`);
  console.log('');

  // Process each target file
  let totalUpdated = 0;
  TARGET_FILES.forEach(relativePath => {
    const absolutePath = path.resolve(relativePath);
    console.log(`\n📁 Processing: ${relativePath}`);

    if (updatePackageJson(absolutePath, mode, targetPackages, parsed.version, parsed.path)) {
      totalUpdated++;
    }
  });

  console.log(`\n🎉 Process completed! Updated ${totalUpdated} file(s).`);

  if (totalUpdated > 0) {
    console.log(`\n💡 Don't forget to run 'npm install' in the updated packages to apply changes.`);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  updatePackageJson,
  updatePackageJsonWithVersions,
  listPackageOptions,
  buildPackages,
  publishPackages,
  incrementVersion,
  updatePackageVersion,
  updateConfigurationFile,
  parseArguments,
  getCurrentVersion,
  isPackageEnabled,
  PACKAGE_MAPPINGS,
  TARGET_FILES
};
