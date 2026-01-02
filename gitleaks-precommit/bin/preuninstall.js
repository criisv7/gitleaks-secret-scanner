#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const CACHE_DIR = path.join(os.homedir(), ".gitleaks-cache");

function showCleanupInfo() {
  // Check if cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    return;
  }

  // Count versions
  const versions = fs
    .readdirSync(CACHE_DIR)
    .filter((dir) => dir.startsWith("v"));

  if (versions.length === 0) {
    return;
  }

  // Calculate total size
  let totalSize = 0;
  versions.forEach((version) => {
    const versionPath = path.join(CACHE_DIR, version);
    try {
      const binaryPath = path.join(versionPath, "gitleaks");
      if (fs.existsSync(binaryPath)) {
        const stats = fs.statSync(binaryPath);
        totalSize += stats.size;
      }
    } catch (e) {
      // Ignore errors
    }
  });

  const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log("🗑️  Gitleaks Binary Cleanup");
  console.log("=".repeat(60));
  console.log(
    `\nFound ${versions.length} cached Gitleaks version(s) using ${sizeMB} MB:`
  );
  console.log(`Location: ${CACHE_DIR}\n`);

  versions.forEach((v) => {
    console.log(`  • ${v.replace("v", "")}`);
  });

  console.log("\n💡 To free up disk space, run:");
  console.log(`   rm -rf ${CACHE_DIR}`);
  console.log("\n   Or use:");
  console.log("   npx gitleaks-secret-scanner --clean-all");
  console.log("\n" + "=".repeat(60) + "\n");
}

// Only show info for local installs (not global)
// Note: Interactive prompts don't work in npm lifecycle hooks
if (process.env.npm_config_global !== "true") {
  try {
    showCleanupInfo();
  } catch (error) {
    // Silently fail - don't break uninstall process
  }
}
