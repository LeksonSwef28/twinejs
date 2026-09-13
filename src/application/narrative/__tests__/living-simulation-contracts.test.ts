import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	applyNarrativeProjectOutcome,
	narrativeProjectRuntimeContext,
	resolveAndApplyNarrativeProjectMove
} from '../living-simulation';

function projectWithMove(move: NarrativeMoveDefinition) {
	const project = createNarrativeProject(
		'a40-contracts',
		'A40/A41 contracts',
		ninetyThreeDaysTemplate
	);
	project.characters = [
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'default'
		}
	];
	project.storyNodes = [
		{
			id: 'story-a',
			kind: 'event',
			title: 'Story A',
			participantIds: ['player'],
			activationState: 'available'
		}
	];
	project.narrativeMoves = [move];
	return project;
}

describe('A40/A41 runtime bridge contracts', () => {
	test('skill-check randomness is explicit input and never invented by the runtime bridge', () => {
		const move: NarrativeMoveDefinition = {
			id: 'skill-move',
			storyNodeId: 'story-a',
			kind: 'investigate',
			label: 'Проверка',
			targetCharacterIds: [],
			guards: [],
			resolution: {
				type: 'skill-check',
				check: {
					skillKey: 'attention',
					difficulty: 7,
					rollRule: {type: 'dice', diceCount: 1, dieSides: 6},
					modifiers: [],
					successOutcomeId: 'success',
					failureOutcomeId: 'failure'
				}
			},
			outcomes: [
				{id: 'success', key: 'success', label: 'Успех', effectStoryNodeIds: [], effects: []},
				{id: 'failure', key: 'failure', label: 'Провал', effectStoryNodeIds: [], effects: []}
			]
		};
		const project = projectWithMove(move);

		const missingInput = resolveAndApplyNarrativeProjectMove(project, 'skill-move');
		expect(missingInput.resolution.status).toBe('input-required');
		expect(missingInput.project).toBe(project);
		expect(missingInput.project.runtimeOccurrences).toEqual([]);

		const explicit = resolveAndApplyNarrativeProjectMove(project, 'skill-move', {
			skillCheck: {skillValue: 2, rollTotal: 5}
		});
		expect(explicit.resolution.status).toBe('resolved');
		expect(explicit.resolution.outcomeId).toBe('success');
		expect(explicit.project.runtimeOccurrences).toHaveLength(1);
	});

	test('Story-state effects update runtime Story state and occurrence history without mutating authored nodes', () => {
		const move: NarrativeMoveDefinition = {
			id: 'story-state-move',
			storyNodeId: 'story-a',
			kind: 'custom',
			label: 'Завершить событие',
			targetCharacterIds: [],
			guards: [],
			resolution: {type: 'automatic', outcomeId: 'finish'},
			outcomes: [
				{
					id: 'finish',
					key: 'finish',
					label: 'Завершить',
					effectStoryNodeIds: [],
					effects: [
						{
							id: 'finish-story',
							type: 'story-node-set-state',
							storyNodeId: 'story-a',
							state: 'completed'
						}
					]
				}
			]
		};
		const project = projectWithMove(move);
		const authoredBefore = JSON.stringify(project.storyNodes);
		const minute = project.simulation.minuteOfDay;

		const applied = applyNarrativeProjectOutcome(
			project,
			'story-state-move',
			'finish'
		);

		expect(JSON.stringify(project.storyNodes)).toBe(authoredBefore);
		expect(JSON.stringify(applied.project.storyNodes)).toBe(authoredBefore);
		expect(applied.project.storyNodeStateOverrides['story-a']).toBe('completed');
		expect(
			narrativeProjectRuntimeContext(applied.project).storyNodes[0].activationState
		).toBe('completed');
		expect(applied.trace.storyStateEffectIds).toEqual(['finish-story']);
		expect(applied.project.runtimeOccurrences).toEqual([
			expect.objectContaining({
				type: 'move-outcome',
				storyNodeId: 'story-a',
				moveId: 'story-state-move',
				outcomeId: 'finish',
				effectIds: ['finish-story'],
				moment: {day: 1, minuteOfDay: minute}
			})
		]);
		expect(applied.trace.occurrenceId).toBe(
			applied.project.runtimeOccurrences[0].id
		);
	});
});
