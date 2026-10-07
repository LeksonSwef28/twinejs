import {app} from 'electron';
import {mkdirpSync} from 'fs-extra';
import {join} from 'path';
import {
	applyQaProfile,
	qaProductName,
	qaProfileDirectoryName
} from '../qa-profile';

jest.mock('electron');
jest.mock('fs-extra');

const qaBuilderConfig = require('../../../../electron-builder.qa.config.js');

function setPackaged(value: boolean) {
	Object.defineProperty(app, 'isPackaged', {
		configurable: true,
		value
	});
}

describe('93 Days QA package identity', () => {
	const setPathMock = app.setPath as jest.Mock;
	const mkdirpSyncMock = mkdirpSync as jest.Mock;

	beforeEach(() => {
		setPackaged(false);
	});

	it('redirects packaged QA userData and documents away from Twine defaults', () => {
		setPackaged(true);
		jest.spyOn(app, 'getName').mockReturnValue(qaProductName);
		jest.spyOn(app, 'getPath').mockImplementation(name => {
			if (name === 'appData') {
				return join('mock', 'app-data');
			}
			if (name === 'documents') {
				return join('mock', 'documents');
			}
			return join('mock', name);
		});

		expect(applyQaProfile()).toBe(true);

		const userDataPath = join('mock', 'app-data', qaProfileDirectoryName);
		const documentsPath = join('mock', 'documents', qaProfileDirectoryName);

		expect(mkdirpSyncMock.mock.calls).toEqual([
			[userDataPath],
			[documentsPath]
		]);
		expect(setPathMock.mock.calls).toEqual([
			['userData', userDataPath],
			['documents', documentsPath]
		]);
		expect(userDataPath).not.toContain('Twine');
		expect(documentsPath).not.toContain('Twine');
	});

	it('does not redirect an ordinary packaged Twine build', () => {
		setPackaged(true);
		jest.spyOn(app, 'getName').mockReturnValue('Twine');

		expect(applyQaProfile()).toBe(false);
		expect(mkdirpSyncMock).not.toHaveBeenCalled();
		expect(setPathMock).not.toHaveBeenCalled();
	});

	it('does not redirect unpackaged development launches', () => {
		jest.spyOn(app, 'getName').mockReturnValue(qaProductName);

		expect(applyQaProfile()).toBe(false);
		expect(mkdirpSyncMock).not.toHaveBeenCalled();
		expect(setPathMock).not.toHaveBeenCalled();
	});

	it('keeps builder metadata aligned with the runtime QA marker', () => {
		expect(qaBuilderConfig).toMatchObject({
			appId: 'io.github.leksonswef28.days93.qa',
			productName: qaProductName,
			directories: {output: 'dist/electron-qa'},
			extraMetadata: {
				name: '93-days-qa',
				productName: qaProductName
			}
		});
		expect(qaBuilderConfig.win.artifactName).toMatch(/^93-Days-QA-/);
		expect(qaBuilderConfig.mac.artifactName).toMatch(/^93-Days-QA-/);
		expect(qaBuilderConfig.linux.artifactName).toMatch(/^93-Days-QA-/);
		expect(qaBuilderConfig.afterSign).toBeUndefined();
	});
});
