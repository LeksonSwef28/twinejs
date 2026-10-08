'use strict';

const {chromium} = require('@playwright/test');

(async () => {
	const browser = await chromium.connectOverCDP('http://127.0.0.1:9222', {
		timeout: 30000
	});
	try {
		const context = browser.contexts()[0];
		const editor = await context.waitForEvent('page', {
			predicate: page => page.url().includes('index.html'),
			timeout: 10000
		}).catch(() => context.pages().find(page => page.url().includes('index.html')));
		if (!editor) throw new Error('Packaged QA editor renderer was not found');
		editor.setDefaultTimeout(20000);
		const skip = editor.getByRole('button', {name: 'Skip'});
		if (await skip.isVisible()) await skip.click();
		await editor.getByRole('tab', {name: 'Story'}).click();
		await editor.getByRole('button', {name: 'New'}).click();
		await editor.getByRole('textbox', {
			name: 'What should your story be named? You can change this later.'
		}).fill('QA packaged A68');
		await editor.getByRole('button', {name: 'Create'}).click();
		await editor.getByText('93 Days · Narrative Editor').waitFor();
		await editor.getByRole('button', {name: 'Экспорт'}).click();
		await editor.getByRole('button', {
			name: 'Загрузить A68-C1 production project'
		}).click();
		await editor.getByText('Готово к сборке').waitFor();
		const popupPromise = editor.waitForEvent('popup');
		await editor.getByRole('button', {name: 'Открыть Player'}).click();
		const player = await popupPromise;
		await player.locator('[data-player-status="ready"]').waitFor({timeout:30000});
		await player.getByRole('button', {name: 'Сохранить'}).click();
		await player.getByText('Игра сохранена').waitFor();
		await player.getByRole('button', {name: 'Продолжить'}).click();
		await player.getByText('Сохранение загружено').waitFor();
		console.log('PACKAGED PLAYER PASS: A68-C1 canonical Player opened and save/continue completed.');
	} finally {
		await browser.close();
	}
})().catch(error => { console.error(error); process.exitCode = 1; });
