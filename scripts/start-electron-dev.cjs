'use strict';

const runAll = require('npm-run-all');

const checkOnly = process.argv.slice(2).includes('--check');

process.env.NODE_ENV = 'development';

if (checkOnly) {
	console.log(`NODE_ENV=${process.env.NODE_ENV}`);
	process.exit(0);
}

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
