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


// Safe package info loading
let packageInfo = { 
  name: 'gitleaks-secret-scanner', 
  version: '1.0.2',
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
const VERSION_FILE = path.join(CACHE_DIR, 'version-info.json');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log('Created cache directory:', CACHE_DIR);
}

// Get latest version from GitHub API
async function getLatestVersion() {
  try {
    console.log('Fetching latest version from GitHub API...');
    const { data } = await axios.get(
      'https://api.github.com/repos/gitleaks/gitleaks/releases/latest',
      {
        headers: {
          'User-Agent': `${packageInfo.name}/${packageInfo.version}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 3000
      }
    );
    const version = data.tag_name.replace(/^v/, '');
    console.log('Latest Gitleaks version:', version);
    return version;
  } catch (error) {
    console.warn('⚠️ Could not fetch latest version from GitHub API');
    console.warn('Error details:', error.message);
    return '8.28.0'; // Fallback version
  }
}

// Check for new versions weekly
async function checkVersionUpdate() {
  let versionInfo = { checkedAt: 0 };
  
  if (fs.existsSync(VERSION_FILE)) {
    versionInfo = JSON.parse(fs.readFileSync(VERSION_FILE));
  }
  
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  
  if (Date.now() - versionInfo.checkedAt > oneWeek) {
    try {
      const latest = await getLatestVersion();
      versionInfo.latest = latest;
      versionInfo.checkedAt = Date.now();
      fs.writeFileSync(VERSION_FILE, JSON.stringify(versionInfo));
    } catch (error) {
      console.warn('⚠️ Version check update failed:', error.message);
    }
  }
  console.log('Version info:', versionInfo);
  return versionInfo;
}

module.exports.installGitleaks = async (config) => {
  const platform = os.platform();
  const arch = os.arch();
  const binaryName = platform === 'win32' ? 'gitleaks.exe' : 'gitleaks';

  // Determine version
  let version = config.version  || '8.27.2';
  console.log('Using Gitleaks version:', version);
  
  const versionDir = path.join(CACHE_DIR, `v${version}`);
  const binaryPath = path.join(versionDir, binaryName);

  // Use cached binary if available
  if (fs.existsSync(binaryPath)) {
    console.log('Using cached binary:', binaryPath);
    return binaryPath;
  }

  // Create version directory
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
    console.log('Created version directory:', versionDir);
  }

  // Download and extract
  const fileName = getFileName(version, platform, arch);
  const downloadUrl = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${fileName}`;
  console.log('Downloading from:', downloadUrl);
  await downloadAndExtract(downloadUrl, versionDir);
  
  // Make executable
  if (platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
    console.log('Made binary executable');
  }
  
  return binaryPath;
};

function getFileName(version, platform, arch) {
  // Normalize architecture names
  const normalizedArch = arch === 'x64' ? 'amd64' : 
                         arch.startsWith('arm') ? 'arm64' : arch;
  
  // Map platform names
  const platformMap = {
    'darwin': 'darwin',
    'linux': 'linux',
    'win32': 'windows'
  };
  
  const osName = platformMap[platform] || platform;
  if (!osName) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  const ext = platform === 'win32' ? 'zip' : 'tar.gz';
  const fileName = `gitleaks_${version}_${osName}_${normalizedArch}.${ext}`;
  
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
    https.get(url, { headers }, response => {
      console.log('Response status:', response.statusCode);
      
      // Handle redirects
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        const redirectUrl = response.headers.location;
        console.log('Redirecting to:', redirectUrl);
        return downloadAndExtract(redirectUrl, targetDir)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Download failed: ${response.statusCode} ${response.statusMessage}`));
      }

      const extractor = url.endsWith('.zip')
        ? unzipper.Extract({ path: targetDir })
        : tar.x({ C: targetDir });

      response.pipe(extractor)
        .on('close', () => {
          console.log('Extraction complete');
          resolve();
        })
        .on('error', reject);
    }).on('error', reject);
  });
}