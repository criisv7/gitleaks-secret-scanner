const fs = require('fs');
const path = require('path');
const toml = require('toml');

module.exports.loadConfig = async () => {
  const config = {
    version: null,
    configPath: null,
    additionalArgs: []
  };

  // Check for .gitleaksrc in project root
  const rcPath = path.join(process.cwd(), '.gitleaksrc');
  if (fs.existsSync(rcPath)) {
    try {
      const rcConfig = JSON.parse(fs.readFileSync(rcPath));
      Object.assign(config, rcConfig);
    } catch (error) {
      console.warn('⚠️ Could not parse .gitleaksrc:', error.message);
    }
  }

  // Auto-detect TOML configuration
  const tomlPaths = [
    '.gitleaks.toml',
    'gitleaks.toml',
    '.gitleaks/config.toml'
  ];

  for (const tomlPath of tomlPaths) {
    const fullPath = path.join(process.cwd(), tomlPath);
    if (fs.existsSync(fullPath)) {
      config.configPath = fullPath;
      
      // Extract version from TOML if specified
      try {
        const tomlContent = fs.readFileSync(fullPath, 'utf8');
        const parsed = toml.parse(tomlContent);
        if (parsed.version) {
          config.version = parsed.version;
        }
      } catch (error) {
        console.warn('⚠️ Could not parse TOML file:', error.message);
      }
      break;
    }
  }

  return config;
};