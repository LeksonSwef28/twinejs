import {expect, test} from '@playwright/test';
import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1,
	serializeNarrativeRuntimeArtifact
} from '../src/application/narrative/export-compiler';
import {
	embedNarrativeRuntimeArtifactInPlayerHtml
} from '../src/application/narrative/player-package';
import {NarrativeMoveDefinition} from '../src/domain/narrative/interaction';
import {
	arrivalCorridorIds,
	create93DaysArrivalCorridorProject
} from '../src/domain/narrative/content/93-days-arrival-corridor';
import {create93DaysDayOneDayTwoProject} from '../src/domain/narrative/content/93-days-day-one-day-two';
import {create93DaysEverydaySystemsProject} from '../src/domain/narrative/content/93-days-everyday-systems';
import {create93DaysPhoneSocialLoopProject} from '../src/domain/narrative/content/93-days-phone-social-loop';
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

function presentationArtifact(): NarrativeRuntimeArtifactV1 {
	const project = createNarrativeProject(
		'a55-browser-presentation',
		'A55 Presentation Player',
		ninetyThreeDaysTemplate
	);
	project.projectId = 'a55-presentation-player';
	project.locations = [{id: 'station', name: 'Автовокзал'}];
	project.scenes = [
		{id: 'platform', locationId: 'station', name: 'Платформа прибытия'}
	];
	project.characters = [
		{
			id: 'player',
			name: 'Игрок',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		},
		{
			id: 'katya',
			name: 'Катя',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'katya-default'
		}
	];
	project.behaviorProfiles = [
		{id: 'player-default', characterId: 'player', name: 'Player default'},
		{id: 'katya-default', characterId: 'katya', name: 'Katya default'}
	];
	project.storyNodes = [
		{
			id: 'contact',
			kind: 'dialogue',
			title: 'Первый разговор',
			participantIds: ['player', 'katya'],
			placement: {locationId: 'station'},
			activationState: 'available'
		}
	];
	const greeting: NarrativeMoveDefinition = {
		id: 'greet',
		storyNodeId: 'contact',
		kind: 'custom',
		label: 'Поздороваться',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [
			{
				id: 'same-place',
				condition: {
					type: 'characters-share-location',
					characterIds: ['player', 'katya']
				}
			}
		],
		resolution: {type: 'automatic', outcomeId: 'greet:outcome'},
		outcomes: [
			{
				id: 'greet:outcome',
				key: 'continue',
				label: 'Катя отвечает',
				effectStoryNodeIds: [],
				effects: [
					{
						id: 'complete-contact',
						type: 'story-node-set-state',
						storyNodeId: 'contact',
						state: 'completed'
					}
				]
			}
		]
	};
	project.narrativeMoves = [greeting];

	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A55 browser presentation fixture to compile.');
	}

	// A52 intentionally compiles a fresh game with empty Actual Presence.
	// This browser fixture supplies explicit runtime state to exercise A55;
	// it does not change compiler/fresh-game semantics.
	compiled.artifact.initialRuntime.simulation.actualLocationByCharacter = {
		player: 'station',
		katya: 'station'
	};
	return compiled.artifact;
}

