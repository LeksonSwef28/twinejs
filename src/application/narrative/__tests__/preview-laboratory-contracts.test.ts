import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	advancePreviewScenario,
	comparePreviewScenarios,
	createPreviewScenario,
	executePreviewMove,
	forcePreviewOutcome,
	forkPreviewScenario,
	resetPreviewScenario,
	setPreviewRuntimeInput
} from '../preview-laboratory';

function contractProject() {
	const project = createNarrativeProject(
		'a51-preview-contracts',
		'A51 preview contracts',
		ninetyThreeDaysTemplate
	);
	project.locations = [
		{id: 'home', name: 'Дом'},
		{id: 'station', name: 'Станция'}
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
	project.storyNodes = [
		{
			id: 'meeting',
			kind: 'event',
			title: 'Встреча',
			participantIds: ['player', 'katya'],
			activationState: 'available'
		}
	];
	const automatic: NarrativeMoveDefinition = {
		id: 'promise',
		storyNodeId: 'meeting',
		kind: 'inform',
		label: 'Дать обещание',
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
		resolution: {type: 'automatic', outcomeId: 'accepted'},
		outcomes: [
			{
				id: 'accepted',
				key: 'success',
				label: 'Принято',
				effectStoryNodeIds: [],
				effects: [
					{
						id: 'complete-meeting',
						type: 'story-node-set-state',
						storyNodeId: 'meeting',
						state: 'completed'
					}
				]
			}
		]
	};
	const skill: NarrativeMoveDefinition = {
		id: 'skill-promise',
		storyNodeId: 'meeting',
		kind: 'persuade',
		label: 'Убедить',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [],
		resolution: {
			type: 'skill-check',
			check: {
				skillKey: 'charm',
				difficulty: 5,
				rollRule: {type: 'dice', diceCount: 1, dieSides: 6},
				modifiers: [],
				successOutcomeId: 'skill-accepted',
				failureOutcomeId: 'skill-declined',
				retryPolicy: 'once'
			}
		},
		outcomes: [
			{
				id: 'skill-accepted',
				key: 'success',
				label: 'Удалось',
				effectStoryNodeIds: [],
				effects: []
			},
			{
				id: 'skill-declined',
				key: 'failure',
				label: 'Не удалось',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
	project.narrativeMoves = [automatic, skill];
	project.simulation.actualLocationByCharacter = {
		player: 'home',
		katya: 'station'
	};
	return project;
}

describe('A51 preview laboratory architecture contracts', () => {
	test('invalid typed overrides are atomic and leave the prior scenario unchanged', () => {
		const scenario = createPreviewScenario(contractProject());
		const before = JSON.stringify(scenario);

		expect(() =>
			setPreviewRuntimeInput(scenario, {
				type: 'actual-location',
				characterId: 'player',
				locationId: 'missing-location'
			})
		).toThrow('Unknown preview location: missing-location');
		expect(JSON.stringify(scenario)).toBe(before);
	});

	test('unsetting actual presence removes the key and remains stable across clone-producing actions', () => {
		let scenario = createPreviewScenario(contractProject());
		scenario = setPreviewRuntimeInput(scenario, {
			type: 'actual-location',
			characterId: 'player'
		});

		expect('player' in scenario.project.simulation.actualLocationByCharacter).toBe(false);
		const keysBefore = Object.keys(scenario.project.simulation.actualLocationByCharacter);

		scenario = setPreviewRuntimeInput(scenario, {
			type: 'moment',
			day: scenario.project.simulation.day,
			minuteOfDay: scenario.project.simulation.minuteOfDay
		});

		expect(Object.keys(scenario.project.simulation.actualLocationByCharacter)).toEqual(
			keysBefore
		);
	});

	test('blocked Move execution is read-only and does not append preview provenance', () => {
		const scenario = createPreviewScenario(contractProject());
		const before = JSON.stringify(scenario.project);
		const actionCount = scenario.actions.length;
		const result = executePreviewMove(scenario, 'promise');

		expect(result.resolution.status).toBe('blocked');
		expect(result.outcomeTrace).toBeUndefined();
		expect(result.scenario).toBe(scenario);
		expect(result.scenario.actions).toHaveLength(actionCount);
		expect(result.scenario.project.runtimeOccurrences).toHaveLength(0);
		expect(JSON.stringify(result.scenario.project)).toBe(before);
	});

	test('skill-check without explicit inputs is non-mutating input-required state', () => {
		const scenario = createPreviewScenario(contractProject());
		const before = JSON.stringify(scenario);
		const result = executePreviewMove(scenario, 'skill-promise');

		expect(result.resolution.status).toBe('input-required');
		expect(result.outcomeTrace).toBeUndefined();
		expect(result.scenario).toBe(scenario);
		expect(JSON.stringify(result.scenario)).toBe(before);
	});

	test('invalid forced Outcome fails atomically', () => {
		const scenario = createPreviewScenario(contractProject());
		const before = JSON.stringify(scenario);

		expect(() => forcePreviewOutcome(scenario, 'promise', 'missing-outcome')).toThrow(
			'Unknown Narrative Outcome: missing-outcome'
		);
		expect(JSON.stringify(scenario)).toBe(before);
	});

	test('fork baseline is independent and reset returns exactly to the fork point', () => {
		const source = contractProject();
		const main = setPreviewRuntimeInput(createPreviewScenario(source, 'main', 'Main'), {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		const fork = forkPreviewScenario(main, 'fork', 'Fork');
		const forkPoint = JSON.stringify(fork.baselineProject);
		const changed = advancePreviewScenario(fork, 5);
		const reset = resetPreviewScenario(changed);

		expect(JSON.stringify(reset.project)).toBe(forkPoint);
		expect(JSON.stringify(main.project)).toBe(JSON.stringify(fork.baselineProject));
		expect(JSON.stringify(source.simulation.actualLocationByCharacter)).toBe(
			JSON.stringify({player: 'home', katya: 'station'})
		);
	});

	test('scenario changed-path comparison is symmetric', () => {
		const source = contractProject();
		const main = createPreviewScenario(source, 'main', 'Main');
		const left = setPreviewRuntimeInput(main, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		const right = setPreviewRuntimeInput(forkPreviewScenario(main, 'right', 'Right'), {
			type: 'moment',
			day: 2,
			minuteOfDay: 600
		});

		const leftToRight = comparePreviewScenarios(left, right).changedPaths.slice().sort();
		const rightToLeft = comparePreviewScenarios(right, left).changedPaths.slice().sort();
		expect(leftToRight).toEqual(rightToLeft);
	});

	test('sandbox action chain never changes authored Move definitions', () => {
		const source = contractProject();
		const authoredMoves = JSON.stringify(source.narrativeMoves);
		let scenario = createPreviewScenario(source);
		scenario = setPreviewRuntimeInput(scenario, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		scenario = executePreviewMove(scenario, 'promise').scenario;
		scenario = advancePreviewScenario(scenario, 1);

		expect(JSON.stringify(source.narrativeMoves)).toBe(authoredMoves);
		expect(JSON.stringify(scenario.project.narrativeMoves)).toBe(authoredMoves);
	});
});
