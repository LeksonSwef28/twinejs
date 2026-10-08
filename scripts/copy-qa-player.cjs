'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const from = path.join(root, 'dist', 'player');
const to = path.join(root, 'electron-build', 'renderer');

if (!fs.existsSync(path.join(from, 'player.html')) || !fs.existsSync(to)) {
	throw new Error('QA Player or Electron renderer must be built first.');
}

fs.cpSync(from, to, {recursive: true, force: true});
console.log('Canonical Player bundled with packaged QA renderer.');
