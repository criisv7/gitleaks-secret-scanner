# Release v2.1.1 - Major UX Overhaul 🚀

## Overview
This release represents a **major UX overhaul** with comprehensive error handling, graceful degradation, and intelligent version management. The package is now **production-ready** and never leaves users stuck.

## 🎯 Key Highlights

### ✅ Critical Bug Fixes
- **Fixed pre-commit hook detection** - No longer matches comments/echo statements
- **Fixed uninstall cleanup** - Now works reliably in all contexts

### 🛡️ Graceful Degradation
- Context-aware error messages with specific troubleshooting
- Timeout protection (5s/10s) to prevent hanging
- Manual fallback instructions when automation fails
- Never leaves users stuck

### 🎨 Smart Version Management
- **1 version:** No prompt (nothing to clean)
- **2 versions:** Simple yes/no to delete older
- **3+ versions:** Numeric "keep latest X" prompt


## 📦 Installation

### Upgrade from v1.x (recommended)
```bash
npm install gitleaks-secret-scanner@latest
```

### Fresh Install
```bash
# Local (project)
npm install gitleaks-secret-scanner --save-dev

# Global
npm install -g gitleaks-secret-scanner
```

## 🔄 Breaking Changes
**None** - Fully backward compatible with v1.x

## 📝 What's Changed

### Fixed
- Pre-commit hook detection now uses regex pattern matching (`/^\s*npx\s+gitleaks-secret-scanner/m`)
- Uninstall cleanup shows informational display instead of failing interactive prompt
- Network timeouts properly handled (5s for latest version, 10s for version list)

### Added
- Context-aware error messages for:
  - Network errors (ECONNREFUSED, ENOTFOUND, timeouts)
  - Permission errors (EACCES, EPERM)
  - File not found errors (ENOENT)
  - 404 errors for unsupported platforms
- DEBUG environment variable support for troubleshooting
- Smart version cleanup prompts based on cached version count
- Manual fallback instructions for all automation failures

### Improved
- Enhanced manual Husky setup instructions
- Better messaging for git repository checks
- Clearer error messages with actionable next steps
- Updated documentation with Troubleshooting section

## 📊 For Our Community

This release addresses common issues reported by users:
- Pre-commit hooks being duplicated
- Confusion about version cleanup
- Unclear error messages
- Network timeout hangs

Thank you for your feedback and continued support! 🙏

## 🔗 Links
- [CHANGELOG](./CHANGELOG.md)
- [Documentation](https://github.com/criisv7/gitleaks-secret-scanner#readme)
- [Report Issues](https://github.com/criisv7/gitleaks-secret-scanner/issues)

## 📥 Download
```bash
npm install gitleaks-secret-scanner@2.1.1
```

---
