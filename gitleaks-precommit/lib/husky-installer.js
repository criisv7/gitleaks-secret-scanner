const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Check if husky is already installed in the project
 * @returns {boolean} True if husky is installed
 */
function isHuskyInstalled() {
  try {
    const projectRoot = process.cwd();
    const packageJsonPath = path.join(projectRoot, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = require(packageJsonPath);
    const hasDep = packageJson.dependencies && packageJson.dependencies.husky;
    const hasDevDep =
      packageJson.devDependencies && packageJson.devDependencies.husky;

    return hasDep || hasDevDep;
  } catch (error) {
    return false;
  }
}

/**
 * Install husky in the user's project
 * @returns {Promise<void>}
 */
async function installHusky() {
  console.log("📦 Installing husky...\n");

  try {
    // Check if npm is available
    execSync("npm --version", { stdio: "pipe" });

    // Install husky as a dev dependency
    console.log("Running: npm install husky --save-dev");
    execSync("npm install husky --save-dev", {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.log("\n✅ Husky installed successfully.");
  } catch (error) {
    throw new Error(`Failed to install husky: ${error.message}`);
  }
}

/**
 * Initialize husky in the project
 * @returns {Promise<void>}
 */
async function initializeHusky() {
  const huskyDir = path.join(process.cwd(), ".husky");

  // Check if .husky already exists
  if (fs.existsSync(huskyDir)) {
    console.log("✅ Husky directory already exists.\n");
    return;
  }

  console.log("🔧 Initializing husky...\n");

  try {
    // Create .husky directory manually to avoid husky init creating default files
    await fs.ensureDir(huskyDir);

    // Create _/husky.sh file
    const huskyScriptDir = path.join(huskyDir, "_");
    await fs.ensureDir(huskyScriptDir);

    const huskyScript = `#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="$(basename -- "$0")"
  debug "starting $hook_name..."

  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  if [ -f ~/.huskyrc ]; then
    debug "sourcing ~/.huskyrc"
    . ~/.huskyrc
  fi

  readonly husky_skip_init=1
  export husky_skip_init
  sh -e "$0" "$@"
  exitCode="$?"

  if [ $exitCode != 0 ]; then
    echo "husky - $hook_name hook exited with code $exitCode (error)"
  fi

  if [ $exitCode = 127 ]; then
    echo "husky - command not found in PATH=$PATH"
  fi

  exit $exitCode
fi
`;

    await fs.writeFile(path.join(huskyScriptDir, "husky.sh"), huskyScript, {
      mode: 0o755,
    });

    // Add husky to package.json prepare script if not already there
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf8")
      );

      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      if (
        !packageJson.scripts.prepare ||
        !packageJson.scripts.prepare.includes("husky")
      ) {
        packageJson.scripts.prepare = packageJson.scripts.prepare
          ? `${packageJson.scripts.prepare} && husky`
          : "husky";

        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2) + "\n"
        );
        console.log("✅ Added husky to package.json prepare script.");
      }
    }

    console.log("✅ Husky initialized successfully.\n");
  } catch (error) {
    console.warn(`⚠️ Could not initialize husky: ${error.message}`);
    console.log("ℹ️ Continuing with pre-commit hook setup...\n");
  }
}

/**
 * Create or update the pre-commit hook file
 * @param {string} command - The command to add to the pre-commit hook
 * @returns {Promise<void>}
 */
