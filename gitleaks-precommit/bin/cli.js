#!/usr/bin/env node
const { installGitleaks } = require("../lib/installer");
const { runScan, runPassThroughCommand } = require("../lib/scanner");
const { loadConfig } = require("../lib/config");
const { showAttribution, version, options } = require("../lib/attribution");
const { selectVersion, manageVersions } = require("../lib/version-manager");
const { setupHusky } = require("../lib/husky-installer");

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
  if (args.includes("--engine-version")) {
    await showEngineVersion();
    return { exitCode: 0 };
  }
  if (args.includes("--init")) {
    await initConfig();
    return { exitCode: 0 };
  }
  if (args.includes("--setup-husky")) {
    // Extract custom command if provided
    const commandIndex = args.indexOf("--command");
    const customCommand =
      commandIndex !== -1 && args[commandIndex + 1]
        ? args[commandIndex + 1]
        : undefined;

    await setupHusky({ command: customCommand });
    return { exitCode: 0 };
  }
  if (args.includes("--select-version")) {
    const selectedVersion = await selectVersion();
    const config = { version: selectedVersion };
    await installGitleaks(config);
    console.log(
      `✅ Gitleaks version ${selectedVersion} installed successfully.`
    );
    return { exitCode: 0 };
  }
  if (args.includes("--manage-versions")) {
    await manageVersions();
    return { exitCode: 0 };
  }
  if (args.includes("--clean-all")) {
    await cleanAllVersions();
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

async function showEngineVersion() {
  const { execSync } = require("child_process");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  try {
    const config = await loadConfig();
    const binaryPath = await installGitleaks(config);

    console.log("\n📊 Gitleaks Engine Information:\n");

    // Get version from binary
    try {
      const versionOutput = execSync(`"${binaryPath}" version`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      console.log(`   Engine Version: ${versionOutput.trim()}`);
    } catch (error) {
      console.log("   Engine Version: Could not determine");
    }

    // Show binary location
    console.log(`   Binary Location: ${binaryPath}`);

    // Show if binary exists
    const exists = fs.existsSync(binaryPath);
    console.log(`   Binary Exists: ${exists ? "✅ Yes" : "❌ No"}`);

    // Show cache directory
    const cacheDir = path.join(os.homedir(), ".gitleaks-cache");
    console.log(`   Cache Directory: ${cacheDir}`);

    // List installed versions
    if (fs.existsSync(cacheDir)) {
      const versions = fs
        .readdirSync(cacheDir)
        .filter((dir) => dir.startsWith("v"))
        .map((dir) => dir.replace("v", ""));

      if (versions.length > 0) {
        console.log(`   Installed Versions: ${versions.join(", ")}`);
      } else {
        console.log("   Installed Versions: None");
      }
    }

    console.log("");
  } catch (error) {
    console.error(`\n❌ Error checking engine version: ${error.message}\n`);
  }
}

async function cleanAllVersions() {
  const fs = require("fs-extra");
  const path = require("path");
  const os = require("os");
  const readline = require("readline");

  const cacheDir = path.join(os.homedir(), ".gitleaks-cache");

  if (!fs.existsSync(cacheDir)) {
    console.log("\nℹ️  No cached Gitleaks versions found.\n");
    return;
  }

  const versions = fs
    .readdirSync(cacheDir)
    .filter((dir) => dir.startsWith("v"));

  if (versions.length === 0) {
    console.log("\nℹ️  No cached Gitleaks versions found.\n");
    return;
  }

  console.log("\n🗑️  Delete All Cached Versions");
  console.log("────────────────────────────────");
  console.log(`Found ${versions.length} cached version(s):`);
  versions.forEach((v) => console.log(`  - ${v.replace("v", "")}`));
  console.log(`\nCache location: ${cacheDir}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Delete all cached versions? (y/N): ", (answer) => {
      rl.close();

      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        try {
          fs.removeSync(cacheDir);
          console.log(
            `\n✅ Deleted all ${versions.length} cached version(s).\n`
          );
        } catch (error) {
          console.error(`\n❌ Failed to delete cache: ${error.message}\n`);
        }
      } else {
        console.log("\n❌ Cancelled. No versions deleted.\n");
      }

      resolve();
    });
  });
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
    // Detailed error handling with helpful guidance
    console.error(`\n❌ An unexpected error occurred: ${error.message}\n`);

    // Provide context-specific help
    if (
      error.message.includes("ENOENT") ||
      error.message.includes("no such file")
    ) {
      console.log("💡 File not found. Possible solutions:\n");
      console.log("1. Make sure you're in the correct directory");
      console.log("2. Check if the file path is correct");
      console.log("3. Verify the repository is initialized: git status\n");
    } else if (
      error.message.includes("permission") ||
      error.code === "EACCES"
    ) {
      console.log("💡 Permission error. Try:\n");
      console.log("1. Check file/directory permissions");
      console.log("2. Run with appropriate user privileges");
      console.log("3. Contact your system administrator\n");
    } else if (
      error.message.includes("network") ||
      error.message.includes("fetch")
    ) {
      console.log("💡 Network error. Possible solutions:\n");
      console.log("1. Check your internet connection");
      console.log("2. Verify you can access GitHub.com");
      console.log("3. Check proxy/firewall settings");
      console.log("4. Try again later\n");
    } else {
      console.log("💡 For help:\n");
      console.log("1. View options: npx gitleaks-secret-scanner --options");
      console.log(
        "2. Check documentation: https://github.com/criisv7/gitleaks-secret-scanner"
      );
      console.log(
        "3. Report issues: https://github.com/criisv7/gitleaks-secret-scanner/issues\n"
      );
    }

    // Include stack trace in verbose mode if DEBUG env var is set
    if (process.env.DEBUG) {
      console.error("\n📋 Stack trace (DEBUG mode):\n", error.stack, "\n");
    }

    process.exit(2);
  });
