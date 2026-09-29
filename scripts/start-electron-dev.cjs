'use strict';

const path = require('path');

const checkOnly = process.argv.slice(2).includes('--check');

process.env.NODE_ENV = 'development';
process.env.TWINE_DEV_PROFILE_ROOT = path.resolve(
	__dirname,
	'..',
	'.twine-dev-profile'
);

if (checkOnly) {
	console.log(`NODE_ENV=${process.env.NODE_ENV}`);
	console.log(`TWINE_DEV_PROFILE_ROOT=${process.env.TWINE_DEV_PROFILE_ROOT}`);
	process.exit(0);
}

const runAll = require('npm-run-all');

const streams = {
	stdin: process.stdin,
	stdout: process.stdout,
	stderr: process.stderr
};

async function startElectronDevelopment() {
	await runAll(['clean'], streams);
	await runAll(['build:web', 'build:electron-main'], {
		...streams,
		parallel: true
	});
	await runAll(['start:electron:boot'], streams);
}

startElectronDevelopment().catch(error => {
	if (error instanceof Error) {
		console.error(error.message);
	} else {
		console.error(error);
	}
	process.exitCode = 1;
});
