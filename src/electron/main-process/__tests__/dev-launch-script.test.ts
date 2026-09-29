import {spawnSync} from 'child_process';
import {readFileSync} from 'fs';
import * as path from 'path';

describe('Windows-safe Electron development launch', () => {
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
});
