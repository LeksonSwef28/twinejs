import {app} from 'electron';
import {mkdirpSync} from 'fs-extra';
import {join} from 'path';

export const qaProductName = '93 Days QA';
export const qaProfileDirectoryName = '93 Days QA';

/**
 * Gives packaged 93 Days QA builds their own Electron/browser profile and
 * document root. This runs before prefs are loaded so QA localStorage,
 * preferences, story-library data and backups cannot reuse the ordinary Twine
 * profile by default.
 *
 * Ordinary Twine packages and unpackaged development launches are left alone.
 */
export function applyQaProfile() {
	if (!app.isPackaged || app.getName() !== qaProductName) {
		return false;
	}

	const userDataPath = join(
		app.getPath('appData'),
		qaProfileDirectoryName
	);
	const documentsPath = join(
		app.getPath('documents'),
		qaProfileDirectoryName
	);

	mkdirpSync(userDataPath);
	mkdirpSync(documentsPath);
	app.setPath('userData', userDataPath);
	app.setPath('documents', documentsPath);

	console.log(`93 Days QA Electron profile initialized at ${userDataPath}`);
	return true;
}
