#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {embedNarrativeArtifact} = require('./player-package-core.cjs');

function argument(name) {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

const artifactPath = argument('--artifact');
if (!artifactPath) {
	console.error(
		'Usage: npm run package:player -- --artifact path/to/runtime-artifact.json'
	);
	process.exit(1);
}

const playerDir = path.resolve('dist/player');
const templatePath = path.join(playerDir, 'player.html');
const artifactSource = fs.readFileSync(path.resolve(artifactPath), 'utf8');
const template = fs.readFileSync(templatePath, 'utf8');
const packaged = embedNarrativeArtifact(template, artifactSource);

fs.writeFileSync(templatePath, packaged);
fs.writeFileSync(path.join(playerDir, 'index.html'), packaged);
console.log(`Packaged Narrative Player: ${path.join(playerDir, 'index.html')}`);
