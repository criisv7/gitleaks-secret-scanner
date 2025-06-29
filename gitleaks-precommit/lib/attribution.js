const path = require("path");
const fs = require("fs");

const fallbackPackageInfo = {
  name: "gitleaks-secret-scanner",
  version: "1.2.1",
  repository: { url: "https://github.com/criisv7/gitleaks-secret-scanner" },
};

let packageInfo = fallbackPackageInfo;

try {
  const packagePath = path.join(__dirname, "..", "package.json");
  if (fs.existsSync(packagePath)) {
    packageInfo = require(packagePath);
  }
} catch (e) {}

module.exports.showAttribution = () => {
  const repoUrl =
    packageInfo.repository?.url?.replace("git+", "").replace(".git", "") ||
    "https://github.com/criisv7/gitleaks-secret-scanner";

  console.log(`
  =======================================================================

  gitleaks-secret-scanner v${packageInfo.version} (MIT License)
  This project's repository: ${repoUrl}
  Author:      Vijay Kumar
  License:     MIT License
  This tool is a command-line wrapper designed to simplify the installation
  and cross-platform use of the powerful Gitleaks engine.

  -----------------------------------------------------------------------

  This package bundles and executes the Gitleaks binary, which is a
  product of Zachary Rice and is licensed separately.

  Core Engine: Gitleaks (https://github.com/gitleaks/gitleaks)
  Author:      Zachary Rice
  License:     MIT License

  This wrapper is not officially affiliated with, endorsed by, or supported
  by the original Gitleaks project or its maintainers.

  =======================================================================
  `);
};

module.exports.version = () => {
  console.log(`${packageInfo.name} v${packageInfo.version}`);
};

module.exports.options = () => {
  console.log(`
Usage: gitleaks-secret-scanner [options-and-flags]

This is a smart wrapper for the Gitleaks engine. You can use the simplified
options below or pass any valid Gitleaks flag directly.

--- Wrapper-Specific Options ---

  --diff-mode <mode>    Sets the scan scope. Modes:
                        'staged': (default) Scans only staged files for pre-commit hooks.
                        'all': Scans all uncommitted changes (staged and unstaged).
                        'ci': Scans a pull request commit range (requires CI variables).
                        'history': Scans the entire repository history.

  --html-report [path]  Generates a rich, user-friendly HTML report.
                        Defaults to 'gitleaks-report.html' if no path is given.

  --depth <number>      Used with '--diff-mode history' to limit the scan
                        to the last <number> of commits.

--- Common Gitleaks Flags (Passed Directly to the Engine) ---

  -v, --verbose                       Show verbose output from the Gitleaks engine.
  -c, --config <path>                 Load a Gitleaks config file from a custom path.
  -b, --baseline-path <path>          Path to a baseline report to ignore known leaks.
  -i, --gitleaks-ignore-path <path>   Path to a .gitleaksignore file.
      --no-banner                     Suppress the Gitleaks ASCII art banner.
      --redact                        Redact secrets from the console output.
  -f, --report-format <fmt>           Generate a standard Gitleaks report.
                                      Formats: json, csv, sarif, junit.
  -r, --report-path <path>            Path for the standard Gitleaks report.

--- Other Commands ---

  --init                Creates a default .gitleaks.toml configuration file.
  --install-only        Downloads the Gitleaks binary without running a scan.
  --version             Show the version of this wrapper package.
  --about               Display attribution information for the wrapper and Gitleaks.
  --options             Show this help menu.
  --help                Show the complete, native help menu from the Gitleaks engine.
`);
};
