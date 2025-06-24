#!/usr/bin/env node
const { installGitleaks } = require("../lib/installer");
const { runScan, runPassThroughCommand } = require("../lib/scanner");
const { loadConfig } = require("../lib/config");
const { showAttribution, version, options } = require("../lib/attribution");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--options")) {
    options();
    return { exitCode: 0 };
  }
  if (args.includes("--about")) {
    showAttribution();
    return { exitCode: 0 };
  }
  if (args.includes("--version")) {
    version();
    return { exitCode: 0 };
  }
  if (args.includes("--init")) {
    await initConfig();
    return { exitCode: 0 };
  }
  if (args.includes("--install-only")) {
    const config = await loadConfig();
    await installGitleaks(config);
    console.log("✅ Gitleaks installation complete.");
    return { exitCode: 0 };
  }

  const passThroughCommands = ["help", "version", "protect"];
  if (passThroughCommands.includes(args[0]) || args.includes("--help")) {
    const binaryPath = await installGitleaks({}); // Ensure gitleaks is installed
    const exitCode = await runPassThroughCommand(binaryPath, args);
    return { exitCode };
  }

  const config = await loadConfig();
  const binaryPath = await installGitleaks(config);
  const foundSecrets = await runScan(binaryPath, config);
  return { foundSecrets };
}

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

main()
  .then(({ foundSecrets, exitCode }) => {
    if (foundSecrets === true) {
      console.error(`\n❌ Secrets were detected.`);
      process.exit(1);
    } else if (foundSecrets === false) {
      console.log("\n✅ Scan complete. No secrets found.");
      process.exit(0);
    } else {
      process.exit(exitCode || 0);
    }
  })
  .catch((error) => {
    console.error(`\n❌ An unexpected error occurred: ${error.message}`);
    process.exit(2);
  });
