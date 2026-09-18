import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	comparePreviewScenarios,
	createPreviewScenario,
	executePreviewMove,
	forcePreviewOutcome,
	forkPreviewScenario,
	inspectPreviewScenarioChanges,
	resetPreviewScenario,
	setPreviewRuntimeInput,
	tracePreviewMove
} from '../preview-laboratory';

function previewProject() {
	const project = createNarrativeProject(
		'a51-preview-lab',
		'A51 preview laboratory',
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
	project.claims = [
		{
			id: 'claim-promise',
			text: 'Мы ещё увидимся.',
			stance: 'unresolved',
			tags: []
		}
	];
	const move: NarrativeMoveDefinition = {
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
			},
			{
				id: 'declined',
				key: 'failure',
				label: 'Отклонено',
				effectStoryNodeIds: [],
				effects: [
					{
						id: 'block-meeting',
						type: 'story-node-set-state',
						storyNodeId: 'meeting',
						state: 'blocked'
					}
				]
			}
		]
	};
	project.narrativeMoves = [move];
	project.simulation.actualLocationByCharacter = {
		player: 'home',
		katya: 'station'
	};
	return project;
}

describe('A51 preview laboratory', () => {
	it('sets, forks and resets isolated sandbox state without touching the source project', () => {
		const source = previewProject();
		const sourceJson = JSON.stringify(source);
		const main = createPreviewScenario(source, 'main', 'Main');
		const moved = setPreviewRuntimeInput(main, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		const fork = forkPreviewScenario(moved, 'alt', 'Alternative');
		const changedFork = setPreviewRuntimeInput(fork, {
			type: 'moment',
			day: 2,
			minuteOfDay: 600
		});
		const resetFork = resetPreviewScenario(changedFork);

		expect(moved.project.simulation.actualLocationByCharacter.player).toBe('station');
		expect(resetFork.project.simulation.day).toBe(fork.baselineProject.simulation.day);
		expect(resetFork.project.simulation.minuteOfDay).toBe(
			fork.baselineProject.simulation.minuteOfDay
		);
		expect(JSON.stringify(source)).toBe(sourceJson);
	});

	it('supports explicit test-only knowledge inputs', () => {
		const source = previewProject();
		let scenario = createPreviewScenario(source);
		scenario = setPreviewRuntimeInput(scenario, {
			type: 'knowledge',
			characterId: 'katya',
			claimId: 'claim-promise',
			attitude: 'believes',
			confidence: 0.75
		});
		expect(scenario.project.simulation.characterKnowledge).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					characterId: 'katya',
					claimId: 'claim-promise',
					attitude: 'believes',
					confidence: 0.75
				})
			])
		);
		expect(source.simulation.characterKnowledge).toHaveLength(0);
	});

	it('traces eligibility and authored resolution without mutating the sandbox', () => {
		const source = previewProject();
		let scenario = createPreviewScenario(source);
		const before = JSON.stringify(scenario.project);
		const blocked = tracePreviewMove(scenario, 'promise');
		expect(blocked.status).toBe('blocked');
		expect(JSON.stringify(scenario.project)).toBe(before);

		scenario = setPreviewRuntimeInput(scenario, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		const eligible = tracePreviewMove(scenario, 'promise');
		expect(eligible.status).toBe('resolved');
		expect(eligible.outcomeId).toBe('accepted');
	});

	it('applies authored resolution with occurrence provenance inside the sandbox only', () => {
		const source = previewProject();
		let scenario = createPreviewScenario(source);
		scenario = setPreviewRuntimeInput(scenario, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		const result = executePreviewMove(scenario, 'promise');
		const lastAction = result.scenario.actions[result.scenario.actions.length - 1];
		expect(result.resolution.status).toBe('resolved');
		expect(result.outcomeTrace?.occurrenceId).toBeDefined();
		expect(result.scenario.project.storyNodeStateOverrides.meeting).toBe('completed');
		expect(lastAction).toEqual(
			expect.objectContaining({kind: 'resolved-outcome', forced: false})
		);
		expect(source.storyNodeStateOverrides.meeting).toBeUndefined();
		expect(source.runtimeOccurrences).toHaveLength(0);
	});

	it('can force an existing authored outcome for inspection without changing authored definitions', () => {
		const source = previewProject();
		const authoredBefore = JSON.stringify(source.narrativeMoves);
		const scenario = createPreviewScenario(source);
		const forced = forcePreviewOutcome(scenario, 'promise', 'declined');
		const lastAction =
			forced.scenario.actions[forced.scenario.actions.length - 1];
		expect(forced.scenario.project.storyNodeStateOverrides.meeting).toBe('blocked');
		expect(forced.scenario.project.runtimeOccurrences).toHaveLength(1);
		expect(lastAction).toEqual(
			expect.objectContaining({
				kind: 'forced-outcome',
				moveId: 'promise',
				outcomeId: 'declined',
				forced: true,
				occurrenceId: forced.trace.occurrenceId
			})
		);
		expect(JSON.stringify(source.narrativeMoves)).toBe(authoredBefore);
	});

	it('compares alternative scenarios and reports downstream runtime changes', () => {
		const source = previewProject();
		const main = createPreviewScenario(source, 'main', 'Main');
		const left = forcePreviewOutcome(main, 'promise', 'accepted').scenario;
		const right = forcePreviewOutcome(
			forkPreviewScenario(main, 'right', 'Right'),
			'promise',
			'declined'
		).scenario;
		const comparison = comparePreviewScenarios(left, right);
		const changes = inspectPreviewScenarioChanges(left);

		expect(comparison.changedPaths).toContain('runtime.storyNodeStateOverrides.meeting');
		expect(comparison.leftOccurrenceIds).not.toEqual(comparison.rightOccurrenceIds);
		expect(changes.changedPaths).toContain('runtime.storyNodeStateOverrides.meeting');
		expect(changes.newOccurrenceIds).toHaveLength(1);
	});
});
