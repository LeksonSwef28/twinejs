import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	PREVIEW_CHECKPOINT_LIMIT,
	PreviewCheckpoint,
	capturePreviewCheckpoint,
	removePreviewCheckpoint,
	restorePreviewCheckpoint
} from '../preview-checkpoints';
import {
	createPreviewScenario,
	resetPreviewScenario,
	setPreviewRuntimeInput
} from '../preview-laboratory';

function checkpointProject() {
	const project = createNarrativeProject(
		'a51-checkpoints',
		'A51 checkpoints',
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
	const move: NarrativeMoveDefinition = {
		id: 'wait',
		storyNodeId: 'opening',
		kind: 'inform',
		label: 'Подождать',
		actorCharacterId: 'player',
		targetCharacterIds: [],
		guards: [],
		resolution: {type: 'automatic', outcomeId: 'done'},
		outcomes: [
			{
				id: 'done',
				key: 'success',
				label: 'Готово',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
	project.narrativeMoves = [move];
	project.simulation.day = 1;
	project.simulation.minuteOfDay = 480;
	project.simulation.actualLocationByCharacter = {player: 'home'};
	return project;
}

describe('A51 preview checkpoint contracts', () => {
	test('capture is read-only and snapshot stays independent from later sandbox changes', () => {
		const scenario = createPreviewScenario(checkpointProject(), 'main', 'Main');
		const before = JSON.stringify(scenario);
		const checkpoint = capturePreviewCheckpoint(scenario, [], 'cp-1', 'Before move');

		expect(JSON.stringify(scenario)).toBe(before);
		expect(checkpoint.sourceActionCount).toBe(scenario.actions.length);
		const changed = setPreviewRuntimeInput(scenario, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		expect(changed.project.simulation.actualLocationByCharacter.player).toBe('station');
		expect(checkpoint.projectSnapshot.simulation.actualLocationByCharacter.player).toBe(
			'home'
		);
	});

	test('restore reproduces the snapshot, preserves baseline and appends provenance', () => {
		const initial = createPreviewScenario(checkpointProject(), 'main', 'Main');
		const checkpoint = capturePreviewCheckpoint(initial, [], 'cp-1', 'Start');
		const changed = setPreviewRuntimeInput(initial, {
			type: 'moment',
			day: 2,
			minuteOfDay: 600
		});
		const baselineBefore = JSON.stringify(changed.baselineProject);
		const actionsBefore = changed.actions.slice();

		const restored = restorePreviewCheckpoint(changed, checkpoint);

		expect(restored.project).toEqual(checkpoint.projectSnapshot);
		expect(restored.project).not.toBe(checkpoint.projectSnapshot);
		expect(JSON.stringify(restored.baselineProject)).toBe(baselineBefore);
		expect(restored.actions.slice(0, actionsBefore.length)).toEqual(actionsBefore);
		expect(restored.actions.at(-1)).toEqual(
			expect.objectContaining({
				kind: 'checkpoint-restore',
				summary: 'Restored preview checkpoint Start.'
			})
		);
	});

	test('later sandbox mutations cannot mutate a stored checkpoint after restore', () => {
		const initial = createPreviewScenario(checkpointProject(), 'main', 'Main');
		const checkpoint = capturePreviewCheckpoint(initial, [], 'cp-1', 'Start');
		const restored = restorePreviewCheckpoint(initial, checkpoint);
		const changed = setPreviewRuntimeInput(restored, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});

		expect(changed.project.simulation.actualLocationByCharacter.player).toBe('station');
		expect(checkpoint.projectSnapshot.simulation.actualLocationByCharacter.player).toBe(
			'home'
		);
	});

	test('Reset after restore still returns to the original scenario baseline', () => {
		const initial = createPreviewScenario(checkpointProject(), 'main', 'Main');
		const moved = setPreviewRuntimeInput(initial, {
			type: 'moment',
			day: 2,
			minuteOfDay: 600
		});
		const checkpoint = capturePreviewCheckpoint(moved, [], 'cp-1', 'Day 2');
		const changedAgain = setPreviewRuntimeInput(moved, {
			type: 'moment',
			day: 3,
			minuteOfDay: 700
		});
		const restored = restorePreviewCheckpoint(changedAgain, checkpoint);
		const reset = resetPreviewScenario(restored);

		expect(restored.project.simulation.day).toBe(2);
		expect(reset.project).toEqual(initial.baselineProject);
		expect(reset.project.simulation.day).toBe(1);
	});

	test('cross-scenario restore fails atomically', () => {
		const main = createPreviewScenario(checkpointProject(), 'main', 'Main');
		const other = createPreviewScenario(checkpointProject(), 'other', 'Other');
		const checkpoint = capturePreviewCheckpoint(main, [], 'cp-1', 'Main only');
		const before = JSON.stringify(other);

		expect(() => restorePreviewCheckpoint(other, checkpoint)).toThrow(
			'belongs to scenario main, not other'
		);
		expect(JSON.stringify(other)).toBe(before);
	});

	test('capture/restore keeps authored Move definitions and serialization stable', () => {
		const initial = createPreviewScenario(checkpointProject(), 'main', 'Main');
		const authoredMoves = JSON.stringify(initial.project.narrativeMoves);
		const checkpoint = capturePreviewCheckpoint(initial, [], 'cp-1', 'Stable');
		const restored = restorePreviewCheckpoint(initial, checkpoint);

		expect(JSON.stringify(restored.project.narrativeMoves)).toBe(authoredMoves);
		expect(JSON.stringify(checkpoint.projectSnapshot.narrativeMoves)).toBe(authoredMoves);
		expect(JSON.parse(JSON.stringify(restored.project))).toEqual(restored.project);
	});

	test('finite per-scenario limit is enforced and checkpoint removal is immutable', () => {
		const scenario = createPreviewScenario(checkpointProject(), 'main', 'Main');
		const checkpoints: PreviewCheckpoint[] = [];
		for (let index = 0; index < PREVIEW_CHECKPOINT_LIMIT; index += 1) {
			checkpoints.push(
				capturePreviewCheckpoint(
					scenario,
					checkpoints,
					`cp-${index + 1}`,
					`Checkpoint ${index + 1}`
				)
			);
		}

		expect(() =>
			capturePreviewCheckpoint(scenario, checkpoints, 'cp-overflow', 'Overflow')
		).toThrow(`Preview checkpoint limit reached (${PREVIEW_CHECKPOINT_LIMIT} per scenario).`);
		const trimmed = removePreviewCheckpoint(checkpoints, 'cp-1');
		expect(trimmed).toHaveLength(PREVIEW_CHECKPOINT_LIMIT - 1);
		expect(checkpoints).toHaveLength(PREVIEW_CHECKPOINT_LIMIT);
	});

	test('checkpoint collection rejects mixed scenario lineage before capture', () => {
		const main = createPreviewScenario(checkpointProject(), 'main', 'Main');
		const other = createPreviewScenario(checkpointProject(), 'other', 'Other');
		const foreign = capturePreviewCheckpoint(other, [], 'cp-other', 'Other');

		expect(() => capturePreviewCheckpoint(main, [foreign], 'cp-main', 'Main')).toThrow(
			'belongs to scenario other, not main'
		);
	});
});
