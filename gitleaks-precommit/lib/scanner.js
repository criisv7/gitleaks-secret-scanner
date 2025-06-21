const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports.runScan = (binaryPath, config) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(binaryPath)) {
      return reject(new Error('Gitleaks binary missing'));
    }

    const args = [
      'detect',
      '--source=-',
      '--pipe',
      '--redact',
      '--exit-code=1',
      '-v'
    ];

    // Add custom config if specified
    if (config.configPath) {
      args.push('--config', config.configPath);
    }

    // Add any additional arguments
    if (config.additionalArgs) {
      args.push(...config.additionalArgs);
    }

    const gitDiff = spawn('git', ['diff', '--cached']);
    const gitleaks = spawn(binaryPath, args);

    gitDiff.stdout.pipe(gitleaks.stdin);

    gitleaks.stdout.on('data', (data) => process.stdout.write(data));
    gitleaks.stderr.on('data', (data) => process.stderr.write(data));

    gitleaks.on('error', (error) => {
      reject(new Error(`Gitleaks execution failed: ${error.message}`));
    });

    gitleaks.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error('Secrets detected in commit'));
    });
  });
};