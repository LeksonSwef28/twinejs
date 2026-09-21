import {fireEvent, render, screen, within} from '@testing-library/react';
import {axe} from 'jest-axe';
import * as React from 'react';
import {
	compileNarrativeRuntimeArtifact,
	serializeNarrativeRuntimeArtifact
} from '../../application/narrative/export-compiler';
import {create93DaysDayOneDayTwoProject} from '../../domain/narrative/content/93-days-day-one-day-two';
import {create93DaysEverydaySystemsProject} from '../../domain/narrative/content/93-days-everyday-systems';
import {NarrativeMoveDefinition} from '../../domain/narrative/interaction';
import {createNarrativeProject} from '../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../domain/narrative/templates/93-days';
import {NarrativePlayerArtifactSource} from '../artifact-source';
import {PlayerApp} from '../player-app';

function source(withTravelPresence = false): NarrativePlayerArtifactSource {
	const project = createNarrativeProject(
		'a55-player-app',
		'A55 Player App',
		ninetyThreeDaysTemplate
	);
	project.projectId = 'a55-player-app-project';
	project.locations = [
		{id: 'station', name: 'Автовокзал'},
		{id: 'square', name: 'Транспортная площадь'}
	];
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
	project.travelRoutes = [
		{
			id: 'station-square',
			label: 'Выйти на площадь',
			originLocationId: 'station',
			destinationLocationId: 'square',
			durationMinutes: 5,
			mode: 'walk',
			physicalAction: 'walk'
		}
	];
	project.storyNodes = [
		{
			id: 'contact',
			kind: 'dialogue',
			title: 'Первый разговор',
			participantIds: ['player', 'katya'],
			activationState: 'available'
		}
	];
	const move: NarrativeMoveDefinition = {
		id: 'greet',
		storyNodeId: 'contact',
		kind: 'custom',
		label: 'Поздороваться',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [],
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
	project.narrativeMoves = [move];

	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A55 PlayerApp fixture to compile.');
	}
	if (withTravelPresence) {
		compiled.artifact.initialRuntime.simulation.actualLocationByCharacter = {
			player: 'station',
			katya: 'station'
		};
	}
	return {
		status: 'found',
		source: 'inline',
		serializedArtifact: serializeNarrativeRuntimeArtifact(compiled.artifact)
	};
}

function a57Source(): NarrativePlayerArtifactSource {
	const compiled = compileNarrativeRuntimeArtifact(create93DaysDayOneDayTwoProject());
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A57 Player fixture to compile.');
	}
	return {
		status: 'found',
		source: 'inline',
		serializedArtifact: serializeNarrativeRuntimeArtifact(compiled.artifact)
	};
}

function a58Source(): NarrativePlayerArtifactSource {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysEverydaySystemsProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A58 Player fixture to compile.');
	}
	return {
		status: 'found',
		source: 'inline',
		serializedArtifact: serializeNarrativeRuntimeArtifact(compiled.artifact)
	};
}

