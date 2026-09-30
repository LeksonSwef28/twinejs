import {app} from 'electron';
import {mkdirpSync} from 'fs-extra';
import {isAbsolute, join} from 'path';

export function applyDevelopmentProfile(
	environment: NodeJS.ProcessEnv = process.env
) {
	if (environment.NODE_ENV !== 'development') {
		return false;
	}

	const profileRoot = environment.TWINE_DEV_PROFILE_ROOT?.trim();

	if (!profileRoot) {
		return false;
	}

	if (!isAbsolute(profileRoot)) {
		throw new Error('TWINE_DEV_PROFILE_ROOT must be an absolute path');
	}

	const userDataPath = join(profileRoot, 'user-data');
	const documentsPath = join(profileRoot, 'documents');

	mkdirpSync(userDataPath);
	mkdirpSync(documentsPath);
	app.setPath('userData', userDataPath);
	app.setPath('documents', documentsPath);

	console.log(`Development Electron profile initialized at ${profileRoot}`);
	return true;
}
