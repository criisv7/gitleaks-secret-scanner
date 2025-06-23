const path = require('path');
const fs = require('fs');

const fallbackPackageInfo = {
  name: 'gitleaks-secret-scanner',
  version: '1.0.0',
  repository: { url: 'https://github.com/criisv7/gitleaks-secret-scanner' }
};

let packageInfo = fallbackPackageInfo;

try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packagePath)) {
    packageInfo = require(packagePath);
  }
} catch (e) {
}

module.exports.showAttribution = () => {
  const repoUrl = packageInfo.repository?.url?.replace('git+', '').replace('.git', '') || 'https://github.com/criisv7/gitleaks-secret-scanner';

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

module.exports.version = ()=>{
  console.log(`${packageInfo.name} v${packageInfo.version}`);
};

module.exports.options = ()=>{
console.log(`
Usage: gitleaks-secret-scanner [options]

Core Commands:
  --init                Creates a default .gitleaks.toml configuration file.
  --install-only        Downloads the Gitleaks binary without running a scan.

Scanning Options:
  --diff-mode <mode>    Sets the scope of the scan.
                        Modes: staged (default), all, ci.
  --config <path>       Path to a custom Gitleaks config file.

Reporting Options:
  --html-report [path]  Generate a user-friendly HTML report.
                        Defaults to 'gitleaks-report.html' if no path is given.
  --report-format <fmt> Generate a standard Gitleaks report.
                        Formats: json, csv, sarif, junit.
  --report-path <path>  Path for the standard Gitleaks report.

Other Options:
  --version             Show the version of this package.
  --about               Display attribution information.
  --options, --help     Show this help message.
`);};