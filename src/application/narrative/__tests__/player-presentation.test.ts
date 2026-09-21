import {createCharacterBodyState} from '../../../domain/narrative/body';
import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {NarrativeProject} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	deriveNarrativePlayerPresentation,
	resolveNarrativePlayerPerspective
} from '../player-presentation';

function project(): NarrativeProject {
	const value = createNarrativeProject(
		'a55-presentation',
		'A55 Presentation',
		ninetyThreeDaysTemplate
	);
	value.projectId = 'a55-project';
	return value;
}

function character(
	id: string,
	name: string,
	cognitionTier: 'full' | 'light' | 'background' = 'full'
) {
	return {
		id,
		name,
		cognitionTier,
		defaultBehaviorProfileId: `${id}-default`
	};
}

function automaticMove(
	id: string,
	storyNodeId: string,
	actorCharacterId: string
): NarrativeMoveDefinition {
	return {
		id,
		storyNodeId,
		kind: 'custom',
		label: id,
		actorCharacterId,
		targetCharacterIds: [],
		guards: [],
		resolution: {type: 'automatic', outcomeId: `${id}:outcome`},
		outcomes: [
			{
				id: `${id}:outcome`,
				key: 'continue',
				label: 'Продолжить',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
}

describe('A55 player presentation projection', () => {
	test('prefers explicit player id without guessing among other full cognition characters', () => {
		const value = project();
		value.characters = [
			character('npc', 'НПС'),
			character('player', 'Игрок')
		];

		expect(resolveNarrativePlayerPerspective(value)).toEqual({
			status: 'resolved',
			source: 'explicit-player-id',
			character: value.characters[1]
		});
	});

	test('uses only unambiguous fallback perspectives', () => {
		const singleFull = project();
		singleFull.characters = [
			character('hero', 'Герой'),
			character('background', 'Фон', 'background')
		];
		expect(resolveNarrativePlayerPerspective(singleFull)).toEqual({
			status: 'resolved',
			source: 'single-full-cognition',
			character: singleFull.characters[0]
		});

		const singlePresent = project();
		singlePresent.characters = [
			character('one', 'Первый'),
			character('two', 'Второй')
		];
		singlePresent.simulation.actualLocationByCharacter = {two: 'station'};
		expect(resolveNarrativePlayerPerspective(singlePresent)).toEqual({
			status: 'resolved',
			source: 'single-actual-presence',
			character: singlePresent.characters[1]
		});

		singlePresent.simulation.actualLocationByCharacter = {
			one: 'station',
			two: 'station'
		};
		expect(resolveNarrativePlayerPerspective(singlePresent).status).toBe(
			'unresolved'
		);
	});

	test('projects location, one scene and local characters from Actual Presence only', () => {
		const value = project();
		value.locations = [{id: 'station', name: 'Автовокзал'}];
		value.scenes = [
			{id: 'platform', locationId: 'station', name: 'Платформа'}
		];
		value.characters = [
			character('player', 'Игрок'),
			character('katya', 'Катя'),
			character('misha', 'Миша')
		];
		value.simulation.actualLocationByCharacter = {
			player: 'station',
			katya: 'station'
		};

		const view = deriveNarrativePlayerPresentation(value);
		expect(view.location).toEqual(value.locations[0]);
		expect(view.scene).toEqual(value.scenes[0]);
		expect(view.localCharacters.map(item => item.id)).toEqual(['katya']);
		expect(view.localCharacters.map(item => item.id)).not.toContain('misha');
	});

	test('does not invent an active scene when several scenes share the location', () => {
		const value = project();
		value.locations = [{id: 'station', name: 'Автовокзал'}];
		value.scenes = [
			{id: 'hall', locationId: 'station', name: 'Зал'},
			{id: 'platform', locationId: 'station', name: 'Платформа'}
		];
		value.characters = [character('player', 'Игрок')];
		value.simulation.actualLocationByCharacter = {player: 'station'};

		const view = deriveNarrativePlayerPresentation(value);
		expect(view.scene).toBeUndefined();
		expect(view.sceneState).toBe('ambiguous');
	});

	test('uses canonical body/carrying read state without persisting display defaults', () => {
		const value = project();
		value.locations = [{id: 'station', name: 'Автовокзал'}];
		value.characters = [character('player', 'Игрок')];
		value.simulation.actualLocationByCharacter = {player: 'station'};
		value.itemDefinitions = [
			{
				id: 'portfolio',
				name: 'Портфель',
				tags: ['bag'],
				carry: {weightKg: 1, volumeUnits: 5, sizeClass: 'medium'},
				container: {
					capacityVolumeUnits: 8,
					maxContentsWeightKg: 5,
					maxItemSize: 'medium',
					carryStyle: 'hand',
					handsRequired: 1
				}
			},
			{
				id: 'thermos',
				name: 'Термос',
				tags: ['drink'],
				carry: {weightKg: 0.8, volumeUnits: 3, sizeClass: 'medium'}
			}
		];
		value.itemInstances = [
			{
				id: 'portfolio-1',
				definitionId: 'portfolio',
				placement: {type: 'character', characterId: 'player'}
			},
			{
				id: 'thermos-1',
				definitionId: 'thermos',
				placement: {type: 'unplaced'}
			}
		];
		value.itemPlacementOverrides = {
			'thermos-1': {
				type: 'container',
				containerInstanceId: 'portfolio-1'
			}
		};

		expect(value.simulation.bodyByCharacter).toEqual({});
		const view = deriveNarrativePlayerPresentation(value);
		expect(view.body).toEqual(createCharacterBodyState('player'));
		expect(value.simulation.bodyByCharacter).toEqual({});
		expect(view.carryLoad?.totalWeightKg).toBeCloseTo(1.8);
		expect(view.inventoryItems).toEqual([
			{id: 'portfolio-1', name: 'Портфель', placement: 'top-level'},
			{id: 'thermos-1', name: 'Термос', placement: 'contained'}
		]);
	});

	test('projects authored routes only from the current Actual Presence location', () => {
		const value = project();
		value.locations = [
			{id: 'station', name: 'Автовокзал'},
			{id: 'square', name: 'Площадь'},
			{id: 'far', name: 'Дальний район'}
		];
		value.characters = [character('player', 'Игрок')];
		value.simulation.actualLocationByCharacter = {player: 'station'};
		value.travelRoutes = [
			{
				id: 'station-square',
				label: 'Выйти на площадь',
				originLocationId: 'station',
				destinationLocationId: 'square',
				durationMinutes: 5,
				mode: 'walk',
				physicalAction: 'walk'
			},
			{
				id: 'far-station',
				label: 'Вернуться',
				originLocationId: 'far',
				destinationLocationId: 'station',
				durationMinutes: 20,
				mode: 'city-bus'
			}
		];

		const view = deriveNarrativePlayerPresentation(value);
		expect(view.travelOptions).toEqual([
			expect.objectContaining({
				id: 'station-square',
				destinationName: 'Площадь',
				durationMinutes: 5,
				state: 'ready'
			})
		]);
	});

	test('gates future placed Moves and projects only due protagonist Story work', () => {
		const value = project();
		value.locations = [
			{id: 'station', name: 'Автовокзал'},
			{id: 'dorm', name: 'Общежитие'}
		];
		value.characters = [
			character('player', 'Игрок'),
			character('npc', 'НПС')
		];
		value.simulation.actualLocationByCharacter = {
			player: 'station',
			npc: 'dorm'
		};
		value.simulation.day = 1;
		value.simulation.minuteOfDay = 6 * 60 + 9;
		value.storyNodes = [
			{
				id: 'player-opportunity',
				kind: 'event',
				title: 'Утреннее объявление',
				participantIds: ['player'],
				placement: {day: 1, minuteOfDay: 6 * 60 + 10, locationId: 'station'},
				activationState: 'available',
				runtimePolicy: {
					occurrenceMode: 'one-shot',
					durationMinutes: 0,
					missAfterMinutes: 10,
					interruption: 'interruptible'
				}
			},
			{
				id: 'npc-only',
				kind: 'event',
				title: 'Событие без героя',
				participantIds: ['npc'],
				placement: {day: 1, minuteOfDay: 6 * 60, locationId: 'dorm'},
				activationState: 'available',
				runtimePolicy: {
					occurrenceMode: 'one-shot',
					durationMinutes: 0,
					interruption: 'interruptible'
				}
			},
			{
				id: 'day-two',
				kind: 'beat',
				title: 'День второй',
				participantIds: ['player'],
				placement: {day: 2, minuteOfDay: 7 * 60 + 30, locationId: 'station'},
				activationState: 'available'
			}
		];
		value.narrativeMoves = [automaticMove('Day Two action', 'day-two', 'player')];

		let view = deriveNarrativePlayerPresentation(value);
		expect(view.storyOpportunities).toEqual([]);
		expect(view.actions).toEqual([]);

		value.simulation.minuteOfDay = 6 * 60 + 10;
		view = deriveNarrativePlayerPresentation(value);
		expect(view.storyOpportunities).toEqual([
			expect.objectContaining({
				id: 'story-node:player-opportunity',
				state: 'ready'
			})
		]);
		expect(view.storyOpportunities.map(option => option.storyNodeId)).not.toContain(
			'npc-only'
		);

		value.simulation.minuteOfDay = 6 * 60 + 21;
		view = deriveNarrativePlayerPresentation(value);
		expect(view.storyOpportunities[0]).toEqual(
			expect.objectContaining({state: 'expired'})
		);

		value.simulation.day = 2;
		value.simulation.minuteOfDay = 7 * 60 + 30;
		view = deriveNarrativePlayerPresentation(value);
		expect(view.actions.map(action => action.id)).toContain('Day Two action');
	});

	test('shows authored sleep only at its location and after the authored start time', () => {
		const value = project();
		value.locations = [
			{id: 'station', name: 'Автовокзал'},
			{id: 'dorm', name: 'Общежитие'}
		];
		value.characters = [character('player', 'Игрок')];
		value.simulation.actualLocationByCharacter = {player: 'dorm'};
		value.simulation.day = 1;
		value.simulation.minuteOfDay = 22 * 60;
		value.sleepOptions = [
			{
				id: 'overnight',
				label: 'Лечь спать',
				locationId: 'dorm',
				earliestStartMinuteOfDay: 22 * 60 + 30,
				wakeMinuteOfDay: 7 * 60 + 30
			}
		];

		let view = deriveNarrativePlayerPresentation(value);
		expect(view.sleepOptions).toEqual([]);
		expect(view.sleepWait).toEqual({
			durationMinutes: 30,
			targetMinuteOfDay: 22 * 60 + 30
		});

		value.simulation.minuteOfDay = 22 * 60 + 30;
		view = deriveNarrativePlayerPresentation(value);
		expect(view.sleepWait).toBeUndefined();
		expect(view.sleepOptions).toEqual([
			{id: 'overnight', label: 'Лечь спать', wakeMinuteOfDay: 7 * 60 + 30}
		]);

		value.simulation.actualLocationByCharacter.player = 'station';
		view = deriveNarrativePlayerPresentation(value);
		expect(view.sleepOptions).toEqual([]);
		expect(view.sleepWait).toBeUndefined();
	});

	test('projects only canonical player Moves in relevant active Story scope', () => {
		const value = project();
		value.locations = [
			{id: 'station', name: 'Автовокзал'},
			{id: 'square', name: 'Площадь'}
		];
		value.characters = [
			character('player', 'Игрок'),
			character('katya', 'Катя')
		];
		value.simulation.actualLocationByCharacter = {
			player: 'station',
			katya: 'station'
		};
		value.storyNodes = [
			{
				id: 'contact',
				kind: 'dialogue',
				title: 'Первый разговор',
				participantIds: ['player', 'katya'],
				placement: {locationId: 'station'},
				activationState: 'available'
			},
			{
				id: 'remote',
				kind: 'event',
				title: 'Далеко',
				participantIds: ['player'],
				placement: {locationId: 'square'},
				activationState: 'available'
			},
			{
				id: 'dormant',
				kind: 'event',
				title: 'Позже',
				participantIds: ['player'],
				activationState: 'dormant'
			}
		];

		const greet = automaticMove('Поздороваться', 'contact', 'player');
		greet.targetCharacterIds = ['katya'];
		greet.guards = [
			{
				id: 'same-place',
				condition: {
					type: 'characters-share-location',
					characterIds: ['player', 'katya']
				}
			}
		];
		const skill: NarrativeMoveDefinition = {
			...automaticMove('Проверить реакцию', 'contact', 'player'),
			resolution: {
				type: 'skill-check',
				check: {
					skillKey: 'empathy',
					difficulty: 4,
					rollRule: {type: 'dice', diceCount: 1, dieSides: 6},
					modifiers: [],
					successOutcomeId: 'Проверить реакцию:outcome',
					failureOutcomeId: 'check:failure'
				}
			},
			outcomes: [
				{
					id: 'Проверить реакцию:outcome',
					key: 'success',
					label: 'Получилось',
					effectStoryNodeIds: [],
					effects: []
				},
				{
					id: 'check:failure',
					key: 'failure',
					label: 'Не получилось',
					effectStoryNodeIds: [],
					effects: []
				}
			]
		};
		value.narrativeMoves = [
			greet,
			skill,
			automaticMove('NPC action', 'contact', 'katya'),
			automaticMove('Remote action', 'remote', 'player'),
			automaticMove('Dormant action', 'dormant', 'player')
		];

		const view = deriveNarrativePlayerPresentation(value);
		expect(view.actions.map(action => [action.id, action.state])).toEqual([
			['Поздороваться', 'ready'],
			['Проверить реакцию', 'input-required']
		]);
		expect(view.actions.every(action => action.storyNodeId === 'contact')).toBe(
			true
		);
		expect(view.actions.every(action => action.dialogue)).toBe(true);
	});
});