test('boots the dedicated player from the ephemeral development handoff', async ({
	page
}) => {
	const source = artifact('A54 Development Player', 'a54-development-player');

	await page.goto('http://localhost:5173/');
	await page.evaluate(
		({key, value}) => window.localStorage.setItem(key, value),
		{
			key: narrativePlayerDevelopmentHandoffKey,
			value: serializeNarrativeRuntimeArtifact(source)
		}
	);
	await page.evaluate(() => {
		const link = document.createElement('a');
		link.id = 'a54-player-launch';
		link.href = '/player.html#handoff=development';
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
	await expect(
		playerPage.getByRole('heading', {name: 'Игровой персонаж не определён'})
	).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(
				key => window.localStorage.getItem(key),
				narrativePlayerDevelopmentHandoffKey
			)
		)
		.toBeNull();
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
	await expect(
		page.getByRole('heading', {name: 'Игровой персонаж не определён'})
	).toBeVisible();
});

test('boots and traverses the real Arrival Corridor from authored playerStart', async ({
	page
}) => {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysArrivalCorridorProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected real Arrival Corridor fixture to compile.');
	}
	expect(
		compiled.artifact.initialRuntime.simulation.actualLocationByCharacter
	).toEqual({});
	await page.setViewportSize({width: 390, height: 844});

	await page.route('**/player.html', async route => {
		const response = await route.fetch();
		const template = await response.text();
		await route.fulfill({
			response,
			body: embedNarrativeRuntimeArtifactInPlayerHtml(
				template,
				compiled.artifact
			)
		});
	});

	await page.goto('http://localhost:5173/player.html');

	await expect(page.locator('[data-player-view="world"]')).toBeVisible();
	await expect(
		page.getByRole('heading', {name: 'Междугородний автовокзал'})
	).toBeVisible();
	await expect(page.locator('.narrative-player__clock')).toContainText('06:00');

	await page.getByRole('button', {name: 'Подождать 5 минут'}).click();
	await expect(page.getByText('06:05')).toBeVisible();
	await expect(
		page.getByRole('heading', {name: 'Междугородний автовокзал'})
	).toBeVisible();

	const square = page.getByRole('button', {name: /Выйти на транспортную площадь/});
	await expect(square).toBeEnabled();
	await square.click();

	await expect(
		page.getByRole('heading', {name: 'Транспортная площадь'})
	).toBeVisible();
	await expect(page.getByText('06:08')).toBeVisible();

	const stop = page.getByRole('button', {name: /Дойти до остановки/});
	await expect(stop).toBeEnabled();
	await stop.click();

	await expect(
		page.getByRole('heading', {name: 'Остановка у автовокзала'})
	).toBeVisible();
	await expect(page.getByText('06:12')).toBeVisible();

	const routeTaxi = page.getByRole('button', {
		name: /Ехать маршруткой к башне.*18 мин/
	});
	const cityBus = page.getByRole('button', {
		name: /Ехать городским автобусом к башне.*26 мин/
	});
	await expect(routeTaxi).toBeEnabled();
	await expect(cityBus).toBeEnabled();
	await routeTaxi.click();

	await expect(
		page.getByRole('heading', {name: 'Пересадка у водонапорной башни'})
	).toBeVisible();
	await expect(page.getByText('06:30')).toBeVisible();
	await expect(page.getByRole('status')).toContainText(
		'Пересадка у водонапорной башни'
	);
	await expect(page.getByRole('button', {name: /Идти от башни к общежитию/})).toBeEnabled();
	await expect(
		page.locator('[data-player-status="ready"]')
	).toBeVisible();
	await expect(
		page.getByRole('heading', {name: '93 дня до конца нашего лета — Arrival Corridor'})
	).toBeVisible();
	await expect(
		page.getByText(arrivalCorridorIds.locations.busStation)
	).toHaveCount(0);
});

