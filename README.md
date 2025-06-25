# Gitleaks Secret Scanner

[![NPM Version](https://img.shields.io/npm/v/gitleaks-secret-scanner.svg)](https://www.npmjs.com/package/gitleaks-secret-scanner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Downloads](https://img.shields.io/npm/dm/gitleaks-secret-scanner.svg)](https://www.npmjs.com/package/gitleaks-secret-scanner)

A powerful, zero-configuration wrapper for the [Gitleaks](https://github.com/gitleaks/gitleaks) engine.

This tool solves the main challenge of using Gitleaks in a team environment: the setup. It automatically downloads the correct Gitleaks binary for any operating system and architecture, making it incredibly easy to scan for secrets in local pre-commit hooks and CI/CD pipelines without manual intervention.

## Why Use This Package? The NPM Advantage

While Gitleaks is a phenomenal tool, integrating it into a Node.js project can be cumbersome. This package provides a seamless bridge, offering several key advantages:

### 🚀 1. Effortless, Zero-Configuration Setup
The biggest advantage. You no longer need to manually download Gitleaks binaries or write complex scripts to manage different versions for macOS, Windows, and various Linux developers on your team. This package handles everything automatically on `npm install`.

```bash
# That's it. The correct binary is now ready to use.
npm install gitleaks-secret-scanner --save-dev
```

### 📦 2. Seamless Node.js Ecosystem Integration
As an npm package, it integrates perfectly into your existing workflow.
-   **Version Locking:** Lock the scanner's version in your `package.json`, ensuring every developer and CI runner uses the exact same tool.
-   **NPM Scripts:** Easily add it to your `npm scripts` for consistent commands.
-   **Pre-commit Hooks:** The ideal tool for use with packages like **Husky** to scan staged files before they are committed.

### 🤖 3. Truly Accurate and Robust CI/CD
**This is not a simple `git diff | gitleaks` pipe.** Standard diff-based scanning is often inaccurate. This tool's `ci` mode is far more intelligent.
-   **It correctly handles removed secrets.** The scan will pass if you remove a secret in a pull request.
-   **It de-duplicates findings.** A secret that exists across multiple commits in a PR is only reported once.
-   **It scans only for newly added secrets.** This is achieved with a sophisticated **"scan-then-filter"** method that performs a rich Gitleaks scan and then cross-references the findings against the actual `diff` to ensure perfect accuracy.

### 🔒 4. Safe and Powerful Pre-Commit Hooks
Scanning staged files correctly is a complex problem. This tool solves it using a safe, non-invasive **"Virtual Commit"** strategy.
-   It uses low-level Git plumbing commands to create a temporary, in-memory commit object.
-   This allows Gitleaks to generate a **full, rich report with commit data** for your staged code.
-   It **never** changes your branch history, your staging area, or your working directory, making it 100% safe for automated hooks.

### 📄 5. User-Friendly HTML Reports
Gitleaks produces JSON, but this wrapper provides clean, user-friendly HTML reports out-of-the-box—perfect for quick reviews by developers or security teams. The reports are populated with the rich data captured by the advanced scanning methods.

## Key Features

-   **Auto-Installation:** Automatically downloads and caches the appropriate Gitleaks binary for your OS and architecture.
-   **Accurate CI/CD Mode:** Intelligently scans pull requests, reporting only on newly introduced secrets and de-duplicating findings.
-   **Advanced Staged Mode:** Uses a safe "Virtual Commit" method to provide rich reports for pre-commit hooks.
-   **Rich HTML Reports:** Generate a clean, comprehensive HTML report from scan results with full commit context.
-   **Standard Formats:** Can also generate standard Gitleaks formats (`json`, `csv`, `sarif`, etc.).
-   **Custom Rules:** Automatically detects and uses your local `.gitleaks.toml` configuration file.
-   **Professional CLI:** Correctly handles all the pass-through flags.

## Quick Start & Usage

### One-Off Scan with NPX

The easiest way to run a scan without installation:

```bash
# Scan all of your uncommitted changes (staged and unstaged)
npx gitleaks-secret-scanner --diff-mode all --html-report
```

### Project Installation (Recommended)

For use in `npm scripts` or pre-commit hooks, install it as a development dependency.

```bash
npm install gitleaks-secret-scanner --save-dev
```

Then, add a script to your `package.json`:
```json
"scripts": {
  "scan:staged": "gitleaks-secret-scanner",
  "scan:all": "gitleaks-secret-scanner --diff-mode all --html-report"
}
```
Now run it with `npm run scan:staged`.

## Command-Line Options

This wrapper provides a simplified interface for common tasks, but also allows you to pass any flag directly to the Gitleaks engine.

For a comprehensive menu showing both wrapper commands and the most common Gitleaks flags, run:
```bash
gitleaks-secret-scanner --options
```
For the complete, native help menu from the Gitleaks binary itself, run:
```bash
gitleaks-secret-scanner --help
```

| Flag                    | Alias | Description                                                                  |
| ----------------------- | ----- | ---------------------------------------------------------------------------- |
| `--init`                |       | Create a default `.gitleaks.toml` configuration file.                        |
| `--install-only`        |       | Download the Gitleaks binary without running a scan.                         |
| `--diff-mode <mode>`    |       | Set scan scope. Modes: `staged` (default), `all`, `ci`.                      |
| `--config <path>`       |       | Path to a custom Gitleaks config file.                                       |
| `--html-report [path]`  |       | Generate an HTML report. Defaults to `gitleaks-report.html`.                 |
| `--report-format <fmt>` | `-f`  | Generate a standard report. Formats: `json`, `csv`, `sarif`, `junit`.        |
| `--report-path <path>`  | `-r`  | Path for the standard report.                                                |
| `--version`             |       | Show the package version.                                                    |
| `--about`               |       | Display attribution information.                                             |
| `--help`, `--options`   |       | Show this help message.                                                      |

## CI/CD Integration Guide

To scan only the changes in a Merge/Pull Request, use `--diff-mode ci`. This requires two environment variables to be set in your CI environment:

-   `BASE_SHA`: The commit SHA of the target branch (e.g., `main`).
-   `HEAD_SHA`: The commit SHA of the source branch (the feature branch).

### GitHub Actions Example

```yaml
# .github/workflows/secret-detection.yml

name: 'Secret Detection Scan'

# This workflow runs on any pull request targeting the 'main' branch
on:
  pull_request:
    branches: [ main ]

jobs:
  # The job that will run your scanner
  gitleaks-scan:
    runs-on: ubuntu-latest
    steps:
      # Step 1: Check out the repository's code
      # fetch-depth: 0 is CRUCIAL for git diff to work correctly between the two SHAs.
      - name: 'Check out repository'
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Step 2: Set up the Node.js environment
      - name: 'Set up Node.js'
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      # Step 3: Install your secret scanner from npm
      - name: 'Install gitleaks-secret-scanner'
        run: npm install -g gitleaks-secret-scanner

      # Step 4: Run the scan using 'ci' mode
      # continue-on-error: true ensures that the workflow doesn't stop here,
      # so we can upload the report artifact in the next step.
      - name: 'Scan for secrets in pull request'
        id: scan
        continue-on-error: true
        env:
          # Set the required environment variables for your scanner
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: gitleaks-secret-scanner --diff-mode ci --report-format json

      # Step 5: Upload the HTML report as a workflow artifact
      # if: always() ensures this step runs even if the previous step failed.
      - name: 'Upload HTML report artifact'
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: gitleaks-scan-report
          path: gitleaks-report.json
      
      # Step 6: Fail the job if the scan step found secrets
      # This step checks the outcome of the 'scan' step and fails the workflow explicitly.
      - name: 'Fail job if secrets were detected'
        if: steps.scan.outcome == 'failure'
        run: |
          echo "❌ Secrets were detected in the pull request. See the 'gitleaks-scan-report' artifact for details."
          exit 1
```

## License and Attribution

This package is licensed under the MIT License.

It is a wrapper around the **Gitleaks** engine, which is developed by Zachary Rice and is also licensed under the MIT License. This tool would not be possible without the excellent work of the Gitleaks contributors. For full details, run `gitleaks-secret-scanner --about`.