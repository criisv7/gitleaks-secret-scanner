#!/usr/bin/env node
const { installGitleaks } = require("../lib/installer");
const { runScan } = require("../lib/scanner");
const { loadConfig } = require("../lib/config");
const { showAttribution, disclaimer } = require("../lib/attribution");

const isInstallOnly = process.argv.includes("--install-only");
const isInit = process.argv.includes("--init");

(async () => {
  try {
    showAttribution();

    if (isInit) {
      await initConfig();
      return;
    }

    if (process.env.GITLEAKS_SKIP_INSTALL) {
      console.log("Skipping installation (GITLEAKS_SKIP_INSTALL detected)");
      return;
    }

    const config = await loadConfig();
    const binaryPath = await installGitleaks(config);

    if (!isInstallOnly) {
      await runScan(binaryPath, config);
      console.log("✅ No secrets found in commit");
    }
  } catch (error) {
    console.error(`❌ ${error.message}`);
    console.log(disclaimer);

    // Provide troubleshooting information
    console.log("\nTroubleshooting:");
    console.log("1. Check your internet connection");
    console.log("2. Try setting GITLEAKS_VERSION in .gitleaksrc");
    console.log(
      "3. Report issues at https://github.com/criisv7/gitleaks-secret-scanner/issues"
    );

    process.exit(1);
  }
})();

async function initConfig() {
  const fs = require("fs-extra");
  const path = require("path");

  const targetPath = path.join(process.cwd(), ".gitleaks.toml");

  if (fs.existsSync(targetPath)) {
    console.log("ℹ️ .gitleaks.toml already exists in this project");
    return;
  }

  const templatePath = path.join(__dirname, "../templates/default.toml");
  await fs.copy(templatePath, targetPath);
  console.log("✅ Created .gitleaks.toml configuration file");
}
