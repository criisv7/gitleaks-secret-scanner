#!/usr/bin/env node
const { installGitleaks } = require("../lib/installer");
const { setupHusky, isHuskyInstalled } = require("../lib/husky-installer");
const { loadConfig } = require("../lib/config");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

async function promptSetupHusky() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n🎯 Optional: Git Hook Setup");
    console.log("─────────────────────────────");
    rl.question(
      "Would you like to setup git hooks to run Gitleaks on every commit? (y/N): ",
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
      }
    );
  });
}

function isGitRepository() {
  try {
    return fs.existsSync(path.join(process.cwd(), ".git"));
  } catch {
    return false;
  }
}

function hasPackageJson() {
  try {
    return fs.existsSync(path.join(process.cwd(), "package.json"));
  } catch {
    return false;
  }
}

async function main() {
  try {
    console.log("\n🚀 Installing Gitleaks Secret Scanner...\n");

    // Install Gitleaks binary
    const config = await loadConfig();
    await installGitleaks(config);
    console.log("✅ Gitleaks installation complete.\n");

    // Check if we should prompt for Husky setup
    // Only prompt if:
    // 1. In a git repository
    // 2. Has package.json
    // 3. Installing as a project dependency (not global)
    const isProjectInstall = process.env.npm_config_global !== "true";
    const isGitRepo = isGitRepository();
    const hasPkgJson = hasPackageJson();

    if (isProjectInstall && isGitRepo && hasPkgJson) {
      const shouldSetup = await promptSetupHusky();

      if (shouldSetup) {
        console.log("");
        await setupHusky();
      } else {
        console.log("\nℹ️  You can setup git hooks later by running:");
        console.log("   npx gitleaks-secret-scanner --setup-husky\n");
      }
    } else if (isProjectInstall) {
      // Show info message about manual setup
      if (!isGitRepo) {
        console.log("ℹ️  Not in a git repository.");
      }
      if (!hasPkgJson) {
        console.log("ℹ️  No package.json found.");
      }
      if (!isGitRepo || !hasPkgJson) {
        console.log(
          "   To setup git hooks, run from your project root: npx gitleaks-secret-scanner --setup-husky\n"
        );
      }
    }
  } catch (error) {
    // Silently fail during postinstall to not break npm install
    console.warn(`\n⚠️  Warning during installation: ${error.message}\n`);
  }
}

main();
