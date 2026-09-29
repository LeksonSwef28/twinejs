import {app} from 'electron';
import {mkdirpSync} from 'fs-extra';
import {join, resolve} from 'path';
import {applyDevelopmentProfile} from '../development-profile';

jest.mock('electron');
jest.mock('fs-extra');

describe('applyDevelopmentProfile', () => {
	const setPathMock = app.setPath as jest.Mock;
	const mkdirpSyncMock = mkdirpSync as jest.Mock;
	const profileRoot = resolve('mock-electron-dev-profile');

	it('redirects Electron userData and documents into the isolated profile', () => {
		expect(
			applyDevelopmentProfile({
				NODE_ENV: 'development',
				TWINE_DEV_PROFILE_ROOT: profileRoot
			})
		).toBe(true);

		const userDataPath = join(profileRoot, 'user-data');
		const documentsPath = join(profileRoot, 'documents');

		expect(mkdirpSyncMock).toHaveBeenCalledWith(userDataPath);
		expect(mkdirpSyncMock).toHaveBeenCalledWith(documentsPath);
		expect(setPathMock.mock.calls).toEqual([
			['userData', userDataPath],
			['documents', documentsPath]
		]);
	});

	it('does nothing outside development mode', () => {
		expect(
			applyDevelopmentProfile({
				NODE_ENV: 'production',
				TWINE_DEV_PROFILE_ROOT: profileRoot
			})
		).toBe(false);

		expect(mkdirpSyncMock).not.toHaveBeenCalled();
		expect(setPathMock).not.toHaveBeenCalled();
	});

	it('does nothing when no development profile root is configured', () => {
		expect(applyDevelopmentProfile({NODE_ENV: 'development'})).toBe(false);

		expect(mkdirpSyncMock).not.toHaveBeenCalled();
		expect(setPathMock).not.toHaveBeenCalled();
	});

	it('rejects a relative development profile root', () => {
		expect(() =>
			applyDevelopmentProfile({
				NODE_ENV: 'development',
				TWINE_DEV_PROFILE_ROOT: '.twine-dev-profile'
			})
		).toThrow('TWINE_DEV_PROFILE_ROOT must be an absolute path');

		expect(mkdirpSyncMock).not.toHaveBeenCalled();
		expect(setPathMock).not.toHaveBeenCalled();
	});
});
