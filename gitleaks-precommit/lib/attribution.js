const path = require('path');
const fs = require('fs');

// Fallback package information
const fallbackPackageInfo = {
  name: 'gitleaks-secret-scanner',
  version: '1.0.1'
};

let packageInfo = fallbackPackageInfo;

try {
  // Resolve path to package.json safely
  const packagePath = path.join(__dirname, '../package.json');
  
  if (fs.existsSync(packagePath)) {
    packageInfo = require(packagePath);
  } else {
    console.warn('⚠️ package.json not found at:', packagePath);
    console.warn('⚠️ Using fallback package information');
  }
} catch (e) {
  console.warn('⚠️ Error loading package.json:', e.message);
  console.warn('⚠️ Using fallback package information');
}

module.exports.showAttribution = () => {
  console.log(`
  =======================================================
  ${packageInfo.name} v${packageInfo.version}
  Automated Gitleaks installer with custom rule support
  
  Uses Gitleaks (https://github.com/gitleaks/gitleaks)
  Licensed under MIT: https://github.com/gitleaks/gitleaks/blob/master/LICENSE
  =======================================================\n
  `);
};

module.exports.disclaimer = `
  DISCLAIMER:
  This package is not officially affiliated with, endorsed by,
  or supported by the Gitleaks project or its maintainers.
  
  If you encounter issues:
  1. Check your internet connection
  2. Verify GitHub API access isn't blocked
  3. Try setting version in .gitleaksrc
  4. Report issues at ${packageInfo.repository?.url || 'https://github.com/criisv7/gitleaks-secret-scanner/issues'}
`;