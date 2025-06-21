module.exports.showAttribution = () => {
  console.log(`
  =======================================================
  gitleaks-precommit v${require('../package.json').version}
  Automated Gitleaks installer with custom rule support
  
  Uses Gitleaks (https://github.com/gitleaks/gitleaks)
  Created by Zachary Rice and contributors
  Licensed under MIT: https://github.com/gitleaks/gitleaks/blob/master/LICENSE
  =======================================================\n
  `);
};

module.exports.disclaimer = `
  DISCLAIMER:
  This package is not officially affiliated with, endorsed by,
  or supported by the Gitleaks project or its maintainers.
`;