#!/usr/bin/env node
const { installGitleaks } = require("../lib/installer");
const { runScan } = require("../lib/scanner");
const { loadConfig } = require("../lib/config");
const { showAttribution, version, options } = require("../lib/attribution");
const isInstallOnly = process.argv.includes("--install-only");
const isInit = process.argv.includes("--init");
const showVersion = process.argv.includes("--version");
const showAbout = process.argv.includes("--about");
const showOptions = process.argv.includes("--options");

if (showVersion) {
  version();
  process.exit(0);
}
// Handle about command
if (showAbout) {
  showAttribution();
  process.exit(0);
}
if (showOptions) {
  options();
  process.exit(0);
}
let config;

(async () => {
  try {
    if (isInit) {
      await initConfig();
      return;
    }

    if (process.env.GITLEAKS_SKIP_INSTALL) {
      console.log("Skipping installation (GITLEAKS_SKIP_INSTALL detected)");
      return;
    }

    config = await loadConfig();
    const binaryPath = await installGitleaks(config);

    if (!isInstallOnly) {
      await runScan(binaryPath, config);

      if (!config.htmlReport) {
        console.log("✅ No secrets found in commit");
      } else {
        console.log("✅ Scan completed successfully");
      }
    }
    process.exit(0);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    if (
      error.message.includes("Secrets detected") &&
      config &&
      config.htmlReport
    ) {
      console.log(`ℹ️ HTML report generated at: ${config.htmlReport}`);
    } else if (error.message.includes("Report generation")) {
      console.log(
        "⚠️ Report generation failed. Try running with --debug for more info"
      );
    }

    console.log("Node version:", process.version);
    console.log("Platform:", process.platform);
    console.log("Architecture:", process.arch);
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
