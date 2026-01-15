const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const tar = require("tar");
const unzipper = require("unzipper");

let packageInfo = {
  name: "gitleaks-secret-scanner",
  version: "2.1.1",
  repository: { url: "https://github.com/criisv7/gitleaks-secret-scanner" },
};

try {
  const packagePath = path.join(__dirname, "..", "package.json");
  if (fs.existsSync(packagePath)) {
    packageInfo = require(packagePath);
  }
} catch (e) {
  console.warn("⚠️ Error loading package.json:", e.message);
}

const CACHE_DIR = path.join(os.homedir(), ".gitleaks-cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: "/repos/gitleaks/gitleaks/releases/latest",
      method: "GET",
      headers: {
        "User-Agent": `${packageInfo.name}/${packageInfo.version}`,
        Accept: "application/vnd.github+json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode !== 200) {
          console.warn("⚠️ Could not fetch latest version, using fallback");
          return resolve("8.30.0"); // Fallback to known stable version
        }

        try {
          const release = JSON.parse(data);
          const version = release.tag_name.replace("v", "");
          resolve(version);
        } catch (error) {
          console.warn("⚠️ Could not parse latest version, using fallback");
          resolve("8.30.0");
        }
      });
    });

    req.on("error", () => {
      console.warn("⚠️ Network error fetching latest version, using fallback");
      resolve("8.30.0");
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.warn("⚠️ Timeout fetching latest version, using fallback");
      resolve("8.30.0");
    });

    req.end();
  });
}

module.exports.installGitleaks = async (config) => {
  const platform = os.platform();
  const arch = os.arch();
  const binaryName = platform === "win32" ? "gitleaks.exe" : "gitleaks";

  let version = config.version;

  // Fetch latest version if not specified
  if (!version) {
    version = await fetchLatestVersion();
  }

  console.log("Using Gitleaks version:", version);

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
    await downloadAndExtract(downloadUrl, versionDir, platform);
    if (platform !== "win32") {
      fs.chmodSync(binaryPath, 0o755);
    }

    return binaryPath;
  } catch (error) {
    console.error(
      `\n❌ Failed to download or extract Gitleaks: ${error.message}\n`
    );

    if (error.message.includes("404")) {
      console.error(
        `⚠️  Binary not found for your system (platform: ${platform}, arch: ${arch})`
      );
      console.log("\n📖 Manual Installation Options:\n");
      console.log(`1. Download directly from GitHub:`);
      console.log(
        `   https://github.com/gitleaks/gitleaks/releases/tag/v${version}`
      );
      console.log(`\n2. Use a different version:`);
      console.log(`   npx gitleaks-secret-scanner --select-version`);
      console.log(`\n3. Install Gitleaks globally and use it directly:`);
      console.log(`   brew install gitleaks  # macOS`);
      console.log(
        `   # or download from: https://github.com/gitleaks/gitleaks/releases\n`
      );
    } else if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      console.error(`⚠️  Network error - unable to reach GitHub`);
      console.log("\n💡 Troubleshooting:\n");
      console.log(`1. Check your internet connection`);
      console.log(`2. Check if you're behind a proxy or firewall`);
      console.log(`3. Try again later`);
      console.log(
        `4. Download manually from: https://github.com/gitleaks/gitleaks/releases\n`
      );
    } else if (error.code === "EACCES" || error.code === "EPERM") {
      console.error(`⚠️  Permission denied - cannot write to cache directory`);
      console.log("\n💡 Solutions:\n");
      console.log(`1. Run with appropriate permissions`);
      console.log(`2. Check permissions on: ${CACHE_DIR}`);
      console.log(`3. Try: sudo chown -R $(whoami) ${CACHE_DIR}\n`);
    } else {
      console.log("\n💡 Troubleshooting:\n");
      console.log(
        `1. Try a different version: npx gitleaks-secret-scanner --select-version`
      );
      console.log(
        `2. Check available versions: https://github.com/gitleaks/gitleaks/releases`
      );
      console.log(
        `3. Report this issue: https://github.com/criisv7/gitleaks-secret-scanner/issues\n`
      );
    }

    throw error;
  }
};

function getFileName(version, platform, arch) {
  let osName, archName;

  switch (platform) {
    case "darwin":
      osName = "darwin";
      break;
    case "linux":
      osName = "linux";
      break;
    case "win32":
      osName = "windows";
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  switch (arch) {
    case "x64":
      archName = "x64";
      break;
    case "arm64":
      archName = "arm64";
      break;
    case "arm":
      // Node.js doesn't easily distinguish between armv6 and armv7.
      // default to the more common armv7 but warn the user.
      archName = "armv7";
      console.warn(
        `⚠️ Detected 'arm' architecture. Assuming 'armv7'. If you need 'armv6', this may fail.`
      );
      break;
    case "ia32":
      // This case handles both 'linux_x32' and 'windows_x32'.
      archName = "x32";
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}.`);
  }

  const ext = osName === "windows" ? "zip" : "tar.gz";
  const fileName = `gitleaks_${version}_${osName}_${archName}.${ext}`;
  return fileName;
}

async function downloadAndExtract(url, targetDir, platform) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": `${packageInfo.name}/${packageInfo.version}`,
    };

    const request = https.get(url, { headers }, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        downloadAndExtract(response.headers.location, targetDir, platform)
          .then(resolve)
          .catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(
          new Error(`Download failed with status code: ${response.statusCode}`)
        );
      }

      let extractor;
      if (platform === "win32") {
        extractor = unzipper.Extract({ path: targetDir });
      } else {
        extractor = tar.x({ C: targetDir });
      }

      response
        .pipe(extractor)
        .on("finish", () => {
          resolve();
        })
        .on("error", (err) => {
          const archiveType = platform === "win32" ? "ZIP" : "TAR";
          reject(new Error(`${archiveType} extraction failed: ${err.message}`));
        });
    });

    request.on("error", (err) => {
      reject(new Error(`Download request failed: ${err.message}`));
    });
  });
}
