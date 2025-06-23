# Gitleaks Secret Scanner

[![NPM Version](https://img.shields.io/npm/v/gitleaks-secret-scanner.svg)](https://www.npmjs.com/package/gitleaks-secret-scanner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

### 🤖 3. Simplified and Robust CI/CD
Scanning pull requests correctly requires complex `git diff` logic. This package simplifies it to a single flag.
-   **`--diff-mode ci`**: A platform-agnostic mode that scans only the changes in a merge/pull request.
-   **No Complex Git Commands:** Just set two environment variables (`BASE_SHA` and `HEAD_SHA`), and the tool does the rest.

### 📄 4. User-Friendly HTML Reports
Gitleaks produces machine-readable output, but this wrapper provides clean, user-friendly HTML reports out-of-the-box—perfect for quick reviews by developers or security teams.

### ✓ 5. Consistent and Reliable Automation
CI pipelines often fail if an expected file artifact is not created.
-   **Guaranteed Reports:** This tool *always* creates a report file, even if no secrets are found. This prevents CI job failures due to missing artifacts and provides a clear record that a scan was completed successfully.

## Key Features

-   **Auto-Installation:** Automatically downloads and caches the appropriate Gitleaks binary for your OS and architecture (Windows, macOS, Linux - x64, ARM64, etc.).
-   **CI/CD Ready:** A dedicated `--diff-mode ci` to scan only the changes in a Merge/Pull Request.
-   **Rich HTML Reports:** Generate a clean, user-friendly HTML report from scan results.
-   **Standard Formats:** Supports all standard Gitleaks report formats (`json`, `csv`, `sarif`, `junit`).
-   **Custom Rules:** Automatically detects and uses your local `.gitleaks.toml` configuration file.
-   **Always Generates Artifacts:** Creates a report file even if no secrets are found.

## Quick Start & Usage

### One-Off Scan with NPX

The easiest way to run a scan without installation:

```bash
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

**Note:** If both `--report-format` and `--html-report` are provided, the standard format will be generated and the HTML report will be ignored.

## CI/CD Integration Guide

To scan only the changes in a Merge/Pull Request, use `--diff-mode ci`. This requires two environment variables to be set in your CI environment:

-   `BASE_SHA`: The commit SHA of the target branch (e.g., `main`).
-   `HEAD_SHA`: The commit SHA of the source branch (the feature branch).

### GitLab CI Example

```yaml
# .gitlab-ci.yml
secret_detection_mr:
  stage: test
  image: node:lts-bullseye
  script:
    - npm install -g gitleaks-secret-scanner
    # Use 'export' to set the required environment variables
    - export BASE_SHA=${CI_MERGE_REQUEST_DIFF_BASE_SHA}
    - export HEAD_SHA=${CI_COMMIT_SHA}
    - gitleaks-secret-scanner --diff-mode ci --html-report scan-report.html
  artifacts:
    when: always # Ensures report is saved even if secrets are found (job fails)
    paths:
      - scan-report.html
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

## License and Attribution

This package is licensed under the MIT License.

It is a wrapper around the **Gitleaks** engine, which is developed by Zachary Rice and is also licensed under the MIT License. This tool would not be possible without the excellent work of the Gitleaks contributors.
