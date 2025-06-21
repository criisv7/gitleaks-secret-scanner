const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const crypto = require('crypto');
const axios = require('axios');
const tar = require('tar');
const unzipper = require('unzipper').Open;
const fsExtra = require('fs-extra');

const CACHE_DIR = path.join(os.homedir(), '.gitleaks-cache');
const VERSION_FILE = path.join(CACHE_DIR, 'version-info.json');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Get latest version from GitHub API
async function getLatestVersion() {
  try {
    const { data } = await axios.get(
      'https://api.github.com/repos/gitleaks/gitleaks/releases/latest',
      {
        headers: {
          'User-Agent': `gitleaks-precommit/${require('../../package.json').version} (+https://github.com/your-username/gitleaks-precommit)`,
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 3000
      }
    );
    return data.tag_name.replace(/^v/, '');
  } catch (error) {
    console.warn('⚠️ Could not fetch latest version from GitHub API');
    console.warn('Using fallback version. Error details:', error.message);
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
  
  return versionInfo;
}

module.exports.installGitleaks = async (config) => {
  const platform = os.platform();
  const arch = os.arch();
  const binaryName = platform === 'win32' ? 'gitleaks.exe' : 'gitleaks';

  // Determine version (config > cache > latest)
  let version = config.version || (await checkVersionUpdate()).latest || '8.28.0';
  
  const versionDir = path.join(CACHE_DIR, `v${version}`);
  const binaryPath = path.join(versionDir, binaryName);

  // Use cached binary if available
  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  // Create version directory
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  // Download and extract
  const fileName = getFileName(version, platform, arch);
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${fileName}`;
  
  await downloadAndExtract(url, versionDir);
  
  // Make executable
  if (platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }
  
  return binaryPath;
};

function getFileName(version, platform, arch) {
  // Normalize architecture names
  const normalizedArch = arch === 'x64' ? 'amd64' : arch;
  
  // Map platform names to Gitleaks naming convention
  const platformMap = {
    'darwin': 'darwin',
    'linux': 'linux',
    'win32': 'windows'
  };
  
  const osName = platformMap[platform] || platform;
  const ext = platform === 'win32' ? 'zip' : 'tar.gz';
  
  return `gitleaks_${version}_${osName}_${normalizedArch}.${ext}`;
}

async function downloadAndExtract(url, targetDir) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': `gitleaks-precommit/${require('../../package.json').version} (+https://github.com/your-username/gitleaks-precommit)`
    };

    https.get(url, { headers }, response => {
      // Handle GitHub rate limits
      if (response.statusCode === 403 && response.headers['x-ratelimit-remaining'] === '0') {
        const resetTime = new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000);
        return reject(new Error(
          `GitHub API rate limit exceeded. Try again after ${resetTime.toLocaleTimeString()}`
        ));
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Download failed: ${response.statusCode} ${response.statusMessage}`));
      }

      const extractor = url.endsWith('.zip')
        ? unzipper.Extract({ path: targetDir })
        : tar.x({ C: targetDir });

      response.pipe(extractor)
        .on('close', resolve)
        .on('error', reject);
    }).on('error', reject);
  });
}