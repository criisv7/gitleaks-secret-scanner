const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const tar = require('tar');
const unzipper = require('unzipper');

let packageInfo = { 
  name: 'gitleaks-secret-scanner', 
  version: '1.2.2',
  repository: { url: 'https://github.com/criisv7/gitleaks-secret-scanner' }
};

try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packagePath)) {
    packageInfo = require(packagePath);
  }
} catch (e) {
  console.warn('⚠️ Error loading package.json:', e.message);
}

const CACHE_DIR = path.join(os.homedir(), '.gitleaks-cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

module.exports.installGitleaks = async (config) => {
  const platform = os.platform();
  const arch = os.arch();
  const binaryName = platform === 'win32' ? 'gitleaks.exe' : 'gitleaks';

  let version = config.version || '8.27.2';
  console.log('Using Gitleaks version:', version);
  
  const versionDir = path.join(CACHE_DIR, `v${version}`);
  const binaryPath = path.join(versionDir, binaryName);

  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  try {
    const fileName = getFileName(version, platform, arch);
    const downloadUrl = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${fileName}`;
    console.log('Downloading from:', downloadUrl);
    await downloadAndExtract(downloadUrl, versionDir, platform);
    if (platform !== 'win32') {
      fs.chmodSync(binaryPath, 0o755);
    }
    
    console.log('✅ Gitleaks binary successfully installed.');
    return binaryPath;
  } catch (error) {
    console.error(`❌ Failed to download or extract Gitleaks: ${error.message}`);
    if (error.message.includes('404')) {
        console.error(`Could not find the Gitleaks binary for your system (platform: ${platform}, arch: ${arch}).`);
    }
    throw error; 
  }
};

function getFileName(version, platform, arch) {
  let osName, archName;

  switch (platform) {
    case 'darwin': osName = 'darwin'; break;
    case 'linux': osName = 'linux'; break;
    case 'win32': osName = 'windows'; break;
    default: throw new Error(`Unsupported platform: ${platform}`);
  }

  switch (arch) {
    case 'x64':
      archName = 'x64';
      break;
    case 'arm64':
      archName = 'arm64';
      break;
    case 'arm':
      // Node.js doesn't easily distinguish between armv6 and armv7.
      // default to the more common armv7 but warn the user.
      archName = 'armv7';
      console.warn(`⚠️ Detected 'arm' architecture. Assuming 'armv7'. If you need 'armv6', this may fail.`);
      break;
    case 'ia32':
      // This case handles both 'linux_x32' and 'windows_x32'.
      archName = 'x32';
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}.`);
  }

  const ext = (osName === 'windows') ? 'zip' : 'tar.gz';
  const fileName = `gitleaks_${version}_${osName}_${archName}.${ext}`;
  
  console.log(`Generated file name for download: ${fileName}`);
  return fileName;
}

async function downloadAndExtract(url, targetDir, platform) {
  return new Promise((resolve, reject) => {
    console.log('Starting download...');
    const headers = { 'User-Agent': `${packageInfo.name}/${packageInfo.version}` };

    const request = https.get(url, { headers }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log('Redirecting to:', response.headers.location);
        downloadAndExtract(response.headers.location, targetDir, platform).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`Download failed with status code: ${response.statusCode}`));
      }

      let extractor;
      if (platform === 'win32') {
        console.log('Using ZIP extractor for Windows...');
        extractor = unzipper.Extract({ path: targetDir });
      } else {
        console.log('Using TAR extractor for macOS/Linux...');
        extractor = tar.x({ C: targetDir });
      }

      response.pipe(extractor)
        .on('finish', () => { 
          console.log('Extraction complete.');
          resolve();
        })
        .on('error', (err) => {
          const archiveType = platform === 'win32' ? 'ZIP' : 'TAR';
          reject(new Error(`${archiveType} extraction failed: ${err.message}`));
        });
    });

    request.on('error', (err) => {
      reject(new Error(`Download request failed: ${err.message}`));
    });
  });
}