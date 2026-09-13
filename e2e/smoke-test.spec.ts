import {test, expect, Page} from '@playwright/test';

async function skipWelcome(page: Page) {
	await page.goto('http://localhost:5173');
	await page.getByRole('button', {name: 'Skip'}).click();
	await page.reload();
}

async function createStory(page: Page, name = 'E2E Test Story') {
	await skipWelcome(page);
	await page.getByRole('tab', {name: 'Story'}).click();
	await page.getByRole('button', {name: 'New'}).click();
	await page
		.getByRole('textbox', {
			name: 'What should your story be named? You can change this later.'
		})
		.type(name);
	await page.getByRole('button', {name: 'Create'}).click();
}

test('Shows welcome screen on first run', async ({page}) => {
	await page.goto('http://localhost:5173');
	await expect(page).toHaveTitle('Hi!');
});

test("Doesn't show welcome screen after user finishes it", async ({page}) => {
	await skipWelcome(page);
	await expect(page).toHaveTitle('0 Stories');
	await page.goto('http://localhost:5173');
	await expect(page).toHaveTitle('0 Stories');
	await page.reload();
	await expect(page).toHaveTitle('0 Stories');
});

test('Creates a story and opens the 93 Days Narrative Editor', async ({page}) => {
	await createStory(page, 'Create story test');
	await expect(page).toHaveTitle('Create story test');
	await expect(page.getByText('93 Days · Narrative Editor')).toBeVisible();
	await expect(page.getByRole('tab', {name: 'История'})).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await expect(page.getByRole('tab', {name: 'Время и мир'})).toBeVisible();

	await page.goto('http://localhost:5173');
	await expect(page).toHaveTitle('1 Story');
	await expect(page.getByText('Create story test')).toBeVisible();
	await page.reload();
	await expect(page).toHaveTitle('1 Story');
	await expect(page.getByText('Create story test')).toBeVisible();
});

test('Persists the selected Narrative Editor workspace', async ({page}) => {
	await createStory(page, 'Workspace persistence test');
	const worldTimeTab = page.getByRole('tab', {name: 'Время и мир'});

	await worldTimeTab.click();
	await expect(worldTimeTab).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByText('Сохраняю…')).toBeVisible();
	await expect(page.getByText('Сохранено')).toBeVisible();

	await page.reload();
	await expect(page.getByRole('tab', {name: 'Время и мир'})).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await expect(page.getByRole('tab', {name: 'История'})).toHaveAttribute(
		'aria-selected',
		'false'
	);
});

test('Keeps STORY and WORLD/TIME as the only top-level workspaces', async ({
	page
}) => {
	await createStory(page, 'Workspace invariant test');
	const workspaceTabs = page
		.getByRole('tablist', {name: 'Рабочее пространство'})
		.getByRole('tab');

	await expect(workspaceTabs).toHaveCount(2);
	await expect(page.getByRole('tab', {name: 'История'})).toBeVisible();
	await expect(page.getByRole('tab', {name: 'Время и мир'})).toBeVisible();

	await page.getByRole('button', {name: 'Split View'}).click();
	await expect(workspaceTabs).toHaveCount(2);
	await expect(
		page.getByText('Split View — это линза, не третье workspace.')
	).toBeVisible();
});

test('Opens the Living Simulation playtest controls', async ({page}) => {
	await createStory(page, 'Playtest surface test');
	await page.getByRole('button', {name: 'Playtest / Debug'}).click();

	await expect(page.getByLabel('Living Simulation playtest')).toBeVisible();
	await expect(page.getByLabel('Simulation Playhead controls')).toBeVisible();
	await expect(
		page.getByRole('button', {name: 'Play', exact: true})
	).toBeVisible();
	await expect(page.getByRole('button', {name: '+1 мин'})).toBeVisible();
	await expect(page.getByRole('button', {name: '+5 мин'})).toBeVisible();
	await expect(page.getByRole('button', {name: '+30 мин'})).toBeVisible();
});
