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
const archiveName = `twine-${projectPackage.version}-web.zip`;
const archivePath = path.join(distDirectory, archiveName);
fs.rmSync(archivePath, {force: true});

const archive =
	process.platform === 'win32'
		? spawnSync(
				'powershell.exe',
				[
					'-NoProfile',
					'-NonInteractive',
					'-Command',
					`Compress-Archive -Path 'web' -DestinationPath '${archiveName}' -Force`
				],
				{
					cwd: distDirectory,
					stdio: 'inherit'
				}
			)
		: spawnSync('zip', ['-r', archiveName, 'web'], {
				cwd: distDirectory,
				stdio: 'inherit'
			});

if (archive.error) {
	throw archive.error;
}

if (archive.status !== 0) {
	process.exit(archive.status ?? 1);
}