test('plays the real A57 Day One to Day Two path in the standalone player', async ({
	page
}) => {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysDayOneDayTwoProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected real A57 fixture to compile.');
	}
	expect(
		compiled.artifact.initialRuntime.simulation.actualLocationByCharacter
	).toEqual({});
	await page.setViewportSize({width: 390, height: 844});

	await page.route('**/player.html', async route => {
		const response = await route.fetch();
		const template = await response.text();
		await route.fulfill({
			response,
			body: embedNarrativeRuntimeArtifactInPlayerHtml(
				template,
				compiled.artifact
			)
		});
	});

	await page.goto('http://localhost:5173/player.html');

	await expect(page.locator('[data-player-view="world"]')).toBeVisible();
	await expect(
		page.getByRole('heading', {name: 'Междугородний автовокзал'})
	).toBeVisible();
	await expect(page.locator('.narrative-player__clock')).toContainText('День 1');
	await expect(page.getByText('06:00')).toBeVisible();
	await expect(
		page.getByRole('button', {name: /Вспомнить точный совет кассира/})
	).toHaveCount(0);

	await page
		.getByRole('button', {name: /Позвонить по записанному номеру/})
		.click();
	await expect(page.getByRole('status')).toContainText(
		'Длинные гудки. Никто не отвечает.'
	);

	await page
		.getByRole('button', {
			name: /Вежливо спросить про водонапорную башню/
		})
		.click();
	await page
		.getByRole('button', {name: /Уточнить, где пересаживаться после башни/})
		.click();

	await page.getByRole('button', {name: 'Подождать 5 минут'}).click();
	await page.getByRole('button', {name: 'Подождать 5 минут'}).click();
	await expect(page.locator('.narrative-player__clock')).toContainText('06:10');
	await expect(
		page.getByText('Короткое утреннее объявление на вокзале')
	).toBeVisible();
	await expect(page.getByText('Разговор у вахты без героя')).toHaveCount(0);
	await page.getByRole('button', {name: 'Участвовать'}).click();
	await expect(
		page.getByText('Короткое утреннее объявление на вокзале')
	).toHaveCount(0);

	await page
		.getByRole('button', {name: /Выйти на транспортную площадь/})
		.click();
	await expect(
		page.getByRole('heading', {name: 'Транспортная площадь'})
	).toBeVisible();
	await expect(page.locator('.narrative-player__clock')).toContainText('06:13');

	await page.getByRole('button', {name: /Дойти до остановки/}).click();
	await expect(
		page.getByRole('heading', {name: 'Остановка у автовокзала'})
	).toBeVisible();
	await expect(page.locator('.narrative-player__clock')).toContainText('06:17');

	await page
		.getByRole('button', {name: /Ехать маршруткой к башне.*18 мин/})
		.click();
	await expect(
		page.getByRole('heading', {name: 'Пересадка у водонапорной башни'})
	).toBeVisible();
	await expect(page.locator('.narrative-player__clock')).toContainText('06:35');

	await page
		.getByRole('button', {name: /Идти от башни к общежитию/})
		.click();
	await expect(
		page.getByRole('heading', {name: 'Студенческое общежитие'})
	).toBeVisible();
	await expect(page.locator('.narrative-player__clock')).toContainText('06:49');
	await expect(
		page.getByRole('button', {name: /Вспомнить точный совет кассира/})
	).toHaveCount(0);

	await page
		.getByRole('button', {name: 'Подождать до 22:30'})
		.click();
	await expect(page.locator('.narrative-player__clock')).toContainText('22:30');
	await expect(page.getByText('Разговор у вахты без героя')).toHaveCount(0);

	await page
		.getByRole('button', {name: /Лечь спать до утра/})
		.click();
	await expect(page.locator('.narrative-player__clock')).toContainText('День 2');
	await expect(page.locator('.narrative-player__clock')).toContainText('07:30');
	await expect(
		page.getByRole('heading', {name: 'Студенческое общежитие'})
	).toBeVisible();

	await expect(
		page.getByRole('button', {name: /Вспомнить точный совет кассира/})
	).toBeEnabled();
	await expect(
		page.getByRole('button', {name: /Вспомнить утреннее объявление на вокзале/})
	).toBeEnabled();
	await expect(
		page.getByRole('button', {name: /Признать, что маршрут всё ещё помнится смутно/})
	).toHaveCount(0);
	await expect(
		page.getByRole('button', {
			name: /Поймать ощущение, что утром на вокзале что-то прошло мимо/
		})
	).toHaveCount(0);
});


