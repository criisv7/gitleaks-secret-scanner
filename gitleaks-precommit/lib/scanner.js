const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { generateHtmlReport } = require("./report-generator");
const runScan = async (binaryPath, config) => {
  if (!fs.existsSync(binaryPath)) {
    throw new Error("Gitleaks binary missing");
  }

  if (config.isHelpRequest || config.additionalArgs.includes("--help")) {
    return runPassThroughCommand(binaryPath, [
      "detect",
      ...config.additionalArgs,
    ]).then(() => false);
  }
  let finalLeaks = [];
  switch (config.diffMode) {
    case "ci":
      finalLeaks = await runCiScan(binaryPath, config);
      break;
    case "all":
      finalLeaks = await runAllUncommittedScan(binaryPath, config);
      break;
    case "history":
      finalLeaks = await runHistoryScan(binaryPath, config);
      break;
    case "staged":
    default:
      finalLeaks = await runStagedScan(binaryPath, config);
      break;
  }

  printConsoleSummary(finalLeaks, config);

  if (config.htmlReport || config.reportFormat) {
    generateReportFiles(finalLeaks, config);
  }

  return finalLeaks.length > 0;
};

const runPassThroughCommand = (binaryPath, args) => {
  return new Promise((resolve) => {
    const gitleaks = spawn(binaryPath, args, { stdio: "inherit" });
    gitleaks.on("error", (err) => {
      console.error(`Failed to start Gitleaks: ${err.message}`);
      resolve(1);
    });
    gitleaks.on("close", (code) => {
      resolve(code);
    });
  });
};

async function runCiScan(binaryPath, config) {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA;
  // A missing HEAD_SHA is always a fatal error.
  if (!headSha) {
    throw new Error(
      "For --diff-mode ci, the HEAD_SHA environment variable must be set, but it was not found."
    );
  }
  // If BASE_SHA is missing or identical to HEAD_SHA, it means there's no diff.
  if (!baseSha || baseSha === headSha) {
    console.log(
      "✅ BASE_SHA not provided or is identical to HEAD_SHA. Concluding there are no changes to scan."
    );
    return [];
  }
  console.log(
    `Scanning final state of changed files between ${baseSha.slice(
      0,
      7
    )} and ${headSha.slice(0, 7)}...`
  );
  //Get a list of all files that have changed in the pull request.
  const changedFilesOutput = execSync(
    `git diff --name-only ${baseSha}..${headSha}`
  )
    .toString()
    .trim();
  if (!changedFilesOutput) {
    console.log("✅ No files changed in this PR to scan.");
    return [];
  }
  const changedFiles = changedFilesOutput.split("\n");
  console.log(`Found ${changedFiles.length} changed file(s) to scan...`);
  //Run Gitleaks on ONLY the final state of those changed files.
  const args = ["detect", "--no-git"];
  const filesToScan = [];
  for (const file of changedFiles) {
    if (fs.existsSync(file)) {
      args.push("--source", file);
      filesToScan.push(file);
    }
  }
  if (filesToScan.length === 0) {
    console.log("✅ All changes were deletions, no files to scan.");
    return [];
  }
  const leaks = await executeGitleaks(binaryPath, args, config);
  if (leaks.length === 0) {
    return [];
  }

  //Enrich the findings with author data using `git blame`.
  console.log(`Enriching ${leaks.length} finding(s) with author data...`);
  const enrichedLeaks = [];
  for (const leak of leaks) {
    try {
      const blameOutput = execSync(
        `git blame -L ${leak.StartLine},${leak.StartLine} --porcelain ${headSha} -- "${leak.File}"`
      ).toString();
      const commitMatch = blameOutput.match(/^([a-f0-9]{40})/m);
      const authorMatch = blameOutput.match(/^author (.+)/m);
      const mailMatch = blameOutput.match(/^author-mail <(.+)>/m);
      const timeMatch = blameOutput.match(/^author-time ([0-9]+)/m);
      if (commitMatch) leak.Commit = commitMatch[1];
      if (authorMatch) leak.Author = authorMatch[1];
      if (mailMatch) leak.Email = mailMatch[1];
      if (timeMatch)
        leak.Date = new Date(parseInt(timeMatch[1], 10) * 1000).toISOString();
      enrichedLeaks.push(leak);
    } catch (e) {
      console.warn(
        `Could not run git blame on file ${leak.File}, some report data may be missing.`
      );
      enrichedLeaks.push(leak);
    }
  }
  return enrichedLeaks;
}

