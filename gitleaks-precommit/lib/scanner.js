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
  if (!baseSha || !headSha) {
    throw new Error(
      "For --diff-mode ci, BASE_SHA and HEAD_SHA environment variables must be set."
    );
  }

  const commitCount = parseInt(
    execSync(`git rev-list --count ${baseSha}..${headSha}`).toString().trim(),
    10
  );
  console.log(
    `Scanning ${commitCount} commit(s) between ${baseSha.slice(
      0,
      7
    )} and ${headSha.slice(0, 7)}...`
  );

  if (commitCount === 0) {
    console.log("No new commits to scan.");
    return [];
  }
  const scanArgs = [
    "detect",
    "--source",
    ".",
    "--log-opts",
    `${baseSha}..${headSha}`,
  ];
  const potentialLeaks = await executeGitleaks(binaryPath, scanArgs, config);

  if (potentialLeaks.length === 0) {
    return [];
  }

  console.log("Filtering findings to only include newly added lines...");
  const diffOutput = execSync(
    `git diff --unified=0 ${baseSha}..${headSha}`
  ).toString();
  const addedLines = new Set();
  let currentFile = null;
  let currentLineNum = 0;

  for (const line of diffOutput.split("\n")) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.substring(6);
      continue;
    }
    if (!currentFile) {
      continue;
    }
    if (line.startsWith("@@")) {
      const match = line.match(/\+([0-9]+)/);
      if (match) {
        currentLineNum = parseInt(match[1], 10);
      }
      continue;
    }
    if (line.startsWith("+")) {
      addedLines.add(`${currentFile}:${currentLineNum}`);
      currentLineNum++;
    } else if (line.startsWith(" ")) {
      currentLineNum++;
    }
  }

  const finalLeaks = potentialLeaks.filter((leak) => {
    const key = `${leak.File}:${leak.StartLine}`;
    return addedLines.has(key);
  });
  const deduplicatedLeaks = [];
  const processedLines = new Set();

  for (const leak of finalLeaks) {
    const uniqueKey = `${leak.File}:${leak.StartLine}`;
    if (!processedLines.has(uniqueKey)) {
      deduplicatedLeaks.push(leak);
      processedLines.add(uniqueKey);
    }
  }

  return deduplicatedLeaks;
}

async function runAllUncommittedScan(binaryPath, config) {
  console.log("Scanning all uncommitted changes...");
  const stagedLeaks = await runStagedScan(binaryPath, config, true);

  let unstagedLeaks = [];
  const unstagedFiles = execSync("git diff --name-only")
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  if (unstagedFiles.length > 0) {
    let tempDir;
    try {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitleaks-unstaged-"));
      for (const file of unstagedFiles) {
        const sourcePath = path.join(process.cwd(), file);
        if (fs.existsSync(sourcePath) && fs.lstatSync(sourcePath).isFile()) {
          const tempFilePath = path.join(tempDir, file);
          fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
          fs.copyFileSync(sourcePath, tempFilePath);
        }
      }
      const args = ["detect", "--source", tempDir, "--no-git"];
      const rawLeaks = await executeGitleaks(binaryPath, args, config);
      unstagedLeaks = rawLeaks.map((leak) => {
        const originalPath = leak.File;
        const relativePath = path
          .relative(tempDir, originalPath)
          .replace(/\\/g, "/");
        leak.File = relativePath;
        leak.Fingerprint = leak.Fingerprint.replace(originalPath, relativePath);
        return leak;
      });
    } finally {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  const allLeaks = [...stagedLeaks];
  const stagedFingerprints = new Set(stagedLeaks.map((l) => l.Fingerprint));
  for (const leak of unstagedLeaks) {
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