test('plays the real A58 everyday systems path into Day Two', async ({page}) => {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysEverydaySystemsProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected real A58 fixture to compile.');
	}
	expect(
		compiled.artifact.initialRuntime.simulation.actualLocationByCharacter
	).toEqual({});
	expect(compiled.artifact.initialRuntime.cashByCharacter).toEqual({
		player: 12000
	});
	await page.setViewportSize({width: 390, height: 844});

	await page.route('**/player.html', async route => {
		const response = await route.fetch();
		const template = await response.text();
		await route.fulfill({
			response,
			body: embedNarrativeRuntimeArtifactInPlayerHtml(
				template,
				compiled.artifact
			)
		});
	});

	await page.goto('http://localhost:5173/player.html');

	await expect(page.locator('[data-player-view="world"]')).toBeVisible();
	await expect(
		page.getByRole('heading', {name: 'Междугородний автовокзал'})
	).toBeVisible();
	await expect(page.getByText('120 руб.', {exact: true})).toBeVisible();

	await page
		.getByRole('button', {name: /Позвонить по записанному номеру/})
		.click();
	await page
		.getByRole('button', {
			name: /Вежливо спросить про водонапорную башню/
		})
		.click();
	await page
		.getByRole('button', {name: /Уточнить, где пересаживаться после башни/})
		.click();

	await page.getByRole('button', {name: 'Подождать 5 минут'}).click();
	await page.getByRole('button', {name: 'Подождать 5 минут'}).click();
	await page.getByRole('button', {name: 'Участвовать'}).click();

	await page
		.getByRole('button', {name: /Выйти на транспортную площадь/})
		.click();
	await page.getByRole('button', {name: /Подойти к киоскам/}).click();
	await expect(
		page.getByRole('heading', {name: 'Киоски у транспортной площади'})
	).toBeVisible();

	const buy = page.getByRole('button', {
		name: /Купить плотный перекус.*18 руб/
	});
	await expect(buy).toBeEnabled();
	await buy.click();
	await expect(page.getByText('102 руб.', {exact: true})).toBeVisible();

	let meal = page
		.locator('.narrative-player__inventory li')
		.filter({hasText: 'Плотный перекус'});
	await expect(meal).toHaveCount(1);
	await meal.getByRole('button', {name: 'В «Дорожная сумка»'}).click();

	meal = page
		.locator('.narrative-player__inventory li')
		.filter({hasText: 'Плотный перекус'});
	await expect(meal.getByText('внутри')).toBeVisible();
	await meal.getByRole('button', {name: 'Съесть'}).click();
	await expect(meal).toHaveCount(0);
	await expect(page.getByText('После еды')).toBeVisible();
	await expect(
		page.getByText('30 мин.', {exact: true})
	).toBeVisible();

	await page
		.getByRole('button', {name: /Вернуться на транспортную площадь/})
		.click();
	await page.getByRole('button', {name: /Дойти до остановки/}).click();

	const paidBus = page.getByRole('button', {
		name: /Ехать городским автобусом к башне.*26 мин.*6 руб/
	});
	await expect(paidBus).toBeEnabled();
	await paidBus.click();
	await expect(page.getByText('96 руб.', {exact: true})).toBeVisible();
	await expect(page.getByRole('status')).toContainText('−6 руб.');
	await expect(page.getByText('После еды')).toHaveCount(0);

	await page
		.getByRole('button', {name: /Идти от башни к общежитию/})
		.click();
	await expect(
		page.getByRole('heading', {name: 'Студенческое общежитие'})
	).toBeVisible();

	await page.getByRole('button', {name: 'Подождать до 22:30'}).click();
	await page.getByRole('button', {name: /Лечь спать до утра/}).click();

	await expect(page.locator('.narrative-player__clock')).toContainText('День 2');
	await expect(page.locator('.narrative-player__clock')).toContainText('07:30');
	await expect(page.getByText('96 руб.', {exact: true})).toBeVisible();
	await expect(
		page.getByRole('button', {name: /Вспомнить точный совет кассира/})
	).toBeEnabled();
	await expect(
		page.getByRole('button', {name: /Вспомнить утреннее объявление на вокзале/})
	).toBeEnabled();
});

test('renders and uses the derived A60 phone SMS surface in the standalone Player', async ({page}) => {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysPhoneSocialLoopProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected real A60 phone fixture to compile.');
	}
	compiled.artifact.initialRuntime.simulation.day = 2;
	compiled.artifact.initialRuntime.simulation.minuteOfDay = 10 * 60 + 30;
	await page.setViewportSize({width: 390, height: 844});

	await page.route('**/player.html', async route => {
		const response = await route.fetch();
		const template = await response.text();
		await route.fulfill({
			response,
			body: embedNarrativeRuntimeArtifactInPlayerHtml(
				template,
				compiled.artifact
			)
		});
	});

	await page.goto('http://localhost:5173/player.html');

	const phone = page
		.getByRole('heading', {name: 'Телефон'})
		.locator('xpath=ancestor::section[1]');
	await expect(phone).toBeVisible();
	await expect(phone).toContainText('Контакт по записанному номеру');
	await expect(phone).toContainText('Сообщение с записанного номера');
	await expect(phone).toContainText('не прочитано');

	const nearby = page.getByRole('heading', {name: 'Событие рядом'});
	if (await nearby.count()) {
		const nearbyPanel = nearby.locator('xpath=ancestor::section[1]');
		await expect(nearbyPanel).not.toContainText('Сообщение с записанного номера');
	}

	await phone.getByRole('button', {name: 'Открыть SMS'}).click();
	await expect(page.getByRole('status')).toContainText('SMS прочитано');
	await expect(phone).toContainText('прочитано');

	const accept = phone.getByRole('button', {
		name: /Ответить, что придёшь вечером/
	});
	const decline = phone.getByRole('button', {
		name: /Ответить, что сегодня не получится/
	});
	await expect(accept).toBeEnabled();
	await expect(decline).toBeEnabled();
	await accept.click();

	await expect(page.getByRole('status')).toContainText(
		'Договориться встретиться вечером во дворе общежития'
	);
	await expect(accept).toHaveCount(0);
	await expect(decline).toHaveCount(0);
});

