import {expect, test} from '@playwright/test';
import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1,
	serializeNarrativeRuntimeArtifact
} from '../src/application/narrative/export-compiler';
import {
	embedNarrativeRuntimeArtifactInPlayerHtml
} from '../src/application/narrative/player-package';
import {createNarrativeProject} from '../src/domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../src/domain/narrative/templates/93-days';
import {narrativePlayerDevelopmentHandoffKey} from '../src/player/artifact-source';

function artifact(name: string, projectId: string): NarrativeRuntimeArtifactV1 {
	const project = createNarrativeProject(
		'a54-browser-host',
		name,
		ninetyThreeDaysTemplate
	);
	project.projectId = projectId;
	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected browser host fixture to compile.');
	}
	return compiled.artifact;
}

test('boots the dedicated player from the ephemeral development handoff', async ({
	page
}) => {
	const source = artifact('A54 Development Player', 'a54-development-player');

	await page.goto('http://localhost:5173/');
	await page.evaluate(
		({key, value}) => window.sessionStorage.setItem(key, value),
		{
			key: narrativePlayerDevelopmentHandoffKey,
			value: serializeNarrativeRuntimeArtifact(source)
		}
	);
	await page.evaluate(() => {
		const link = document.createElement('a');
		link.id = 'a54-player-launch';
		link.href = '/player.html#handoff=session';
		link.target = '_blank';
		link.textContent = 'Launch player';
		document.body.appendChild(link);
	});

	const playerPagePromise = page.context().waitForEvent('page');
	await page.locator('#a54-player-launch').click();
	const playerPage = await playerPagePromise;
	await playerPage.waitForLoadState();

	await expect(
		playerPage.locator('[data-player-status="ready"]')
	).toBeVisible();
	await expect(
		playerPage.getByRole('heading', {name: 'A54 Development Player'})
	).toBeVisible();
	await expect(playerPage.getByText('Canonical runtime ready')).toBeVisible();
	await expect(playerPage.getByText('a54-development-player')).toBeVisible();
});

test('boots the standalone player when exact artifact JSON is embedded in its HTML', async ({
	page
}) => {
	const source = artifact('A54 Standalone Player', 'a54-standalone-player');

	await page.route('**/player.html', async route => {
		const response = await route.fetch();
		const template = await response.text();
		await route.fulfill({
			response,
			body: embedNarrativeRuntimeArtifactInPlayerHtml(template, source)
		});
	});

	await page.goto('http://localhost:5173/player.html');

	await expect(page.locator('[data-player-status="ready"]')).toBeVisible();
	await expect(
		page.getByRole('heading', {name: 'A54 Standalone Player'})
	).toBeVisible();
	await expect(page.getByText('Canonical runtime ready')).toBeVisible();
	await expect(page.getByText('a54-standalone-player')).toBeVisible();
});
