const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const tar = require('tar');
const unzipper = require('unzipper').Open;
const axios = require('axios');
let debugMode = false;

module.exports.setDebug = (debug) => {
  debugMode = debug;
};

let packageInfo = { 
  name: 'gitleaks-secret-scanner', 
  version: '2.0.1',
  repository: { url: 'https://github.com/criisv7/gitleaks-secret-scanner' }
};

try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packagePath)) {
    packageInfo = require(packagePath);
  } else {
    console.warn('⚠️ package.json not found, using fallback info');
  }
} catch (e) {
  console.warn('⚠️ Error loading package.json:', e.message);
}

const CACHE_DIR = path.join(os.homedir(), '.gitleaks-cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log('Created cache directory:', CACHE_DIR);
}

module.exports.installGitleaks = async (config) => {
  const platform = os.platform();
  const arch = os.arch();
  const binaryName = platform === 'win32' ? 'gitleaks.exe' : 'gitleaks';

  let version = config.version || '8.18.2'; // Using a stable, well-known version as fallback
  console.log('Using Gitleaks version:', version);
  
  const versionDir = path.join(CACHE_DIR, `v${version}`);
  const binaryPath = path.join(versionDir, binaryName);

  if (fs.existsSync(binaryPath)) {
    console.log('Using cached binary:', binaryPath);
    return binaryPath;
  }

  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
    console.log('Created version directory:', versionDir);
  }

  try {
    const fileName = getFileName(version, platform, arch);
    const downloadUrl = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${fileName}`;
    console.log('Downloading from:', downloadUrl);
    await downloadAndExtract(downloadUrl, versionDir);
    
    if (platform !== 'win32') {
      fs.chmodSync(binaryPath, 0o755);
      console.log('Made binary executable');
    }
    
    return binaryPath;
  } catch (error) {
    console.error(`❌ Failed to download or extract Gitleaks: ${error.message}`);
    if (error.message.includes('404') || error.message.includes('status code: 404')) {
        console.error(`Could not find the Gitleaks binary for your system (platform: ${platform}, arch: ${arch}).`);
        console.error('Please check the Gitleaks releases page for supported architectures.');
    }
    throw error; 
  }
};

// *** THE ONLY MODIFIED FUNCTION ***
function getFileName(version, platform, arch) {
  let osName, archName;

  switch (platform) {
    case 'darwin':
      osName = 'darwin';
      break;
    case 'linux':
      osName = 'linux';
      break;
    case 'win32':
      osName = 'windows';
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // More comprehensive architecture mapping
  switch (arch) {
    case 'x64':
      // Gitleaks v8 uses 'x64' for Darwin/Linux and 'amd64' for older Windows,
      // but 'x64' is the most common for recent releases across all OS.
      archName = 'x64';
      break;
    case 'arm64':
      archName = 'arm64';
      break;
    case 'arm':
      // Node.js 'arm' can map to different ARM versions.
      // We default to armv7 as it's a common baseline.
      // Some systems might need more specific detection.
      archName = 'armv7';
      console.warn(`⚠️ Detected 'arm' architecture. Assuming 'armv7'. If this fails, your system may require a different ARM version (e.g., armv6).`);
      break;
    case 'ia32':
      // Node.js 'ia32' (32-bit) maps to Gitleaks 'x32' for Linux or 'x86' for older Windows.
      // For Linux, it's 'x32'.
      if (osName === 'linux') {
        archName = 'x32';
      } else {
        // Fallback for Windows 32-bit (though less common now)
        archName = 'x86'; 
      }
      break;
    default:
      // If the architecture is not explicitly handled, we throw an error.
      throw new Error(`Unsupported architecture: ${arch}. Please check Gitleaks releases for a compatible binary.`);
  }

  const ext = (osName === 'windows') ? 'zip' : 'tar.gz';
  const fileName = `gitleaks_${version}_${osName}_${archName}.${ext}`;
  
  console.log('Generated file name:', fileName);
  return fileName;
}


async function downloadAndExtract(url, targetDir) {
  return new Promise((resolve, reject) => {
    console.log('Starting download...');
    const headers = {
      'User-Agent': `${packageInfo.name}/${packageInfo.version}`
    };
    if (debugMode) {
      console.log('[DEBUG] Starting download from:', url);
    }

    const request = https.get(url, { headers }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log('Redirecting to:', response.headers.location);
        downloadAndExtract(response.headers.location, targetDir).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`Download failed with status code: ${response.statusCode}`));
      }

      const extractor = url.endsWith('.zip')
        ? unzipper.Extract({ path: targetDir })
        : tar.x({ C: targetDir });

      response.pipe(extractor)
        .on('finish', () => { 
          console.log('Extraction complete');
          resolve();
        })
        .on('error', (err) => {
          reject(new Error(`Extraction failed: ${err.message}`));
        });
    });

    request.on('error', (err) => {
      reject(new Error(`Download request failed: ${err.message}`));
    });
  });
}