async function setupPreCommitHook(command = "npx gitleaks-secret-scanner") {
  const projectRoot = process.cwd();
  const huskyDir = path.join(projectRoot, ".husky");
  const preCommitPath = path.join(huskyDir, "pre-commit");

  // Ensure .husky directory exists
  if (!fs.existsSync(huskyDir)) {
    await fs.mkdir(huskyDir, { recursive: true });
  }

  let preCommitContent = "";
  const gitleaksCommand = command;
  const gitleaksSection = `\n# Gitleaks secret scanning\n${gitleaksCommand}\n`;

  // Check if pre-commit file already exists
  if (fs.existsSync(preCommitPath)) {
    console.log("ℹ️ Pre-commit hook already exists. Checking...\n");
    preCommitContent = await fs.readFile(preCommitPath, "utf8");

    // Check if gitleaks command is already in the hook (as an actual command, not in strings/comments)
    // Match patterns like: "npx gitleaks-secret-scanner" or "gitleaks-secret-scanner" at start of line
    const hasNpxCommand = /^\s*npx\s+gitleaks-secret-scanner/m.test(
      preCommitContent
    );
    const hasDirectCommand = /^\s*gitleaks-secret-scanner/m.test(
      preCommitContent
    );

    if (hasNpxCommand || hasDirectCommand) {
      console.log("✅ Gitleaks scan is already configured in pre-commit hook.");
      console.log(`   Hook location: ${preCommitPath}\n`);
      return;
    }

    // Append gitleaks command to existing hook (preserve existing content)
    console.log("📝 Appending Gitleaks to existing pre-commit hook...\n");

    // Ensure file ends with newline before appending
    if (!preCommitContent.endsWith("\n")) {
      preCommitContent += "\n";
    }

    preCommitContent += gitleaksSection;
  } else {
    // Create new pre-commit hook
    console.log("📝 Creating new pre-commit hook...\n");
    preCommitContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
${gitleaksSection}`;
  }

  // Write the pre-commit hook
  await fs.writeFile(preCommitPath, preCommitContent, { mode: 0o755 });

  // Ensure the file is executable
  try {
    await fs.chmod(preCommitPath, 0o755);
  } catch (error) {
    console.warn("⚠️ Could not set executable permissions on pre-commit hook");
  }

  console.log("✅ Pre-commit hook configured successfully.");
  console.log(`   Hook location: ${preCommitPath}\n`);
}

/**
 * Print manual setup instructions
 * @param {string} command - The command to add
 */
function printManualInstructions(command) {
  console.log("\n📖 Manual Setup Instructions:\n");
  console.log(
    "If automatic setup failed, you can set up the pre-commit hook manually:\n"
  );
  console.log("1. Install Husky (if not already installed):");
  console.log("   npm install husky --save-dev\n");
  console.log("2. Initialize Husky:");
  console.log("   npx husky init\n");
  console.log("3. Create or update .husky/pre-commit file with:");
  console.log("   #!/usr/bin/env sh");
  console.log('   . "$(dirname -- "$0")/_/husky.sh"\n');
  console.log("   # Gitleaks secret scanning");
  console.log(`   ${command}\n`);
  console.log("4. Make the file executable:");
  console.log("   chmod +x .husky/pre-commit\n");
}

/**
 * Main function to setup husky with gitleaks
 * @param {Object} options - Setup options
 * @param {string} options.command - Custom command to run (default: 'npx gitleaks-secret-scanner')
 * @returns {Promise<void>}
 */
async function setupHusky(options = {}) {
  const { command = "npx gitleaks-secret-scanner" } = options;

  console.log("🚀 Setting up Husky with Gitleaks...\n");

  try {
    // Check if we're in a git repository
    if (!fs.existsSync(path.join(process.cwd(), ".git"))) {
      console.error("❌ Not in a git repository.");
      console.log(
        "ℹ️  Please run this command from the root of your git project.\n"
      );
      printManualInstructions(command);
      process.exit(1);
    }

    // Check if package.json exists
    if (!fs.existsSync(path.join(process.cwd(), "package.json"))) {
      console.error("❌ No package.json found.");
      console.log(
        "ℹ️  Please run this command from the root of your npm project.\n"
      );
      printManualInstructions(command);
      process.exit(1);
    }

    // Install husky if not already installed
    if (!isHuskyInstalled()) {
      try {
        await installHusky();
      } catch (huskyError) {
        console.error(`⚠️  Husky installation failed: ${huskyError.message}`);
        console.log("ℹ️  Continuing with manual setup instructions...\n");
        printManualInstructions(command);
        process.exit(1);
      }
    } else {
      console.log("✅ Husky is already installed.\n");
    }

    // Initialize husky
    try {
      await initializeHusky();
    } catch (initError) {
      console.warn(
        `⚠️  Husky initialization encountered an issue: ${initError.message}`
      );
      console.log("ℹ️  Attempting to continue with hook setup...\n");
    }

    // Setup pre-commit hook
    try {
      await setupPreCommitHook(command);
      console.log(
        "\n✨ Setup complete! Gitleaks will now run on every commit."
      );
      console.log("   You can test it by making a commit.\n");
    } catch (hookError) {
      console.error(`⚠️  Pre-commit hook setup failed: ${hookError.message}`);
      console.log("ℹ️  Please set up the hook manually:\n");
      printManualInstructions(command);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Unexpected error: ${error.message}\n`);
    printManualInstructions(command);
    process.exit(1);
  }
}

module.exports = {
  setupHusky,
  isHuskyInstalled,
  installHusky,
  initializeHusky,
  setupPreCommitHook,
};
