import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	capturePreviewCheckpoint,
	restorePreviewCheckpoint
} from '../preview-checkpoints';
import {
	PreviewRuntimeInput,
	advancePreviewScenario,
	createPreviewScenario,
	executePreviewMove,
	forcePreviewOutcome,
	setPreviewRuntimeInput,
	tracePreviewMove
} from '../preview-laboratory';
import {describePreviewMoveTraceReproduction} from '../preview-reproduction';

function reproductionProject() {
	const project = createNarrativeProject(
		'a51-reproduction',
		'A51 reproduction metadata',
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
		}
	];
	project.claims = [
		{id: 'claim', text: 'Обещание будет выполнено.', stance: 'unresolved', tags: []}
	];
	project.storyNodes = [
		{
			id: 'opening',
			kind: 'event',
			title: 'Начало',
			participantIds: ['player'],
			activationState: 'available'
		}
	];
	const automatic: NarrativeMoveDefinition = {
		id: 'automatic',
		storyNodeId: 'opening',
		kind: 'inform',
		label: 'Продолжить',
		actorCharacterId: 'player',
		targetCharacterIds: [],
		guards: [],
		resolution: {type: 'automatic', outcomeId: 'auto-success'},
		outcomes: [
			{
				id: 'auto-success',
				key: 'success',
				label: 'Успех',
				effectStoryNodeIds: [],
				effects: []
			},
			{
				id: 'auto-failure',
				key: 'failure',
				label: 'Провал',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
	const skill: NarrativeMoveDefinition = {
		id: 'skill',
		storyNodeId: 'opening',
		kind: 'persuade',
		label: 'Убедить',
		actorCharacterId: 'player',
		targetCharacterIds: [],
		guards: [],
		resolution: {
			type: 'skill-check',
			check: {
				skillKey: 'charm',
				difficulty: 5,
				rollRule: {type: 'dice', diceCount: 1, dieSides: 6},
				modifiers: [],
				successOutcomeId: 'skill-success',
				failureOutcomeId: 'skill-failure'
			}
		},
		outcomes: [
			{
				id: 'skill-success',
				key: 'success',
				label: 'Успех',
				effectStoryNodeIds: [],
				effects: []
			},
			{
				id: 'skill-failure',
				key: 'failure',
				label: 'Провал',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
	project.narrativeMoves = [automatic, skill];
	project.simulation.actualLocationByCharacter = {player: 'home'};
	return project;
}

function lastReproduction(scenario: ReturnType<typeof createPreviewScenario>) {
	return scenario.actions.at(-1)?.reproduction;
}

describe('A51 reproduction metadata contracts', () => {
	test('typed test input provenance is exact and independent from caller mutation', () => {
		const scenario = createPreviewScenario(reproductionProject(), 'main', 'Main');
		const input: PreviewRuntimeInput = {
			type: 'knowledge',
			characterId: 'player',
			claimId: 'claim',
			attitude: 'believes',
			confidence: 0.8
		};
		const changed = setPreviewRuntimeInput(scenario, input);
		input.confidence = 0.1;

		expect(lastReproduction(changed)).toEqual({
			type: 'test-input',
			input: {
				type: 'knowledge',
				characterId: 'player',
				claimId: 'claim',
				attitude: 'believes',
				confidence: 0.8
			}
		});
	});

	test('resolved skill-check provenance keeps exact explicit values and resolver semantics', () => {
		const scenario = createPreviewScenario(reproductionProject(), 'main', 'Main');
		const input = {skillCheck: {skillValue: 3, rollTotal: 2}};
		const trace = tracePreviewMove(scenario, 'skill', input);
		const before = JSON.stringify(scenario);
		const descriptor = describePreviewMoveTraceReproduction(
			scenario,
			'skill',
			input,
			trace
		);
		const result = executePreviewMove(scenario, 'skill', input);

		expect(result.resolution).toEqual(trace);
		expect(result.resolution.outcomeId).toBe('skill-success');
		expect(lastReproduction(result.scenario)).toEqual({
			type: 'resolved-move',
			moveId: 'skill',
			input: {skillCheck: {skillValue: 3, rollTotal: 2}},
			outcomeId: 'skill-success'
		});
		expect(descriptor).toEqual({
			type: 'trace-move',
			scenarioId: 'main',
			sourceActionCount: scenario.actions.length,
			moveId: 'skill',
			input: {skillCheck: {skillValue: 3, rollTotal: 2}},
			status: 'resolved',
			outcomeId: 'skill-success'
		});
		expect(JSON.stringify(scenario)).toBe(before);
	});

	test('automatic resolution records no fabricated random or seed data', () => {
		const scenario = createPreviewScenario(reproductionProject());
		const result = executePreviewMove(scenario, 'automatic');
		const metadata = lastReproduction(result.scenario);
		const serialized = JSON.stringify(metadata);

		expect(metadata).toEqual({
			type: 'resolved-move',
			moveId: 'automatic',
			input: {},
			outcomeId: 'auto-success'
		});
		expect(serialized).not.toMatch(/seed|random|rng/i);
	});

	test('force and advance record only concrete canonical inputs/results', () => {
		const initial = createPreviewScenario(reproductionProject());
		const forced = forcePreviewOutcome(initial, 'automatic', 'auto-failure').scenario;
		expect(lastReproduction(forced)).toEqual({
			type: 'forced-outcome',
			moveId: 'automatic',
			outcomeId: 'auto-failure'
		});

		const nearEnd = setPreviewRuntimeInput(initial, {
			type: 'moment',
			day: ninetyThreeDaysTemplate.dayCount,
			minuteOfDay: 1438
		});
		const advanced = advancePreviewScenario(nearEnd, 5);
		expect(lastReproduction(advanced)).toEqual({
			type: 'advance',
			requestedMinutes: 5,
			appliedMinutes: 1
		});
	});

	test('checkpoint restore records stable id without embedding snapshot state', () => {
		const scenario = createPreviewScenario(reproductionProject(), 'main', 'Main');
		const checkpoint = capturePreviewCheckpoint(scenario, [], 'cp-start', 'Start');
		const changed = setPreviewRuntimeInput(scenario, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		const restored = restorePreviewCheckpoint(changed, checkpoint);
		const metadata = lastReproduction(restored);

		expect(metadata).toEqual({type: 'checkpoint-restore', checkpointId: 'cp-start'});
		expect(JSON.stringify(metadata)).not.toContain('projectSnapshot');
	});

	test('metadata is serialization-stable and invalid input remains atomic', () => {
		const scenario = createPreviewScenario(reproductionProject(), 'main', 'Main');
		const before = JSON.stringify(scenario);
		expect(() =>
			setPreviewRuntimeInput(scenario, {
				type: 'moment',
				day: 0,
				minuteOfDay: 0
			})
		).toThrow('Preview day is outside the project template.');
		expect(JSON.stringify(scenario)).toBe(before);

		const changed = setPreviewRuntimeInput(scenario, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		const metadata = lastReproduction(changed);
		expect(JSON.parse(JSON.stringify(metadata))).toEqual(metadata);
	});
});
