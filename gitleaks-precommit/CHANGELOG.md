# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-01-15

### Stable Release - Beta Graduation 🚀

This is the **stable release** of v2.0.0-beta.1 with critical bug fixes. The new architecture introduced in beta is now production-ready for downloads.

**Upgrade from v2.0.0-beta.1**: Critical bug fixes included - upgrade recommended
**Upgrade from v1.x**: All features backward compatible - safe to upgrade

### What's New Since v1.x (Introduced in Beta)

#### Intelligent Installation System
- Automatic Gitleaks binary management with caching
- Multi-version support in `~/.gitleaks-cache/`
- Smart fallback to v8.30.0 if GitHub API unreachable
- Cross-platform support (macOS, Linux, Windows)
- Multi-architecture ready (x64, arm64, armv7, x32)

#### Husky Integration
- Interactive Git hook setup during local installation
- Automated pre-commit scanning with Gitleaks
- Zero-config experience with simple prompts
- Manual setup: `npx gitleaks-secret-scanner --setup-husky`

#### Graceful Degradation System
- Context-aware error messages throughout the package
- Specific troubleshooting guidance for common scenarios
- Timeout protection (5s/10s) to prevent hanging
- Manual fallback instructions when automation fails

#### Version Management Improvements
- Smart cleanup prompts based on number of cached versions:
  - 1 version: No prompt (nothing to clean up)
  - 2 versions: Simple yes/no prompt to delete older version
  - 3+ versions: Numeric "keep latest X" prompt (default: 2)
- Better version size display and cache location info
- Cache cleanup utilities: `--manage-versions`, `--clean-all`


### Fixed in v2.1.1 (Beta → Stable)

#### Critical Bug Fixes
- **Pre-commit hook detection bug** - Previously matched comments and echo statements
  - Now uses regex pattern matching: `/^\s*npx\s+gitleaks-secret-scanner/m`
  - Prevents duplicate commands in pre-commit hooks

- **Uninstall cleanup** - Interactive prompt didn't work due to npm lifecycle limitations
  - Changed to informational display that works reliably
  - Shows cached versions with manual cleanup instructions
  - Works in all install contexts (local, global, CI/CD)

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