test('plays the A60 accepted SMS meeting through save reload and Day Three', async ({page}) => {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysPhoneSocialLoopProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A60 accepted-loop fixture to compile.');
	}
	compiled.artifact.initialRuntime.simulation.day = 2;
	compiled.artifact.initialRuntime.simulation.minuteOfDay = 18 * 60 + 55;
	compiled.artifact.initialRuntime.simulation.actualLocationByCharacter = {
		player: arrivalCorridorIds.locations.studentDormitory,
		'day1-local-contact': 'a60-dorm-courtyard'
	};
	await page.setViewportSize({width: 390, height: 844});

	await page.route('**/player.html', async route => {
		const response = await route.fetch();
		const template = await response.text();
		await route.fulfill({
			response,
			body: embedNarrativeRuntimeArtifactInPlayerHtml(
				template,
				compiled.artifact
			)
		});
	});

	await page.goto('http://localhost:5173/player.html');

	const phone = page
		.getByRole('heading', {name: 'Телефон'})
		.locator('xpath=ancestor::section[1]');
	await phone.getByRole('button', {name: 'Открыть SMS'}).click();
	await phone
		.getByRole('button', {name: /Ответить, что придёшь вечером/})
		.click();

	await page.getByRole('button', {name: /Выйти во двор общежития/}).click();
	await page.getByRole('button', {name: 'Подождать 5 минут'}).click();
	await expect(page.locator('.narrative-player__clock')).toContainText('19:02');
	const people = page
		.getByRole('heading', {name: 'Здесь'})
		.locator('xpath=ancestor::section[1]');
	await expect(
		people.getByText('Контакт по записанному номеру', {exact: true})
	).toBeVisible();

	const meeting = page
		.locator('.narrative-player__story-opportunities li')
		.filter({hasText: 'Вечерняя встреча во дворе'});
	await expect(meeting).toHaveCount(1);
	await meeting.getByRole('button', {name: 'Участвовать'}).click();
	await page.getByRole('button', {name: 'Подождать 15 минут'}).click();
	await page.getByRole('button', {name: 'Подождать 15 минут'}).click();
	await expect(meeting).toHaveCount(0);

	await page.getByRole('button', {name: 'Сохранить'}).click();
	await expect(page.getByRole('status')).toContainText('Игра сохранена');
	await page.reload();
	await expect(page.locator('.narrative-player__clock')).toContainText('18:55');
	await page.getByRole('button', {name: 'Продолжить'}).click();
	await expect(page.locator('.narrative-player__clock')).toContainText('19:32');
	await expect(
		page.getByRole('heading', {name: 'Двор общежития'})
	).toBeVisible();

	await page.getByRole('button', {name: /Вернуться в общежитие/}).click();
	for (let index = 0; index < 12; index += 1) {
		await page.getByRole('button', {name: 'Подождать 15 минут'}).click();
	}
	await expect(page.locator('.narrative-player__clock')).toContainText('22:34');
	await page.getByRole('button', {name: /Лечь спать до утра/}).click();
	await expect(page.locator('.narrative-player__clock')).toContainText('День 3');
	await expect(page.locator('.narrative-player__clock')).toContainText('07:30');

	const echo = page.getByRole('button', {name: /Вспомнить вчерашнюю встречу/});
	await expect(echo).toBeEnabled();
	await echo.click();
	await expect(page.getByRole('status')).toContainText(
		'Вечерняя встреча стала первым настоящим социальным продолжением приезда'
	);
});

