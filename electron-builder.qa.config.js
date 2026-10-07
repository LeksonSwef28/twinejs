const baseConfig = require('./electron-builder.config.js');

const qaProductName = '93 Days QA';
const qaAppId = 'io.github.leksonswef28.days93.qa';
const qaBuildId = process.env.GITHUB_SHA
	? process.env.GITHUB_SHA.slice(0, 12)
	: 'local';

const config = {
	...baseConfig,
	appId: qaAppId,
	productName: qaProductName,
	directories: {
		...baseConfig.directories,
		output: 'dist/electron-qa'
	},
	extraMetadata: {
		...baseConfig.extraMetadata,
		name: '93-days-qa',
		productName: qaProductName
	},
	linux: {
		...baseConfig.linux,
		artifactName: `93-Days-QA-${qaBuildId}-Linux-\${arch}.zip`
	},
	mac: {
		...baseConfig.mac,
		artifactName: `93-Days-QA-${qaBuildId}-macOS.dmg`
	},
	win: {
		...baseConfig.win,
		artifactName: `93-Days-QA-${qaBuildId}-Windows.exe`
	}
};

// Internal QA packaging deliberately does not inherit the upstream Twine
// notarization hook. Public signing/notarization is a separate release gate.
delete config.afterSign;

module.exports = config;
