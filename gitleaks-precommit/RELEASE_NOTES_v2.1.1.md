# 🎉 v2.1.1 — Stable Release

**From Beta to Production**: This is the stable release of v2.0.0-beta.1 with critical bug fixes. The new architecture is now production-ready! 🚀

## Overview
This release graduates the major architectural improvements from beta to stable with important bug fixes. The package now handles edge cases elegantly and is ready for production use.

## 🆕 What's New Since v1.x

### 🚀 Intelligent Installation System
- Automatic Gitleaks binary management – downloads and caches the latest Gitleaks binary during install
- Multi-version support – handles multiple Gitleaks versions in `~/.gitleaks-cache/`
- Smart fallback – falls back to stable v8.30.0 if GitHub API is unreachable
- Cross-platform support – macOS, Linux, Windows (auto-detected)
- Multi-architecture ready – x64, arm64, armv7, x32

### 🔗 Husky Integration
- Interactive Git hook setup during local installation
- Automated pre-commit scanning with Gitleaks
- Zero-config experience (simple yes/no prompt)
- Manual setup supported: `npx gitleaks-secret-scanner --setup-husky`

### 🛡️ Enhanced Error Handling & Graceful Degradation
- Context-aware error messages with specific troubleshooting
- Timeout protection (5s/10s) to prevent hanging
- Manual fallback instructions when automation fails
- Actionable error messages for network issues, permissions, and timeouts
- Never leaves users stuck

### 🎨 Smart Version Management
- **1 version:** No prompt (nothing to clean)
- **2 versions:** Simple yes/no to delete older
- **3+ versions:** Numeric "keep latest X" prompt (default: 2)
- Cache cleanup utilities for Gitleaks binaries
- Displays cached versions and disk usage


## ✅ Critical Bug Fixes (Beta → Stable)

### Fixed in v2.1.1
- **Pre-commit hook detection bug** - Previously matched comments and echo statements containing "gitleaks-secret-scanner" text
  - Now uses regex pattern matching to detect only actual command execution
  - Prevents duplicate commands in pre-commit hooks

- **Uninstall cleanup** - Interactive prompt didn't work due to npm lifecycle limitations
  - Changed to informational display that works reliably in all contexts
  - Shows cached versions with manual cleanup instructions


## 📦 Installation

### Upgrade from Beta
```bash
npm install gitleaks-secret-scanner@latest
```

### Upgrade from v1.x
```bash
# Local (project)
npm install gitleaks-secret-scanner@latest

# Global
npm install -g gitleaks-secret-scanner@latest
```

### Fresh Install
```bash
# Local (project)
npm install gitleaks-secret-scanner --save-dev

# Global
npm install -g gitleaks-secret-scanner
```

## 🔧 Usage

```bash
# Run secret scan
gitleaks-secret-scanner

# Setup Husky git hooks (local install only)
npx gitleaks-secret-scanner --setup-husky

# Select a specific Gitleaks version
npx gitleaks-secret-scanner --select-version

# Manage cached versions
npx gitleaks-secret-scanner --manage-versions

# Clean all cached binaries
npx gitleaks-secret-scanner --clean-all

# Debug mode
DEBUG=1 npx gitleaks-secret-scanner
```

## 🔄 Breaking Changes
**None** - Fully backward compatible with v1.x and beta

## 🌟 Key Features
✅ Zero-dependency Gitleaks installation
✅ Automatic version management
✅ Offline-capable (cached binaries)
✅ CI/CD friendly
✅ Pre-commit hook integration
✅ Cross-platform compatibility
✅ Robust error handling
✅ Clear progress indicators
✅ Production-ready

## 📊 For Our Community

This stable release addresses feedback from beta testers and common issues reported by users:
- ✅ Pre-commit hooks being duplicated
- ✅ Confusion about version cleanup
- ✅ Unclear error messages
- ✅ Network timeout hangs

## 📈 Upgrade Path

- **From v1.x**: All features backward compatible - safe to upgrade
- **From v2.0.0-beta.1**: Critical bug fixes included - upgrade recommended
- **Fresh install**: Get the latest stable version automatically

## 🔗 Links
- [CHANGELOG](./CHANGELOG.md)
- [Documentation](https://github.com/criisv7/gitleaks-secret-scanner#readme)
- [Report Issues](https://github.com/criisv7/gitleaks-secret-scanner/issues)

## 📥 Download
```bash
npm install gitleaks-secret-scanner@latest
```

## Minimum Requirements
- Node.js ≥ 18

---

**Full Changelog**: v2.0.0-beta.1 → v2.1.1 (stable)
