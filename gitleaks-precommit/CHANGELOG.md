# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-01-15

### Major UX Overhaul - Production Ready 🚀

This release represents a complete overhaul of the user experience with comprehensive error handling, graceful degradation, and intelligent version management. The package now handles edge cases elegantly and never leaves users stuck.

### Added

#### Graceful Degradation System
- **Context-aware error messages** throughout the entire package
- **Specific troubleshooting guidance** for common error scenarios:
  - Network errors (ECONNREFUSED, ENOTFOUND, timeouts)
  - Permission errors (EACCES, EPERM)
  - File not found errors (ENOENT)
  - 404 errors for unsupported platforms
- **Timeout protection** to prevent hanging:
  - 5-second timeout for latest version fetching
  - 10-second timeout for version list fetching
- **Manual fallback instructions** when automation fails

#### Version Management Improvements
- **Smart cleanup prompts** based on number of cached versions:
  - 1 version: No prompt (nothing to clean up)
  - 2 versions: Simple yes/no prompt to delete older version
  - 3+ versions: Numeric "keep latest X" prompt (default: 2)
- Better version size display and cache location info
- Improved version selection UX


### Fixed

#### Critical Bug Fixes
- **Pre-commit hook detection bug** - Previously matched comments and echo statements containing "gitleaks-secret-scanner" text
  - Now uses regex pattern matching to detect only actual command execution
  - Patterns: `/^\s*npx\s+gitleaks-secret-scanner/m` and `/^\s*gitleaks-secret-scanner/m`
  - Prevents duplicate commands in pre-commit hooks

- **Uninstall cleanup** - Interactive prompt didn't work due to npm lifecycle limitations
  - Changed from interactive readline prompt to informational display
  - Now shows cached versions and provides manual cleanup instructions
  - Works reliably in all install contexts (local, global, CI/CD)

### Improved

#### Error Handling
- Binary download failures now provide platform-specific guidance
- Network errors include retry suggestions and manual download links
- Permission errors suggest using sudo or fixing directory permissions
- All errors include actionable next steps

#### User Guidance
- Enhanced manual setup instructions for Husky integration
- Detailed fallback options when GitHub API is unavailable
- Better messaging for git repository and package.json checks
- Clearer indication of what went wrong and how to fix it

#### Documentation
- Updated README with uninstall cleanup instructions
- Added Troubleshooting section with DEBUG mode usage
- Clarified version management behavior
- Added examples for common error scenarios

### Breaking Changes
None - fully backward compatible with v1.x

### Migration Guide
No migration needed. Simply upgrade:

```bash
# For local installation
npm install gitleaks-secret-scanner@latest

# For global installation
npm install -g gitleaks-secret-scanner@latest
```

### Known Limitations
- No automated test suite (planned for future release)

### Acknowledgments
This release addresses feedback from the weekly download community. Thank you for your continued support!

---

## [2.0.0-beta.1] - 2026-01-02

### Added
- Beta release with major UX improvements
- Enhanced error handling framework
- Timeout protection for network requests

---

## [1.2.2] - 2025-06-30

### Fixed
- Bug fixes and stability improvements

---

## [1.2.1] - 2025-06-29

### Fixed
- Minor bug fixes

---

## [1.2.0] - 2025-06-29

### Added
- Version selection capabilities
- Interactive Husky setup during installation

---

## [1.1.2] - 2025-06-XX

### Fixed
- Bug fixes and improvements

---

## [1.1.1] - 2025-06-XX

### Added
- Initial public release
- Basic gitleaks wrapper functionality
- Automated binary downloads

---

[2.1.1]: https://github.com/criisv7/gitleaks-secret-scanner/releases/tag/v2.1.1
[2.0.0-beta.1]: https://github.com/criisv7/gitleaks-secret-scanner/releases/tag/v2.0.0-beta.1
[1.2.2]: https://github.com/criisv7/gitleaks-secret-scanner/releases/tag/v1.2.2
[1.2.1]: https://github.com/criisv7/gitleaks-secret-scanner/releases/tag/v1.2.1
[1.2.0]: https://github.com/criisv7/gitleaks-secret-scanner/releases/tag/v1.2.0
[1.1.2]: https://github.com/criisv7/gitleaks-secret-scanner/releases/tag/v1.1.2
[1.1.1]: https://github.com/criisv7/gitleaks-secret-scanner/releases/tag/v.1.1.1
