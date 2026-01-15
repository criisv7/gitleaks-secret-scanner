const https = require("https");
const readline = require("readline");

/**
 * Fetch available Gitleaks versions from GitHub API
 * @param {number} limit - Maximum number of versions to fetch
 * @returns {Promise<Array>} Array of version objects with tag_name
 */
async function fetchAvailableVersions(limit = 20) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/gitleaks/gitleaks/releases?per_page=${limit}`,
      method: "GET",
      headers: {
        "User-Agent": "gitleaks-secret-scanner",
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
          return reject(
            new Error(`GitHub API returned status ${res.statusCode}`)
          );
        }

        try {
          const releases = JSON.parse(data);
          const versions = releases
            .filter((release) => !release.prerelease && !release.draft)
            .map((release) => ({
              version: release.tag_name.replace("v", ""),
              name: release.name || release.tag_name,
              published: release.published_at,
              url: release.html_url,
            }));
          resolve(versions);
        } catch (error) {
          reject(
            new Error(`Failed to parse GitHub API response: ${error.message}`)
          );
        }
      });
    });

    req.on("error", (error) => {
      reject(
        new Error(`Failed to fetch versions from GitHub: ${error.message}`)
      );
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(
        new Error("Request timeout - GitHub API took too long to respond")
      );
    });

    req.end();
  });
}

/**
 * Display versions and prompt user to select one
 * @param {Array} versions - Array of version objects
 * @returns {Promise<string>} Selected version number
 */
async function promptVersionSelection(versions) {
  console.log("\n📦 Available Gitleaks Versions:\n");

  versions.forEach((version, index) => {
    const date = new Date(version.published).toLocaleDateString();
    console.log(`  ${index + 1}. ${version.version} (${date})`);
  });

  console.log(`  ${versions.length + 1}. Cancel\n`);

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Select a version number: ", (answer) => {
      rl.close();

      const selection = parseInt(answer, 10);

      if (
        isNaN(selection) ||
        selection < 1 ||
        selection > versions.length + 1
      ) {
        return reject(new Error("Invalid selection"));
      }

      if (selection === versions.length + 1) {
        console.log("Installation cancelled.");
        return reject(new Error("USER_CANCELLED"));
      }

      const selectedVersion = versions[selection - 1].version;
      console.log(`\n✅ Selected version: ${selectedVersion}\n`);
      resolve(selectedVersion);
    });
  });
}

/**
 * Interactive version selection flow
 * @returns {Promise<string>} Selected version number
 */
async function selectVersion() {
  try {
    console.log("🔍 Fetching available Gitleaks versions ...\n");
    const versions = await fetchAvailableVersions(20);

    if (versions.length === 0) {
      console.error("⚠️  No versions found from GitHub API");
      console.log("\n💡 Fallback Options:\n");
      console.log("1. Check available versions manually:");
      console.log("   https://github.com/gitleaks/gitleaks/releases\n");
      console.log("2. Specify a version directly:");
      console.log("   npx gitleaks-secret-scanner --gitleaks-version 8.30.0\n");
      console.log(
        "3. Use the default latest version (retry later):\n   npx gitleaks-secret-scanner\n"
      );
      process.exit(1);
    }

    const selectedVersion = await promptVersionSelection(versions);
    return selectedVersion;
  } catch (error) {
    if (error.message === "USER_CANCELLED") {
      process.exit(0);
    }

    console.error(`\n❌ Failed to fetch versions: ${error.message}\n`);

    if (
      error.message.includes("GitHub API") ||
      error.message.includes("fetch")
    ) {
      console.log("💡 This usually happens due to:\n");
      console.log("1. Network connectivity issues");
      console.log("2. GitHub API rate limiting");
      console.log("3. Firewall or proxy blocking GitHub\n");
      console.log("📖 Alternative Options:\n");
      console.log("1. Try again in a few minutes");
      console.log(
        "2. Check versions at: https://github.com/gitleaks/gitleaks/releases"
      );
      console.log("3. Specify version directly:");
      console.log("   npx gitleaks-secret-scanner --gitleaks-version 8.30.0\n");
    }

    process.exit(1);
  }
}

/**
 * List all cached Gitleaks versions
 * @returns {Array<string>} Array of version numbers
 */
function listCachedVersions() {
  const os = require("os");
  const fs = require("fs");
  const path = require("path");

  const cacheDir = path.join(os.homedir(), ".gitleaks-cache");

  if (!fs.existsSync(cacheDir)) {
    return [];
  }

  return fs
    .readdirSync(cacheDir)
    .filter((dir) => dir.startsWith("v"))
    .map((dir) => dir.replace("v", ""))
    .sort((a, b) => {
      // Sort by semantic version (latest first)
      const aParts = a.split(".").map(Number);
      const bParts = b.split(".").map(Number);

      for (let i = 0; i < 3; i++) {
        if (aParts[i] !== bParts[i]) {
          return bParts[i] - aParts[i];
        }
      }
      return 0;
    });
}

/**
 * Remove a specific cached version
 * @param {string} version - Version to remove (without 'v' prefix)
 * @returns {boolean} Success status
 */
function removeCachedVersion(version) {
  const os = require("os");
  const fs = require("fs-extra");
  const path = require("path");

  const cacheDir = path.join(os.homedir(), ".gitleaks-cache");
  const versionDir = path.join(cacheDir, `v${version}`);

  if (fs.existsSync(versionDir)) {
    fs.removeSync(versionDir);
    return true;
  }

  return false;
}

/**
 * Clean up old versions, keeping only the specified number of latest versions
 * @param {number} keepCount - Number of latest versions to keep
 * @returns {Array<string>} Array of removed versions
 */
function cleanOldVersions(keepCount = 3) {
  const versions = listCachedVersions();

  if (versions.length <= keepCount) {
    return [];
  }

  const toRemove = versions.slice(keepCount);
  const removed = [];

  toRemove.forEach((version) => {
    if (removeCachedVersion(version)) {
      removed.push(version);
    }
  });

  return removed;
}

/**
 * Interactive version cleanup
 * @returns {Promise<void>}
 */
async function manageVersions() {
  const versions = listCachedVersions();

  if (versions.length === 0) {
    console.log("\nℹ️  No cached Gitleaks versions found.\n");
    return;
  }

  console.log("\n📦 Cached Gitleaks Versions:\n");

  versions.forEach((version, index) => {
    const size = getCachedVersionSize(version);
    console.log(`  ${index + 1}. ${version} (${size})`);
  });

  console.log(`\nTotal versions: ${versions.length}`);
  console.log(
    `Cache location: ${require("path").join(
      require("os").homedir(),
      ".gitleaks-cache"
    )}\n`
  );

  // If only one version, no cleanup needed
  if (versions.length === 1) {
    console.log("💡 Only one version cached. No cleanup needed.\n");
    return;
  }

  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    // Different prompt for 2 versions vs 3+
    if (versions.length === 2) {
      rl.question("Delete the older version? [y/N]: ", (answer) => {
        rl.close();

        const shouldDelete = answer.trim().toLowerCase() === 'y';

        if (shouldDelete) {
          const removed = cleanOldVersions(1);
          if (removed.length > 0) {
            console.log(`\n✅ Removed: ${removed[0]}\n`);
          }
        } else {
          console.log("\n✅ Keeping both versions.\n");
        }

        resolve();
      });
    } else {
      const defaultKeep = 2;
      rl.question(`Clean up old versions? Keep latest [${defaultKeep}]: `, (answer) => {
        rl.close();

        const keepCount = answer.trim() === '' ? defaultKeep : parseInt(answer, 10);

        if (isNaN(keepCount) || keepCount < 1) {
          console.log("\n❌ Invalid number. Aborting.\n");
          resolve();
          return;
        }

        const removed = cleanOldVersions(keepCount);

        if (removed.length > 0) {
          console.log(`\n✅ Removed ${removed.length} old version(s):`);
          removed.forEach((v) => console.log(`   - ${v}`));
          console.log("");
        } else {
          console.log(`\n✅ Keeping all ${versions.length} version(s).\n`);
        }

        resolve();
      });
    }
  });
}

/**
 * Get the size of a cached version directory
 * @param {string} version - Version number
 * @returns {string} Human-readable size
 */
function getCachedVersionSize(version) {
  const os = require("os");
  const fs = require("fs");
  const path = require("path");

  const cacheDir = path.join(os.homedir(), ".gitleaks-cache");
  const versionDir = path.join(cacheDir, `v${version}`);

  if (!fs.existsSync(versionDir)) {
    return "0 MB";
  }

  try {
    const stats = fs.statSync(path.join(versionDir, "gitleaks"));
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    return `${sizeMB} MB`;
  } catch {
    return "Unknown";
  }
}

module.exports = {
  fetchAvailableVersions,
  promptVersionSelection,
  selectVersion,
  listCachedVersions,
  removeCachedVersion,
  cleanOldVersions,
  manageVersions,
};