test('plays the A60 accepted-but-missed meeting as a distinct Day Three branch', async ({page}) => {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysPhoneSocialLoopProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A60 missed-loop fixture to compile.');
	}
	compiled.artifact.initialRuntime.simulation.day = 2;
	compiled.artifact.initialRuntime.simulation.minuteOfDay = 23 * 60 + 1;
	compiled.artifact.initialRuntime.simulation.actualLocationByCharacter = {
		player: arrivalCorridorIds.locations.studentDormitory
	};
	await page.setViewportSize({width: 390, height: 844});

	await page.route('**/player.html', async route => {
		const response = await route.fetch();
		const template = await response.text();
		await route.fulfill({
			response,
			body: embedNarrativeRuntimeArtifactInPlayerHtml(
				template,
				compiled.artifact
			)
		});
	});

	await page.goto('http://localhost:5173/player.html');

	const phone = page
		.getByRole('heading', {name: 'Телефон'})
		.locator('xpath=ancestor::section[1]');
	await phone.getByRole('button', {name: 'Открыть SMS'}).click();
	await phone
		.getByRole('button', {name: /Ответить, что придёшь вечером/})
		.click();

	const meeting = page
		.locator('.narrative-player__story-opportunities li')
		.filter({hasText: 'Вечерняя встреча во дворе'});
	await expect(meeting).toContainText('Окно этой возможности уже закрылось');
	await meeting.getByRole('button', {name: 'Зафиксировать пропуск'}).click();
	await expect(meeting).toHaveCount(0);

	await page.getByRole('button', {name: /Лечь спать до утра/}).click();
	await expect(page.locator('.narrative-player__clock')).toContainText('День 3');

	const missedEcho = page.getByRole('button', {
		name: /Подумать о пропущенной встрече/
	});
	await expect(missedEcho).toBeEnabled();
	await expect(
		page.getByRole('button', {name: /Вспомнить вчерашнюю встречу/})
	).toHaveCount(0);
	await missedEcho.click();
	await expect(page.getByRole('status')).toContainText(
		'Пропущенная договорённость уже стала частью отношений'
	);
});

test('saves, reloads and explicitly continues the real A59 Player session', async ({page}) => {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysEverydaySystemsProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected real A59 save fixture to compile.');
	}

	await page.route('**/player.html', async route => {
		const response = await route.fetch();
		const template = await response.text();
		await route.fulfill({
			response,
			body: embedNarrativeRuntimeArtifactInPlayerHtml(
				template,
				compiled.artifact
			)
		});
	});

	await page.goto('http://localhost:5173/player.html');

	const continueButton = page.getByRole('button', {name: 'Продолжить'});
	await expect(continueButton).toBeDisabled();
	await page.getByRole('button', {name: 'Подождать 5 минут'}).click();
	await expect(page.locator('.narrative-player__clock')).toContainText('06:05');

	await page.getByRole('button', {name: 'Сохранить'}).click();
	await expect(page.getByRole('status')).toContainText('Игра сохранена');
	await expect(continueButton).toBeEnabled();

	await page.reload();
	await expect(page.locator('[data-player-status="ready"]')).toBeVisible();
	await expect(page.locator('.narrative-player__clock')).toContainText('06:00');
	const freshContinue = page.getByRole('button', {name: 'Продолжить'});
	await expect(freshContinue).toBeEnabled();

	await freshContinue.click();
	await expect(page.locator('.narrative-player__clock')).toContainText('06:05');
	await expect(page.getByRole('status')).toContainText('Сохранение загружено');
});

test('renders Actual Presence and applies a canonical Move in the standalone player', async ({
	page
}) => {
	const source = presentationArtifact();
	await page.setViewportSize({width: 390, height: 844});

	await page.route('**/player.html', async route => {
		const response = await route.fetch();
		const template = await response.text();
		await route.fulfill({
			response,
			body: embedNarrativeRuntimeArtifactInPlayerHtml(template, source)
		});
	});

	await page.goto('http://localhost:5173/player.html');

	await expect(page.locator('[data-player-view="world"]')).toBeVisible();
	await expect(page.getByRole('heading', {name: 'Автовокзал'})).toBeVisible();
	await expect(page.getByText('Платформа прибытия')).toBeVisible();
	await expect(page.getByText('Катя', {exact: true})).toBeVisible();

	const greeting = page.getByRole('button', {name: /Поздороваться/});
	await expect(greeting).toBeEnabled();
	await greeting.click();

	await expect(page.getByRole('status')).toContainText('Катя отвечает');
	await expect(greeting).toHaveCount(0);
	await expect(page.getByRole('heading', {name: 'Автовокзал'})).toBeVisible();
});
