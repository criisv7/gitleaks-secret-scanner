#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// Set execute permissions on CLI files
const binFiles = [
  path.join(__dirname, "cli.js"),
  path.join(__dirname, "set-permissions.js"),
];

binFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    try {
      fs.chmodSync(file, 0o755); // rwxr-xr-x
      console.log(`Set execute permissions on ${path.basename(file)}`);
    } catch (error) {
      console.warn(`Could not set permissions on ${file}: ${error.message}`);
    }
  }
});
