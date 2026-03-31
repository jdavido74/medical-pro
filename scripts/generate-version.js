/**
 * Generate version.json in public/ directory before build.
 * Contains version + build timestamp for cache-busting.
 */
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const versionInfo = {
  version: `${pkg.version}-${Date.now()}`,
  buildTime: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || 'local'
};

const outputPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

console.log(`[version] Generated version.json: ${versionInfo.version}`);
