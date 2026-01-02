# Gitleaks Secret Scanner

[![NPM Version](https://img.shields.io/npm/v/gitleaks-secret-scanner.svg)](https://www.npmjs.com/package/gitleaks-secret-scanner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Downloads](https://img.shields.io/npm/dm/gitleaks-secret-scanner.svg)](https://www.npmjs.com/package/gitleaks-secret-scanner)

A powerful, intelligent, and safe wrapper for the [Gitleaks](https://github.com/gitleaks/gitleaks) engine.

This tool solves the main challenge of using Gitleaks in a team environment: the setup. It automatically downloads the correct Gitleaks binary for any operating system and architecture, making it incredibly easy to scan for secrets in local pre-commit hooks and CI/CD pipelines without manual intervention.

## Why Use This Package?

While Gitleaks is a phenomenal tool, this package provides a seamless bridge to the Node.js ecosystem, offering several key advantages that go beyond a simple wrapper.

### 🚀 1. Effortless, Zero-Configuration Setup
The biggest advantage. You no longer need to manually download Gitleaks binaries or write complex scripts to manage different versions for macOS, Windows, and Linux developers on your team. This package handles everything automatically.

🧠 **2. Truly Accurate & Performant CI/CD Scanning**

This is not a simple `git diff | gitleaks` pipe. The `--diff-mode ci` is far more intelligent, providing a fast and robust way to secure your merge/pull requests. It's built on a "scan final state" philosophy that delivers accuracy and confidence.

Here’s how it works and why it’s better:

*   **Focuses on the Merge Outcome**
    Instead of analyzing every intermediate commit, `ci` mode identifies all files changed in the pull request and scans their **final content**. This answers the most important question: **"Will this merge introduce a secret into the target branch?"** This approach correctly passes the build if a secret is added and then removed within the same PR.

*   **Comprehensive File Analysis**
    If you modify a file that *already contains a secret*, `ci` mode will find it. By scanning the *entire content* of any changed file (not just the changed lines), it helps you clean up existing security debt and prevents you from unknowingly propagating old vulnerabilities.

*   **High Performance**
    The scan is surgical and fast. It gets a simple list of changed files from `git` and runs a targeted Gitleaks scan only on them. This is highly efficient, even for large pull requests with extensive commit histories.

*   **Rich, Actionable Context**
    Findings are automatically enriched with author, email, and commit data using `git blame`. This makes it trivial to identify the source of a leak and take immediate action, directly from the console output or the HTML report.

### 🔒 3. Safe and Powerful Local Scanning
This tool uses advanced, non-invasive strategies to scan your uncommitted work safely and effectively.
-   **For staged changes (`staged` mode):** It uses a safe **"Virtual Commit"** strategy with low-level Git commands to create a temporary, in-memory commit. This provides a **full, rich report with commit data** without ever changing your branch history or staging area.
-   **For all changes (`all` mode):** It performs a comprehensive three-part scan that covers **staged, unstaged, and new untracked files**, ensuring no secret can be missed.

### 📄 4. Rich, User-Friendly Reports
The console output and generated HTML reports are populated with the rich contextual data captured by the advanced scanning methods, making it easy to find and fix issues quickly.

## Key Features

-   **Auto-Installation:** Automatically downloads and caches the appropriate Gitleaks binary for your OS and architecture.
-   **Version Management:** Interactive version selection and support for multiple Gitleaks versions.
-   **Husky Integration:** Automatic setup of git hooks for pre-commit secret scanning.
-   **Full History Auditing:** A dedicated `--diff-mode history` for performing a complete scan of your entire repository.
-   **Accurate CI/CD Mode:** Intelligently scans pull requests, reporting only on newly introduced secrets.
-   **Advanced Local Scans:** Uses safe, non-invasive methods to provide rich reports for staged and uncommitted work.
-   **Rich HTML Reports:** Generates a clean, comprehensive HTML report from scan results with full commit context.
-   **Professional CLI:** Correctly handles pass-through flags like `--no-banner` and `--help`.

## Quick Start & Usage

### One-Off Scan with NPX
The easiest way to try it out without installation:
```bash
# Scan all of your uncommitted changes (staged, unstaged, and new untracked files)
npx gitleaks-secret-scanner --diff-mode all --html-report
```

### Project Installation (Recommended)
For use in `npm scripts` or with tools like Husky, install it as a development dependency.
```bash
npm install gitleaks-secret-scanner --save-dev
```
Then, add scripts to your `package.json`:
```json
"scripts": {
  "scan:staged": "gitleaks-secret-scanner",
  "scan:all": "gitleaks-secret-scanner --diff-mode all",
  "scan:history": "gitleaks-secret-scanner --diff-mode history"
}
```

## Command-Line Options

For a comprehensive menu showing both wrapper commands and the most common Gitleaks flags, run:
`gitleaks-secret-scanner --options`

For the complete, native help menu from the Gitleaks binary itself, run:
`gitleaks-secret-scanner --help`

---
*Wrapper-Specific Options:*
| Flag | Description |
| :--- | :--- |
| `--diff-mode <mode>` | Sets the scan scope. Modes: `staged` (default), `all`, `ci`, `history`. |
| `--html-report [path]` | Generates a user-friendly HTML report. Defaults to `gitleaks-report.html`. |
| `--depth <number>` | Used with `--diff-mode history` to limit the scan to the last `<number>` of commits. |
| `--gitleaks-version <version>` | Specify a specific Gitleaks version to use (e.g., `8.27.2`). |
| `--select-version` | Interactive version selector to choose and install a specific Gitleaks version. |
| `--engine-version` | Display detailed information about the Gitleaks engine and installed versions. |
| `--setup-husky` | Automatically setup Husky git hooks with Gitleaks pre-commit scanning. |
---

## Version Management

The package automatically uses the **latest stable version** of Gitleaks by default. You can control which version to use in several ways:

### Default Behavior (Recommended)
By default, the latest stable Gitleaks version is automatically downloaded and used:
```bash
npx gitleaks-secret-scanner
```

### Interactive Version Selection
Select from available Gitleaks versions interactively:
```bash
npx gitleaks-secret-scanner --select-version
```

This will fetch the latest 20 versions from GitHub and let you choose which one to install.

### Specify Version Directly
Use a specific version for a scan:
```bash
npx gitleaks-secret-scanner --gitleaks-version 8.27.2
```

### Check Current Engine Version
Verify which Gitleaks engine version you're using:
```bash
npx gitleaks-secret-scanner --engine-version
```

This shows:
- Current engine version
- Binary location
- Cache directory
- All installed versions

### Manage Cached Versions
Multiple Gitleaks versions are cached for fast switching between projects. To view and clean up old versions:
```bash
npx gitleaks-secret-scanner --manage-versions
```

This allows you to:
- View all cached versions and their sizes
- Clean up old versions (keeps latest 3 by default)
- Free up disk space

**Delete all cached versions:**
```bash
npx gitleaks-secret-scanner --clean-all
```

Or manually:
```bash
rm -rf ~/.gitleaks-cache
```

**Why multiple versions?**
- Different projects may require different Gitleaks versions
- Faster to switch between versions (no re-download)
- Versions are stored in `~/.gitleaks-cache/`

### Uninstalling

**Local installation (project):**
```bash
npm uninstall gitleaks-secret-scanner
```

**Global installation:**
```bash
npm uninstall -g gitleaks-secret-scanner
```

⚠️ **Note:** Due to npm lifecycle hook limitations, you need to manually delete cached binaries:
```bash
# Remove all cached versions
rm -rf ~/.gitleaks-cache

# Or selectively manage versions (requires package to be installed)
npx gitleaks-secret-scanner --manage-versions
```

## Husky Integration

Automatically setup git hooks to run Gitleaks on every commit.

### Automatic Setup During Installation
When you install the package in a git repository, you'll be prompted:
```bash
npm install gitleaks-secret-scanner --save-dev
```

The installer will ask if you want to setup git hooks automatically. If you choose "Yes", it will:
1. Install Husky (if not already installed)
2. Initialize Husky in your repository
3. Create or update the `.husky/pre-commit` hook
4. Configure it to run Gitleaks secret scanning before each commit

### Manual Setup
You can also setup Husky manually at any time:
```bash
npx gitleaks-secret-scanner --setup-husky
```

**Note:** If a pre-commit hook already exists, the Gitleaks command will be **appended** to it, preserving your existing hooks

### Custom Command
You can specify a custom command for the pre-commit hook:
```bash
npx gitleaks-secret-scanner --setup-husky --command "npx gitleaks-secret-scanner --diff-mode all --html-report"
```

### Manual Husky Setup
If you prefer to setup Husky manually, add this to your `.husky/pre-commit` file:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Gitleaks secret scanning
npx gitleaks-secret-scanner
```

---

## CI/CD Integration Guide

The following examples show how to configure your CI pipeline for different use cases.

### GitHub Actions Example

This workflow runs a fast, targeted scan on every pull request.

```yaml
# .github/workflows/secret-detection.yml
name: 'Secret Detection Scan'
on:
  pull_request:
    branches: [ main ]

jobs:
  gitleaks-scan:
    runs-on: ubuntu-latest
    steps:
      - name: 'Check out repository'
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 'Run Gitleaks Secret Scanner for Pull Request'
        run: npx gitleaks-secret-scanner@latest --diff-mode ci --html-report scan-report-mr.html
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
      
      - name: 'Upload HTML Report Artifact'
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: gitleaks-scan-report
          path: scan-report-mr.html
```

### GitLab CI Example

This example demonstrates how to set up two separate jobs: one for merge requests and one for a scheduled weekly audit of recent history.

```yaml
# .gitlab-ci.yml
stages:
  - security

secret-scan-mr:
  stage: security
  image: node:lts-bullseye
  variables:
      BASE_SHA: ${CI_MERGE_REQUEST_DIFF_BASE_SHA}
      HEAD_SHA: ${CI_COMMIT_SHA}
      
  script:
    - npm install -g gitleaks-secret-scanner
    - gitleaks-secret-scanner --diff-mode ci --html-report scan-report-mr.html
  artifacts:
    when: always
    paths: [scan-report-mr.html]
    expire_in: 1 week
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

secret-scan-weekly:
  stage: security
  image: node:lts-bullseye
  script:
    - npm install -g gitleaks-secret-scanner
    - gitleaks-secret-scanner --diff-mode history --html-report scan-report-weekly.html
  artifacts:
    when: always
    paths: [scan-report-weekly.html]
    expire_in: 1 week
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
```

## Troubleshooting

The package includes comprehensive error handling with helpful guidance when things go wrong. Here are common scenarios:

### Network Issues
If you encounter network errors when fetching versions or downloading binaries:
```bash
# The package will automatically provide fallback instructions
# You can specify a version directly instead:
npx gitleaks-secret-scanner --gitleaks-version 8.30.0
```

### Husky Setup Failures
If automatic Husky setup fails, manual instructions will be provided. You can also set up manually:
```bash
npm install husky --save-dev
npx husky init
```

Then create `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Gitleaks secret scanning
npx gitleaks-secret-scanner
```

## Known Issues

*   **CLI Argument Parsing:** The current argument parser is intentionally permissive to allow all native Gitleaks flags to be passed through. As a result, it does not throw an error for unknown or misspelled flags (e.g., `gitleaks-secret-scanner --verrbose`). This behavior is scheduled to be improved in a future release with a more intelligent "typo-check" mechanism.

## License and Attribution

This package is licensed under the MIT License. It is a wrapper around the **Gitleaks** engine, which is developed by Zachary Rice and is also licensed under the MIT License.