async function runAllUncommittedScan(binaryPath, config) {
  console.log(
    "Scanning all uncommitted changes (staged, unstaged, and untracked)..."
  );

  // Part 1: Get rich report for staged changes. This is unchanged.
  const stagedLeaks = await runStagedScan(binaryPath, config, true);

  // Part 2 & 3: Scan both unstaged AND untracked files.
  let otherLeaks = [];

  // Get all files that are modified but NOT staged.
  const unstagedFiles = execSync("git diff --name-only")
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);

  // Get all brand new files that are not staged and not in .gitignore.
  const untrackedFiles = execSync("git ls-files --others --exclude-standard")
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);

  const filesToScan = [...new Set([...unstagedFiles, ...untrackedFiles])];

  if (filesToScan.length > 0) {
    let tempDir;
    try {
      console.log(
        `Scanning ${filesToScan.length} unstaged/untracked file(s)...`
      );
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitleaks-uncommitted-"));
      for (const file of filesToScan) {
        const sourcePath = path.join(process.cwd(), file);
        // We check for existence because a file could have been deleted (unstaged deletion).
        if (fs.existsSync(sourcePath) && fs.lstatSync(sourcePath).isFile()) {
          const tempFilePath = path.join(tempDir, file);
          fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
          fs.copyFileSync(sourcePath, tempFilePath);
        }
      }

      // Only run the scan if the temp directory is not empty
      if (fs.readdirSync(tempDir).length > 0) {
        const args = ["detect", "--source", tempDir, "--no-git"];
        const rawLeaks = await executeGitleaks(binaryPath, args, config);

        // Clean up the paths to be relative to the project root.
        otherLeaks = rawLeaks.map((leak) => {
          const originalPath = leak.File;
          const relativePath = path
            .relative(tempDir, originalPath)
            .replace(/\\/g, "/");
          leak.File = relativePath;
          leak.Fingerprint = leak.Fingerprint.replace(
            originalPath,
            relativePath
          );
          return leak;
        });
      }
    } finally {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  // Combine and de-duplicate the results.
  const allLeaks = [...stagedLeaks];
  const stagedFingerprints = new Set(stagedLeaks.map((l) => l.Fingerprint));
  for (const leak of otherLeaks) {
    if (!stagedFingerprints.has(leak.Fingerprint)) {
      allLeaks.push(leak);
    }
  }
  return allLeaks;
}
async function runStagedScan(binaryPath, config, silent = false) {
  const stagedFiles = execSync("git diff --cached --name-only")
    .toString()
    .trim();
  if (!stagedFiles) {
    if (!silent) console.log("✅ No staged changes to scan.");
    return [];
  }
  try {
    if (!silent) console.log("Running Scan on staged changes...");
    const treeHash = execSync("git write-tree").toString().trim();
    const commitHash = execSync(
      `echo "gitleaks-secret-scanner virtual commit" | git commit-tree ${treeHash} -p HEAD`
    )
      .toString()
      .trim();
    const args = [
      "detect",
      "--source",
      ".",
      "--log-opts",
      `HEAD..${commitHash}`,
    ];
    return await executeGitleaks(binaryPath, args, config);
  } catch (err) {
    throw new Error(`Staged scan failed: ${err.message}`);
  }
}
async function runHistoryScan(binaryPath, config) {
  const args = ["detect", "--source", "."];
  if (config.scanDepth && config.scanDepth > 0) {
    // If a depth is provided, use it to limit the scan.
    console.log(
      `Scanning the last ${config.scanDepth} commit(s) of repository history...`
    );
    args.push("--log-opts", `--max-count=${config.scanDepth}`);
  } else {
    // Otherwise, scan the entire history and report the total count.
    const commitCount = parseInt(
      execSync(`git rev-list --count HEAD`).toString().trim(),
      10
    );
    console.log(
      `Scanning ${commitCount} total commits in repository history...`
    );
  }
  return executeGitleaks(binaryPath, args, config);
}
function executeGitleaks(binaryPath, args, config) {
  return new Promise((resolve, reject) => {
    const tempReportPath = path.join(
      os.tmpdir(),
      `gitleaks-report-${Date.now()}.json`
    );
    const finalArgs = [
      ...args,
      "--report-format",
      "json",
      "--report-path",
      tempReportPath,
    ];
    if (config.configPath) finalArgs.push("--config", config.configPath);
    if (config.additionalArgs) finalArgs.push(...config.additionalArgs);

    const gitleaks = spawn(binaryPath, finalArgs);
    let stderr = "";
    gitleaks.stderr.on("data", (data) => {
      stderr += data;
    });
    gitleaks.on("error", (err) =>
      reject(new Error(`Gitleaks execution failed: ${err.message}`))
    );

    gitleaks.on("close", (code) => {
      try {
        if (code === 0 || code === 1) {
          const output = fs.existsSync(tempReportPath)
            ? fs.readFileSync(tempReportPath, "utf8")
            : "[]";
          resolve(JSON.parse(output));
        } else {
          reject(
            new Error(
              `Gitleaks exited with unexpected code ${code}:\n${stderr}`
            )
          );
        }
      } catch (err) {
        reject(err);
      } finally {
        if (fs.existsSync(tempReportPath)) fs.unlinkSync(tempReportPath);
      }
    });
  });
}

function printConsoleSummary(leaks, config) {
  if (!config.additionalArgs.includes("--no-banner")) {
    console.log("\n    ○\n    │╲\n    │ ○\n    ○ ░\n    ░    gitleaks\n");
  }

  if (leaks.length > 0) {
    for (const leak of leaks) {
      const parts = [
        `Finding:     ${leak.Description}`,
        `Secret:      REDACTED`,
        `RuleID:      ${leak.RuleID}`,
        `File:        ${leak.File}`,
        `Line:        ${leak.StartLine}`,
      ];
      if (leak.Commit) parts.push(`Commit:      ${leak.Commit}`);
      if (leak.Author) parts.push(`Author:      ${leak.Author}`);
      if (leak.Date) parts.push(`Date:        ${leak.Date}`);

      console.log(parts.join("\n"));
      console.log("----------------------------------------------------");
    }
    console.log(`\nWRN leaks found: ${leaks.length}`);
  } else {
    console.log("INF no leaks found");
  }
}

function generateReportFiles(leaks, config) {
  function getDefaultReportPath(format) {
    const ext =
      { json: "json", csv: "csv", sarif: "sarif", junit: "xml" }[format] ||
      format;
    return `gitleaks-report.${ext}`;
  }
  if (config.htmlReport) {
    console.log(`\nGenerating HTML report...`);
    const reportPath =
      config.htmlReport === true ? "gitleaks-report.html" : config.htmlReport;
    generateHtmlReport(leaks, reportPath);
    console.log(`✅ HTML report generated: ${reportPath}`);
  } else if (config.reportFormat) {
    console.log(`\nGenerating ${config.reportFormat.toUpperCase()} report...`);
    const reportPath =
      config.reportPath || getDefaultReportPath(config.reportFormat);
    fs.writeFileSync(reportPath, JSON.stringify(leaks, null, 2));
    console.log(
      `✅ ${config.reportFormat.toUpperCase()} report generated: ${reportPath}`
    );
  }
}

module.exports = {
  runScan,
  runPassThroughCommand,
};
