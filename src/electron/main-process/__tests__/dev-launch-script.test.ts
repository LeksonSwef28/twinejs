import {spawnSync} from 'child_process';
import {readFileSync} from 'fs';
import * as path from 'path';

describe('Electron development launch', () => {
	const repositoryRoot = path.resolve(__dirname, '../../../..');
	const packageJson = JSON.parse(
		readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')
	);

	it('routes start:electron through the portable Node wrapper', () => {
		expect(packageJson.scripts['start:electron']).toBe(
			'node scripts/start-electron-dev.cjs'
		);
	});

	it('reports the development environment without launching Electron', () => {
		const result = spawnSync(
			process.execPath,
			[path.join(repositoryRoot, 'scripts/start-electron-dev.cjs'), '--check'],
			{
				cwd: repositoryRoot,
				encoding: 'utf8'
			}
		);

		expect(result.status).toBe(0);
		expect(result.stderr).toBe('');
		expect(result.stdout).toContain('NODE_ENV=development');
	});

	it('reports an absolute repository-local development profile root', () => {
		const result = spawnSync(
			process.execPath,
			[path.join(repositoryRoot, 'scripts/start-electron-dev.cjs'), '--check'],
			{
				cwd: repositoryRoot,
				encoding: 'utf8'
			}
		);
		const profileLine = result.stdout
			.split(/\r?\n/)
			.find(line => line.startsWith('TWINE_DEV_PROFILE_ROOT='));
		const profileRoot = profileLine?.slice('TWINE_DEV_PROFILE_ROOT='.length);

		expect(result.status).toBe(0);
		expect(profileRoot).toBeDefined();
		expect(path.isAbsolute(profileRoot!)).toBe(true);
		expect(path.basename(profileRoot!)).toBe('.twine-dev-profile');
	});

	it('applies the development profile before loading Electron app preferences', () => {
		const mainSource = readFileSync(
			path.join(repositoryRoot, 'src/electron/main-process/index.ts'),
			'utf8'
		);
		const profileIndex = mainSource.indexOf('applyDevelopmentProfile();');
		const prefsIndex = mainSource.indexOf('loadAppPrefs();');

		expect(profileIndex).toBeGreaterThanOrEqual(0);
		expect(prefsIndex).toBeGreaterThan(profileIndex);
	});

	it('keeps the repository-local development profile out of Git', () => {
		const gitignore = readFileSync(
			path.join(repositoryRoot, '.gitignore'),
			'utf8'
		);

		expect(gitignore).toContain('/.twine-dev-profile/');
	});
});