function sleepSource(): NarrativePlayerArtifactSource {
	const project = createNarrativeProject(
		'a57-player-sleep',
		'A57 Player Sleep',
		ninetyThreeDaysTemplate
	);
	project.projectId = 'a57-player-sleep-project';
	project.locations = [{id: 'dorm', name: 'Общежитие'}];
	project.characters = [
		{
			id: 'player',
			name: 'Игрок',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.behaviorProfiles = [
		{id: 'player-default', characterId: 'player', name: 'Player default'}
	];
	project.playerStart = {characterId: 'player', locationId: 'dorm'};
	project.sleepOptions = [
		{
			id: 'overnight',
			label: 'Лечь спать до утра',
			locationId: 'dorm',
			earliestStartMinuteOfDay: 22 * 60 + 30,
			wakeMinuteOfDay: 7 * 60 + 30
		}
	];
	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A57 sleep fixture to compile.');
	}
	return {
		status: 'found',
		source: 'inline',
		serializedArtifact: serializeNarrativeRuntimeArtifact(compiled.artifact)
	};
}

describe('<PlayerApp> presentation', () => {
	test('executes an unplaced canonical Move from a fresh Player session with outcome feedback', () => {
		render(<PlayerApp artifactSource={source()} />);

		expect(
			screen.getByRole('heading', {name: 'Местоположение не определено'})
		).toBeInTheDocument();
		const action = screen.getByRole('button', {name: /Поздороваться/});
		expect(action).toBeEnabled();

		fireEvent.click(action);

		expect(screen.getByRole('status')).toHaveTextContent('Катя отвечает');
		expect(
			screen.queryByRole('button', {name: /Поздороваться/})
		).not.toBeInTheDocument();
	});

	test('waits through canonical simulation without changing the player-facing location', () => {
		render(<PlayerApp artifactSource={source(true)} />);

		expect(screen.getByText('06:00')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', {name: 'Подождать 5 минут'}));

		expect(screen.getByText('06:05')).toBeInTheDocument();
		expect(screen.getByRole('heading', {name: 'Автовокзал'})).toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('Прошло 5 мин.');
	});

	test('travels through canonical route time and updates the player-facing location', () => {
		render(<PlayerApp artifactSource={source(true)} />);

		expect(screen.getByRole('heading', {name: 'Автовокзал'})).toBeInTheDocument();
		expect(screen.getByText('Катя')).toBeInTheDocument();
		const route = screen.getByRole('button', {name: /Выйти на площадь/});
		expect(route).toBeEnabled();

		fireEvent.click(route);

		expect(
			screen.getByRole('heading', {name: 'Транспортная площадь'})
		).toBeInTheDocument();
		expect(screen.getByText('06:05')).toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('Транспортная площадь');
		expect(screen.queryByText('Катя')).not.toBeInTheDocument();
	});

	test('surfaces only due protagonist Story work and records an explicit miss', () => {
		render(<PlayerApp artifactSource={a57Source()} />);

		expect(
			screen.queryByText('Короткое утреннее объявление на вокзале')
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', {name: 'Подождать 5 минут'}));
		fireEvent.click(screen.getByRole('button', {name: 'Подождать 5 минут'}));

		expect(screen.getByText('06:10')).toBeInTheDocument();
		expect(
			screen.getByText('Короткое утреннее объявление на вокзале')
		).toBeInTheDocument();
		expect(screen.queryByText('Разговор у вахты без героя')).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'Пропустить'}));

		expect(screen.getByRole('status')).toHaveTextContent(
			'Возможность пропущена'
		);
		expect(
			screen.queryByText('Короткое утреннее объявление на вокзале')
		).not.toBeInTheDocument();
	});

	test('waits to authored bedtime through canonical wait, then sleeps into Day Two', () => {
		render(<PlayerApp artifactSource={sleepSource()} />);

		expect(screen.getByText('06:00')).toBeInTheDocument();
		expect(
			screen.queryByRole('button', {name: /Лечь спать до утра/})
		).not.toBeInTheDocument();

		fireEvent.click(
			screen.getByRole('button', {name: 'Подождать до 22:30'})
		);
		expect(screen.getByText('22:30')).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole('button', {name: /Лечь спать до утра/})
		);
		expect(screen.getByLabelText('Игровое время')).toHaveTextContent('День 2');
		expect(screen.getByText('07:30')).toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('подъём в 07:30');
	});

	test('buys, packs, eats and pays fare through A58 Player controls', () => {
		render(<PlayerApp artifactSource={a58Source()} />);

		expect(screen.getByText('120 руб.')).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole('button', {name: /Выйти на транспортную площадь/})
		);
		fireEvent.click(screen.getByRole('button', {name: /Подойти к киоскам/}));

		const buy = screen.getByRole('button', {
			name: /Купить плотный перекус.*18 руб/
		});
		expect(buy).toBeEnabled();
		fireEvent.click(buy);
		expect(screen.getByText('102 руб.')).toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('Покупка');

		let mealLine = screen.getByText('Плотный перекус').closest('li');
		expect(mealLine).not.toBeNull();
		fireEvent.click(
			within(mealLine!).getByRole('button', {name: 'В «Дорожная сумка»'})
		);

		mealLine = screen.getByText('Плотный перекус').closest('li');
		expect(mealLine).not.toBeNull();
		expect(within(mealLine!).getByText('внутри')).toBeInTheDocument();
		fireEvent.click(within(mealLine!).getByRole('button', {name: 'Съесть'}));
		expect(screen.getByRole('status')).toHaveTextContent('переваривание 30 мин.');
		expect(
			screen.queryByText('Плотный перекус', {
				selector: '.narrative-player__inventory-line > span'
			})
		).not.toBeInTheDocument();

		const digestion = screen.getByText('После еды').closest('div');
		expect(digestion).toHaveTextContent('30 мин.');

		fireEvent.click(
			screen.getByRole('button', {name: /Вернуться на транспортную площадь/})
		);
		fireEvent.click(screen.getByRole('button', {name: /Дойти до остановки/}));
		const bus = screen.getByRole('button', {
			name: /Ехать городским автобусом к башне.*6 руб/
		});
		expect(bus).toBeEnabled();
		fireEvent.click(bus);
		expect(screen.getByText('96 руб.')).toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('−6 руб.');
	});

	test('is accessible in the ready player shell', async () => {
		const {container} = render(<PlayerApp artifactSource={source()} />);
		expect(await axe(container)).toHaveNoViolations();
	});
});
