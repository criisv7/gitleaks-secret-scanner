const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateHtmlReport } = require('./report-generator');

function getDefaultReportPath(format) {
  const ext = { json: 'json', csv: 'csv', sarif: 'sarif', junit: 'xml' }[format] || format;
  return `gitleaks-report.${ext}`;
}

function createEmptyReport(format, reportPath) {
  let content = '';
  switch (format) {
    case 'json': content = '[]'; break;
    case 'csv': content = 'commit,author,date,email,file,line,message,rule,secret,tags\n'; break;
    case 'junit': content = '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="gitleaks"></testsuites>'; break;
    case 'sarif': content = JSON.stringify({ $schema: "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json", version: "2.1.0", runs: [{ tool: { driver: { name: "gitleaks" } }, results: [] }] }, null, 2); break;
    default: content = '';
  }
  fs.writeFileSync(reportPath, content, 'utf8');
  console.log(`✅ Created empty ${format.toUpperCase()} report: ${reportPath}`);
}

module.exports.runScan = (binaryPath, config) => {
  return new Promise(async (resolve, reject) => {
    if (!fs.existsSync(binaryPath)) {
      return reject(new Error('Gitleaks binary missing'));
    }

    // --- Reporting Logic ---
    let targetReport = null;
    let tempJsonPath = null;
    if (config.reportFormat) {
      if (config.htmlReport) {
        console.warn(`⚠️ Both --report-format and --html-report were specified. Ignoring --html-report and generating a ${config.reportFormat.toUpperCase()} report.`);
      }
      targetReport = { format: config.reportFormat, path: config.reportPath || getDefaultReportPath(config.reportFormat) };
    } else if (config.htmlReport) {
      targetReport = { format: 'html', path: config.htmlReport };
      tempJsonPath = path.join(os.tmpdir(), `gitleaks-temp-${Date.now()}.json`);
    }
    const detectArgs = ['detect', '--source', '.', '--pipe', '--redact', '--exit-code', '1'];
    if (targetReport && targetReport.format !== 'html') {
      detectArgs.push('--report-format', targetReport.format, '--report-path', targetReport.path);
    } else if (tempJsonPath) {
      detectArgs.push('--report-format', 'json', '--report-path', tempJsonPath);
    }
    if (config.configPath) detectArgs.push('--config', config.configPath);
    if (config.additionalArgs) detectArgs.push(...config.additionalArgs);
    if (config.debug) { detectArgs.push('--log-level', 'debug'); } else { detectArgs.push('-v'); }
    if (config.debug) { console.log('[DEBUG] Target report config:', targetReport); }


    let diffCommand;
    switch (config.diffMode) {
      case 'all':
        diffCommand = ['diff', 'HEAD'];
        break;
      case 'ci':
        const baseSha = process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA;
        const currentSha = process.env.CI_COMMIT_SHA;

        if (!baseSha || !currentSha) {
          return reject(new Error(
            'For --diff-mode ci, the environment variables CI_MERGE_REQUEST_DIFF_BASE_SHA and CI_COMMIT_SHA must be set. This mode is designed for GitLab CI merge request pipelines.'
          ));
        }
        
        // The '..' syntax compares the tips of the two commits.
        diffCommand = ['diff', `${baseSha}..${currentSha}`];
        break;
      case 'staged':
      default:
        diffCommand = ['diff', '--cached'];
        break;
    }

    if (config.debug) {
        console.log(`[DEBUG] Using git diff command: git ${diffCommand.join(' ')}`);
    }

    const gitDiff = spawn('git', diffCommand);
    const gitleaks = spawn(binaryPath, detectArgs);

    gitDiff.stdout.pipe(gitleaks.stdin);
    gitleaks.stdout.on('data', data => process.stdout.write(data));
    gitleaks.stderr.on('data', data => process.stderr.write(data));
    gitDiff.on('error', err => reject(new Error(`git diff failed: ${err.message}`)));
    gitleaks.on('error', err => reject(new Error(`Gitleaks execution failed: ${err.message}`)));
    gitleaks.on('close', async (code) => {
      try {
        if (targetReport) {
          if (code === 0) {
            if (targetReport.format === 'html') {
              generateHtmlReport(null, targetReport.path);
              console.log(`✅ Created empty HTML report: ${targetReport.path}`);
            } else {
              createEmptyReport(targetReport.format, targetReport.path);
            }
          } else if (code === 1) {
            if (targetReport.format === 'html' && tempJsonPath) {
              generateHtmlReport(tempJsonPath, targetReport.path);
              console.log(`✅ HTML report generated from findings: ${targetReport.path}`);
            } else {
              console.log(`✅ ${targetReport.format.toUpperCase()} report generated with findings: ${targetReport.path}`);
            }
          }
        }
        if (code === 0) { resolve(); } 
        else if (code === 1) { reject(new Error('Secrets detected in commit')); } 
        else { reject(new Error(`Gitleaks exited with code ${code}`)); }
      } catch (reportError) {
        reject(new Error(`Report generation failed: ${reportError.message}`));
      } finally {
        if (tempJsonPath && fs.existsSync(tempJsonPath)) {
          if (config.debug) console.log(`[DEBUG] Cleaning up temp file: ${tempJsonPath}`);
          fs.unlinkSync(tempJsonPath);
        }
      }
    });
  });
};