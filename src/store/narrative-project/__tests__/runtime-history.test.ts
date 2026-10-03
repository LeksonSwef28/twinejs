import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {narrativeProjectHistoryReducer} from '../reducer';
import {
	keepCurrentRuntime,
	replaceRuntimeProjectInHistory
} from '../runtime-history';

describe('runtime vs authoring history boundary', () => {
	test('runtime replacement copies only runtime data and does not create an undo entry', () => {
		const project = createNarrativeProject(
			'story-runtime-history',
			'Original name',
			ninetyThreeDaysTemplate
		);
		const authored = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {type: 'location/add', id: 'location-cafe', name: 'Кафе'}
			}
		);
		const authoredUpdatedAt = authored.present.updatedAt;
		const runtimeSource = {
			...authored.present,
			name: 'RUNTIME MUST NOT RENAME',
			updatedAt: 'runtime-must-not-touch-authored-updated-at',
			locations: [],
			editor: {...authored.present.editor, selectedDay: 90},
			storyNodeStateOverrides: {'runtime-node': 'active' as const},
			simulation: {
				...authored.present.simulation,
				day: 4,
				minuteOfDay: 777
			}
		};

		const replaced = replaceRuntimeProjectInHistory(authored, runtimeSource);

		expect(replaced.present.name).toBe('Original name');
		expect(replaced.present.locations).toEqual([
			expect.objectContaining({id: 'location-cafe', name: 'Кафе'})
		]);
		expect(replaced.present.editor.selectedDay).toBe(
			authored.present.editor.selectedDay
		);
		expect(replaced.present.updatedAt).toBe(authoredUpdatedAt);
		expect(replaced.present.simulation.day).toBe(4);
		expect(replaced.present.simulation.minuteOfDay).toBe(777);
		expect(replaced.present.storyNodeStateOverrides).toEqual({
			'runtime-node': 'active'
		});
		expect(replaced.past).toBe(authored.past);
		expect(replaced.future).toBe(authored.future);
		expect(replaced.past).toHaveLength(1);
	});

	test('runtime replacement preserves redo history', () => {
		const project = createNarrativeProject(
			'story-runtime-redo',
			'Redo boundary',
			ninetyThreeDaysTemplate
		);
		const edited = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {type: 'location/add', id: 'location-park', name: 'Парк'}
			}
		);
		const undone = narrativeProjectHistoryReducer(edited, {type: 'undo'});
		const runtimeSource = {
			...undone.present,
			simulation: {...undone.present.simulation, minuteOfDay: 321}
		};

		const replaced = replaceRuntimeProjectInHistory(undone, runtimeSource);

		expect(replaced.future).toBe(undone.future);
		expect(replaced.future).toHaveLength(1);
		expect(replaced.present.simulation.minuteOfDay).toBe(321);
	});

	test('authoring undo can keep the current runtime projection', () => {
		const project = createNarrativeProject(
			'story-runtime-undo',
			'Undo boundary',
			ninetyThreeDaysTemplate
		);
		const edited = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {type: 'location/add', id: 'location-station', name: 'Вокзал'}
			}
		);
		const withRuntime = replaceRuntimeProjectInHistory(edited, {
			...edited.present,
			storyNodeStateOverrides: {'story-runtime-only': 'completed'},
			simulation: {
				...edited.present.simulation,
				day: 3,
				minuteOfDay: 615
			}
		});
		const restored = narrativeProjectHistoryReducer(withRuntime, {type: 'undo'});
		const finalState = {
			...restored,
			present: keepCurrentRuntime(restored.present, withRuntime.present)
		};

		expect(finalState.present.locations).toHaveLength(0);
		expect(finalState.present.simulation.day).toBe(3);
		expect(finalState.present.simulation.minuteOfDay).toBe(615);
		expect(finalState.present.storyNodeStateOverrides).toEqual({
			'story-runtime-only': 'completed'
		});
	});

	test('authored item placement Undo/Redo can keep the current runtime overlay and playhead', () => {
		const project = createNarrativeProject(
			'story-a67-d2-runtime-boundary',
			'A67-D2 runtime boundary',
			ninetyThreeDaysTemplate
		);
		project.locations.push(
			{id: 'home', name: 'Дом'},
			{id: 'cafe', name: 'Кафе'}
		);
		project.characters.push({
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		});
		project.itemDefinitions.push({
			id: 'thermos',
			name: 'Термос',
			tags: ['drink']
		});
		project.itemInstances.push({
			id: 'thermos-1',
			definitionId: 'thermos',
			placement: {type: 'unplaced'}
		});

		const withRuntime = replaceRuntimeProjectInHistory(
			{past: [], present: project, future: []},
			{
				...project,
				itemPlacementOverrides: {
					'thermos-1': {type: 'character', characterId: 'player'}
				},
				simulation: {...project.simulation, day: 2, minuteOfDay: 480}
			}
		);
		const authoredChanged = narrativeProjectHistoryReducer(withRuntime, {
			type: 'execute',
			command: {
				type: 'item/setPlacement',
				id: 'thermos-1',
				placement: {type: 'location', locationId: 'home'}
			}
		});
		const runtimeAdvanced = replaceRuntimeProjectInHistory(authoredChanged, {
			...authoredChanged.present,
			itemPlacementOverrides: {
				'thermos-1': {type: 'location', locationId: 'cafe'}
			},
			simulation: {
				...authoredChanged.present.simulation,
				day: 6,
				minuteOfDay: 930
			}
		});

		const undoSnapshot = narrativeProjectHistoryReducer(runtimeAdvanced, {
			type: 'undo'
		});
		const undone = {
			...undoSnapshot,
			present: keepCurrentRuntime(
				undoSnapshot.present,
				runtimeAdvanced.present
			)
		};

		expect(undone.present.itemInstances[0].placement).toEqual({
			type: 'unplaced'
		});
		expect(undone.present.itemPlacementOverrides).toEqual(
			runtimeAdvanced.present.itemPlacementOverrides
		);
		expect(undone.present.simulation.day).toBe(6);
		expect(undone.present.simulation.minuteOfDay).toBe(930);

		const redoSnapshot = narrativeProjectHistoryReducer(undone, {
			type: 'redo'
		});
		const redone = {
			...redoSnapshot,
			present: keepCurrentRuntime(redoSnapshot.present, undone.present)
		};

		expect(redone.present.itemInstances[0].placement).toEqual({
			type: 'location',
			locationId: 'home'
		});
		expect(redone.present.itemPlacementOverrides).toEqual(
			runtimeAdvanced.present.itemPlacementOverrides
		);
		expect(redone.present.simulation.day).toBe(6);
		expect(redone.present.simulation.minuteOfDay).toBe(930);
	});
});
