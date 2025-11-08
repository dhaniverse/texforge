#!/usr/bin/env node
/**
 * Auto-install toktx binary for the current platform
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const platform = process.platform;
const arch = process.arch;

// KTX-Software release version
const KTX_VERSION = '4.3.2';
const INSTALL_DIR = path.join(__dirname, '..', 'bin');

// Platform-specific download URLs
const DOWNLOAD_URLS = {
  win32: `https://github.com/KhronosGroup/KTX-Software/releases/download/v${KTX_VERSION}/KTX-Software-${KTX_VERSION}-Windows-x64.exe`,
  darwin: null, // Use brew on macOS
  linux: `https://github.com/KhronosGroup/KTX-Software/releases/download/v${KTX_VERSION}/KTX-Software-${KTX_VERSION}-Linux-x86_64.AppImage`
};

async function checkIfToktxExists() {
  try {
    execSync('toktx --version', { stdio: 'ignore' });
    console.log('✓ toktx already installed globally');
    return true;
  } catch {
    return false;
  }
}

async function installMacOS() {
  console.log('📦 Installing toktx via Homebrew...');
  try {
    // Check if brew is installed
    execSync('which brew', { stdio: 'ignore' });
    
    console.log('   Running: brew install ktx');
    execSync('brew install ktx', { stdio: 'inherit' });
    console.log('✓ toktx installed successfully via Homebrew');
    return true;
  } catch (error) {
    console.warn('⚠️  Homebrew not found.');
    console.warn('\n   Option 1 - Install Homebrew (recommended):');
    console.warn('   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
    console.warn('   Then run: brew install ktx');
    console.warn('\n   Option 2 - Manual download:');
    console.warn('   https://github.com/KhronosGroup/KTX-Software/releases');
    return false;
  }
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'texforge-installer' } }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

async function installWindows() {
  console.log('📦 Downloading toktx for Windows...');
  
  // Create bin directory
  if (!fs.existsSync(INSTALL_DIR)) {
    fs.mkdirSync(INSTALL_DIR, { recursive: true });
  }

  const installerPath = path.join(INSTALL_DIR, 'ktx-installer.exe');
  
  try {
    await downloadFile(DOWNLOAD_URLS.win32, installerPath);
    console.log('✓ Downloaded KTX-Software installer');
    console.log('⚠️  Please run the installer manually:');
    console.log(`   ${installerPath}`);
    console.log('   Or download from: https://github.com/KhronosGroup/KTX-Software/releases');
    return false;
  } catch (error) {
    console.error('✗ Download failed:', error.message);
    console.warn('⚠️  Please install manually from:');
    console.warn('   https://github.com/KhronosGroup/KTX-Software/releases');
    return false;
  }
}

async function installLinux() {
  console.log('📦 Downloading toktx for Linux...');
  
  if (!fs.existsSync(INSTALL_DIR)) {
    fs.mkdirSync(INSTALL_DIR, { recursive: true });
  }

  const appImagePath = path.join(INSTALL_DIR, 'ktx.AppImage');
  
  try {
    await downloadFile(DOWNLOAD_URLS.linux, appImagePath);
    
    // Make executable
    fs.chmodSync(appImagePath, 0o755);
    
    console.log('✓ Downloaded KTX-Software AppImage');
    console.log('⚠️  Please extract and add to PATH:');
    console.log(`   ${appImagePath}`);
    console.log('   Or install via package manager');
    return false;
  } catch (error) {
    console.error('✗ Download failed:', error.message);
    console.warn('⚠️  Please install manually from:');
    console.warn('   https://github.com/KhronosGroup/KTX-Software/releases');
    return false;
  }
}

async function main() {
  console.log('\n🔧 texforge: Checking for toktx...\n');

  // Check if already installed globally
  if (await checkIfToktxExists()) {
    return;
  }

  console.log('⚠️  toktx not found, attempting to install...\n');

  let success = false;

  switch (platform) {
    case 'darwin':
      success = await installMacOS();
      break;
    case 'win32':
      success = await installWindows();
      break;
    case 'linux':
      success = await installLinux();
      break;
    default:
      console.warn(`⚠️  Unsupported platform: ${platform}`);
      console.warn('   Please install toktx manually from:');
      console.warn('   https://github.com/KhronosGroup/KTX-Software/releases');
  }

  if (!success) {
    console.log('\n⚠️  texforge requires toktx to be installed');
    console.log('   Run "texforge check" to verify installation\n');
  }
}

main().catch(console.error);
