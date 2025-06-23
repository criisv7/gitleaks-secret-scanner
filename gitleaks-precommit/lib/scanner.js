const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateHtmlReport } = require('./report-generator');

// Helper to get default report path
function getDefaultReportPath(format) {
  const baseName = 'gitleaks-report';
  const extMap = {
    json: 'json',
    csv: 'csv',
    sarif: 'sarif',
    junit: 'xml',
    template: 'txt'
  };
  return `${baseName}.${extMap[format] || format}`;
}

module.exports.runScan = (binaryPath, config) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(binaryPath)) {
      return reject(new Error('Gitleaks binary missing'));
    }

    const args = [
      'detect',
      '--source', '.',
      '--pipe', // Keep pipe for staged changes
      '--redact',
      '--exit-code', '1'
    ];

    // Handle report generation
    let jsonOutputPath = null;
    let hasReportArgs = false;
    let reportFormat = null;
    let reportPath = null;
    
    // First, check if user has specified any report arguments
    if (config.additionalArgs) {
      hasReportArgs = config.additionalArgs.some(arg => 
        ['--report-format', '-f', '--report-path', '-r'].includes(arg)
      );
      
      // Extract report format
      const formatIndex = config.additionalArgs.findIndex(arg => 
        ['--report-format', '-f'].includes(arg)
      );
      
      if (formatIndex !== -1) {
        reportFormat = config.additionalArgs[formatIndex + 1];
      }
      
      // Check if report path is missing
      const pathIndex = config.additionalArgs.findIndex(arg => 
        ['--report-path', '-r'].includes(arg)
      );
      
      if (formatIndex !== -1 && pathIndex === -1) {
        // Generate default report path
        reportPath = getDefaultReportPath(reportFormat);
        args.push('--report-path', reportPath);
        console.log(`ℹ️ Using default report path: ${reportPath}`);
      }
    }

    // Only handle HTML report if no other report format specified
    if (config.htmlReport && !hasReportArgs) {
      jsonOutputPath = path.join(
        os.tmpdir(),
        `gitleaks-temp-${Date.now()}.json`
      );
      args.push('--report-format', 'json');
      args.push('--report-path', jsonOutputPath);
    }

    // Add config path if specified
    if (config.configPath) {
      args.push('--config', config.configPath);
    }

    // Add additional arguments (including report args if specified)
    if (config.additionalArgs) {
      args.push(...config.additionalArgs);
    }

    // Add verbosity flags
    if (config.debug) {
      args.push('--log-level', 'debug');
    } else {
      args.push('-v');
    }

    // Debug logging
    if (config.debug) {
      console.log('[DEBUG] Final command:', binaryPath, ...args);
      console.log('[DEBUG] Config:', config);
      console.log('[DEBUG] HTML Report Path:', config.htmlReport);
      console.log('[DEBUG] JSON Temp Path:', jsonOutputPath);
    }

    // Run git diff
    const gitDiff = spawn('git', ['diff', '--cached']);
    
    // Run gitleaks
    const gitleaks = spawn(binaryPath, args);

    // Pipe git diff to gitleaks
    gitDiff.stdout.pipe(gitleaks.stdin);

    // Handle output streams
    gitleaks.stdout.on('data', (data) => {
      const output = data.toString();
      if (config.debug) console.log('[DEBUG] Gitleaks stdout:', output);
      process.stdout.write(data);
    });
    
    gitleaks.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      if (config.debug) console.log('[DEBUG] Gitleaks stderr:', errorOutput);
      process.stderr.write(data);
    });

    gitleaks.on('close', (code) => {
      try {
        // Generate HTML report if requested and no other report format was specified
        if (config.htmlReport && !hasReportArgs && jsonOutputPath && fs.existsSync(jsonOutputPath)) {
          if (config.debug) console.log('[DEBUG] Generating HTML report');
          generateHtmlReport(jsonOutputPath, config.htmlReport);
          console.log(`✅ HTML report generated: ${config.htmlReport}`);
          if (config.debug) console.log('[DEBUG] Cleaning up JSON temp file');
          fs.unlinkSync(jsonOutputPath);
        }

        if (code === 0) {
          resolve();
        } else if (code === 1) {
          reject(new Error('Secrets detected in commit'));
        } else {
          reject(new Error(`Gitleaks exited with code ${code}`));
        }
      } catch (reportError) {
        if (config.debug) console.error('[DEBUG] Report error:', reportError);
        reject(new Error(`Report generation failed: ${reportError.message}`));
      }
    });
    
    gitDiff.on('error', (error) => {
      if (config.debug) console.error('[DEBUG] git diff error:', error);
      reject(new Error(`git diff failed: ${error.message}`));
    });
    
    gitleaks.on('error', (error) => {
      if (config.debug) console.error('[DEBUG] Gitleaks error:', error);
      reject(new Error(`Gitleaks execution failed: ${error.message}`));
    });
  });
};