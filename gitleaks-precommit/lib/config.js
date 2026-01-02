const fs = require("fs");
const path = require("path");
const toml = require("toml");

module.exports.loadConfig = async () => {
  const config = {
    version: null,
    configPath: null,
    htmlReport: null,
    reportFormat: null,
    reportPath: null,
    diffMode: "staged",
    scanDepth: null,
    additionalArgs: [],
  };

  const rcPath = path.join(process.cwd(), ".gitleaksrc");
  if (fs.existsSync(rcPath)) {
    try {
      const rcConfig = JSON.parse(fs.readFileSync(rcPath));
      Object.assign(config, rcConfig);
    } catch (error) {
      console.warn("⚠️ Could not parse .gitleaksrc:", error.message);
      console.log(
        "ℹ️  Continuing with default configuration. Check your .gitleaksrc file for JSON syntax errors.\n"
      );
    }
  }

  const args = process.argv.slice(2);
  const remainingArgs = [];

  // Filter out CLI-only flags that shouldn't be passed to gitleaks
  const cliOnlyFlags = [
    "--setup-husky",
    "--select-version",
    "--manage-versions",
    "--clean-all",
    "--command",
    "--install-only",
    "--init",
    "--options",
    "--about",
    "--engine-version",
  ];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const val = args[i + 1];
    const isFlagWithValue = (v) => v && !v.startsWith("--");

    // Skip CLI-only flags
    if (cliOnlyFlags.includes(arg)) {
      // Skip the flag and its value if it has one
      if (arg === "--command" || arg === "--gitleaks-version") {
        i++; // Skip the value too
      }
      continue;
    }

    switch (arg) {
      case "--gitleaks-version":
        if (isFlagWithValue(val)) {
          config.version = val;
          i++;
        } else {
          console.warn("⚠️ --gitleaks-version flag requires a version number.");
        }
        break;
      case "--html-report":
        if (isFlagWithValue(val)) {
          config.htmlReport = val;
          i++;
        } else {
          config.htmlReport = "gitleaks-report.html";
        }
        break;
      case "--report-format":
      case "-f":
        if (isFlagWithValue(val)) {
          config.reportFormat = val;
          i++;
        } else {
          console.warn("⚠️ --report-format (-f) flag requires a format.");
        }
        break;
      case "--report-path":
      case "-r":
        if (isFlagWithValue(val)) {
          config.reportPath = val;
          i++;
        } else {
          console.warn("⚠️ --report-path (-r) flag requires a path.");
        }
        break;
      case "--diff-mode":
        if (isFlagWithValue(val)) {
          config.diffMode = val;
          i++;
        } else {
          console.warn("⚠️ --diff-mode flag requires a mode (staged/all/ci).");
        }
        break;
      case "--depth":
        if (isFlagWithValue(val) && !isNaN(parseInt(val, 10))) {
          config.scanDepth = parseInt(val, 10);
          i++;
        } else {
          console.warn("⚠️ --depth flag requires a number.");
        }
        break;
      default:
        remainingArgs.push(arg);
        break;
    }
  }

  config.additionalArgs = remainingArgs;

  const validDiffModes = ["staged", "all", "ci", "history"];
  if (!validDiffModes.includes(config.diffMode)) {
    console.warn(
      `⚠️ Invalid diff mode: ${config.diffMode}. Defaulting to 'staged'.`
    );
    config.diffMode = "staged";
  }

  const tomlPaths = [
    ".gitleaks.toml",
    "gitleaks.toml",
    ".gitleaks/config.toml",
  ];
  for (const tomlPath of tomlPaths) {
    const fullPath = path.join(process.cwd(), tomlPath);
    if (fs.existsSync(fullPath)) {
      config.configPath = fullPath;
      try {
        const tomlContent = fs.readFileSync(fullPath, "utf8");
        const parsed = toml.parse(tomlContent);
        if (parsed.version && !config.version) {
          config.version = parsed.version;
        }
      } catch (error) {
        console.warn("⚠️ Could not parse TOML file:", error.message);
        console.log(`ℹ️  File: ${fullPath}`);
        console.log(
          "ℹ️  Continuing without custom config. Check your .gitleaks.toml for syntax errors.\n"
        );
      }
      break;
    }
  }

  return config;
};
