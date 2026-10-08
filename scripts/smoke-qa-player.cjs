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

		// A67/A68 production Day 1–10 UI acceptance routes. All time advancement,
		// travel and Story execution stays on the actual packaged Canonical Player.
		// No direct runtime mutation, debug data or Preview is used.
		async function runCycle(source) {
			const currentPlayer = source === 'direct' ? player : await (async () => {
				await player.close();
				const nextPopup = editor.waitForEvent('popup');
				await editor.getByRole('button', {name: 'Открыть Player'}).click();
				const fresh = await nextPopup;
				await fresh.locator('[data-player-status="ready"]').waitFor();
				return fresh;
			})();
			currentPlayer.setDefaultTimeout(25000);

			async function minute() {
				const text = await currentPlayer.locator('.narrative-player__clock').innerText();
				const match = text.match(/День\s+(\d+)[\s\S]*?(\d{2}):(\d{2})/);
				if (!match) throw new Error('Cannot parse Player clock: ' + text);
				return (Number(match[1]) - 1) * 1440 + Number(match[2]) * 60 + Number(match[3]);
			}
			async function advance(day, hour, min) {
				const target = (day - 1) * 1440 + hour * 60 + min;
				let steps = 0;
				while ((await minute()) < target) {
					if (++steps > 1150) throw new Error('Day 1-10 Player UI wait bound exceeded');
					const before = await minute();
					const label = target - before >= 15 ? 'Подождать 15 минут' : 'Подождать 5 минут';
					await currentPlayer.getByRole('button', {name: label}).click();
					if ((await minute()) <= before) throw new Error('Player wait did not advance');
				}
			}
			async function move(label) {
				await currentPlayer.getByRole('button', {name: new RegExp(label)}).click();
			}
			async function event(title) {
				const row = currentPlayer.locator('.narrative-player__story-opportunities li').filter({
					hasText: title
				});
				await row.getByRole('button', {name: 'Участвовать'}).click();
			}

			// Day 1: the same authored station → dorm journey used by A67/A68.
			await move('Выйти на транспортную площадь');
			await move('Дойти до остановки');
			await move('Ехать автобусом в сторону общежития');
			await advance(8, 17, 44);
			await move('Дойти от общежития до компьютерного клуба');
			await event('Восьмой день: первый вечер в компьютерном клубе');
			await move(source === 'direct'
				? 'Спросить администратора, что сегодня обсуждают'
				: 'Прочитать закреплённое сообщение на локальном форуме');
			await currentPlayer.getByRole('button', {name: 'Сохранить'}).click();
			await currentPlayer.getByText('Игра сохранена').waitFor();
			await currentPlayer.getByRole('button', {name: 'Продолжить'}).click();
			await currentPlayer.getByText('Сохранение загружено').waitFor();

			await move('Вернуться от компьютерного клуба к общежитию');
			await advance(9, 19, 0);
			await event('Девятый день: рассказать в общежитии');
			await move('Рассказать дежурной, что узнал о завтрашней игре в клубе');
			await advance(10, 18, 14);
			await move('Дойти от общежития до компьютерного клуба');
			if (source === 'direct') {
				await event('Десятый день: знакомый разговор у стойки');
				await move('Спросить, удалось ли собрать людей на позднюю игру');
			} else {
				// Forum provenance grants knowledge but does not establish a worker
				// relationship or unlock the personal acquaintance follow-up.
				const followup = currentPlayer.locator(
					'.narrative-player__story-opportunities li'
				).filter({hasText: 'Десятый день: знакомый разговор у стойки'});
				if ((await followup.count()) !== 0) {
					throw new Error('Forum-only history incorrectly opened personal Day 10 contact');
				}
			}
			console.log('PACKAGED DAY 1-10 PASS: ' + source + ' source, Day 9 consequence, distinct Day 10 outcome');
			if (currentPlayer !== player) await currentPlayer.close();
		}
		await runCycle('direct');
		await runCycle('forum');
	} finally {
		await browser.close();
	}
})().catch(error => { console.error(error); process.exitCode = 1; });
