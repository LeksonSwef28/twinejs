'use strict';

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const distDirectory = path.join(repositoryRoot, 'dist');
const webDirectory = path.join(distDirectory, 'web');
const rendererDirectory = path.join(
	repositoryRoot,
	'electron-build',
	'renderer'
);

if (!fs.existsSync(webDirectory)) {
	throw new Error(`Web build output does not exist: ${webDirectory}`);
}

fs.mkdirSync(path.dirname(rendererDirectory), {recursive: true});
fs.cpSync(webDirectory, rendererDirectory, {
	recursive: true,
	force: true
});

const projectPackage = JSON.parse(
	fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')
);
const crossReplacePackagePath = path.join(
	repositoryRoot,
	'node_modules',
	'cross-replace',
	'package.json'
);
const crossReplacePackage = JSON.parse(
	fs.readFileSync(crossReplacePackagePath, 'utf8')
);
const binDefinition = crossReplacePackage.bin;
const binRelativePath =
	typeof binDefinition === 'string'
		? binDefinition
		: binDefinition?.['cross-replace'] ?? Object.values(binDefinition ?? {})[0];

if (typeof binRelativePath !== 'string') {
	throw new Error('Unable to resolve the cross-replace executable.');
}

const crossReplaceExecutable = path.resolve(
	path.dirname(crossReplacePackagePath),
	binRelativePath
);
const archiveName = `twine-${projectPackage.version}-web.zip`;
const archive = spawnSync(
	process.execPath,
	[crossReplaceExecutable, 'zip', '-r', archiveName, 'web'],
	{
		cwd: distDirectory,
		stdio: 'inherit'
	}
);

if (archive.error) {
	throw archive.error;
}

if (archive.status !== 0) {
	process.exit(archive.status ?? 1);
}
