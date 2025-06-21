const path = require('path');
const fs = require('fs');

// Fallback package information
const fallbackPackageInfo = {
  name: 'gitleaks-secret-scanner',
  version: '1.0.2',
  repository: { url: 'https://github.com/criisv7/gitleaks-secret-scanner' }
};

let packageInfo = fallbackPackageInfo;

try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  console.log('Looking for package.json at:', packagePath);
  
  if (fs.existsSync(packagePath)) {
    packageInfo = require(packagePath);
    console.log('Loaded package info:', packageInfo.name, packageInfo.version);
  } else {
    console.warn('⚠️ package.json not found, using fallback info');
  }
} catch (e) {
  console.warn('⚠️ Error loading package.json:', e.message);
}

module.exports.showAttribution = () => {
  console.log(`
  =======================================================
  ${packageInfo.name} v${packageInfo.version}
  Automated Gitleaks installer with custom rule support
  
  Uses Gitleaks (https://github.com/gitleaks/gitleaks)
  Created by Zachary Rice and contributors
  Licensed under MIT: https://github.com/gitleaks/gitleaks/blob/master/LICENSE
  =======================================================
  `);
};

module.exports.disclaimer = `
  DISCLAIMER:
  This package is not officially affiliated with, endorsed by,
  or supported by the Gitleaks project or its maintainers.
  
  Troubleshooting:
  1. Check your internet connection
  2. Verify GitHub API access isn't blocked
  3. Try setting version in .gitleaksrc
  4. Report issues at ${packageInfo.repository?.url || 'https://github.com/criisv7/gitleaks-secret-scanner/issues'}
`;