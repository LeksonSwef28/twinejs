import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	applyNarrativeProjectCommand,
	narrativeProjectHistoryReducer,
	NarrativeProjectHistoryState
} from '../reducer';

function placementProject() {
	const project = createNarrativeProject(
		'story-a67-d2-authored-placement',
		'A67-D2 authored placement',
		ninetyThreeDaysTemplate
	);
	project.locations.push(
		{id: 'home', name: 'Дом'},
		{id: 'cafe', name: 'Кафе'}
	);
	project.characters.push({
		id: 'katya',
		name: 'Катя',
		cognitionTier: 'full',
		defaultBehaviorProfileId: 'katya-profile'
	});
	project.itemDefinitions.push(
		{id: 'key-def', name: 'Ключ', tags: []},
		{id: 'coin-def', name: 'Монета', tags: []}
	);
	project.itemInstances.push(
		{id: 'key-1', definitionId: 'key-def', placement: {type: 'unplaced'}},
		{id: 'coin-1', definitionId: 'coin-def', placement: {type: 'unplaced'}}
	);
	return project;
}

describe('A67-D2 authored item placement mutation', () => {
	test('invalid and same-value commands are exact project no-ops', () => {
		const project = placementProject();

		expect(
			applyNarrativeProjectCommand(project, {
				type: 'item/setPlacement',
				id: 'missing-item',
				placement: {type: 'unplaced'}
			})
		).toBe(project);
		expect(
			applyNarrativeProjectCommand(project, {
				type: 'item/setPlacement',
				id: 'key-1',
				placement: {type: 'location', locationId: 'missing-location'}
			})
		).toBe(project);
		expect(
			applyNarrativeProjectCommand(project, {
				type: 'item/setPlacement',
				id: 'key-1',
				placement: {type: 'character', characterId: 'missing-character'}
			})
		).toBe(project);
		expect(
			applyNarrativeProjectCommand(project, {
				type: 'item/setPlacement',
				id: 'key-1',
				placement: {type: 'unplaced'}
			})
		).toBe(project);

		const atHome = applyNarrativeProjectCommand(project, {
			type: 'item/setPlacement',
			id: 'key-1',
			placement: {type: 'location', locationId: 'home'}
		});
		expect(
			applyNarrativeProjectCommand(atHome, {
				type: 'item/setPlacement',
				id: 'key-1',
				placement: {type: 'location', locationId: 'home'}
			})
		).toBe(atHome);
	});

	test('replaces the complete authored placement while preserving unrelated items', () => {
		const project = placementProject();
		const otherItem = project.itemInstances[1];

		const atHome = applyNarrativeProjectCommand(project, {
			type: 'item/setPlacement',
			id: 'key-1',
			placement: {type: 'location', locationId: 'home'}
		});
		expect(atHome.itemInstances[0].placement).toEqual({
			type: 'location',
			locationId: 'home'
		});
		expect(atHome.itemInstances[1]).toBe(otherItem);

		const withKatya = applyNarrativeProjectCommand(atHome, {
			type: 'item/setPlacement',
			id: 'key-1',
			placement: {type: 'character', characterId: 'katya'}
		});
		expect(withKatya.itemInstances[0].placement).toEqual({
			type: 'character',
			characterId: 'katya'
		});

		const unplaced = applyNarrativeProjectCommand(withKatya, {
			type: 'item/setPlacement',
			id: 'key-1',
			placement: {type: 'unplaced'}
		});
		expect(unplaced.itemInstances[0].placement).toEqual({type: 'unplaced'});
	});

	test('meaningful changes create one history entry and Undo/Redo restore authored placement', () => {
		const project = placementProject();
		const initial: NarrativeProjectHistoryState = {
			past: [],
			present: project,
			future: []
		};

		const changed = narrativeProjectHistoryReducer(initial, {
			type: 'execute',
			command: {
				type: 'item/setPlacement',
				id: 'key-1',
				placement: {type: 'location', locationId: 'home'}
			}
		});
		expect(changed.past).toHaveLength(1);
		expect(changed.present.itemInstances[0].placement).toEqual({
			type: 'location',
			locationId: 'home'
		});

		const undone = narrativeProjectHistoryReducer(changed, {type: 'undo'});
		expect(undone.present.itemInstances[0].placement).toEqual({
			type: 'unplaced'
		});
		expect(undone.future).toHaveLength(1);

		const invalidWhileUndone = narrativeProjectHistoryReducer(undone, {
			type: 'execute',
			command: {
				type: 'item/setPlacement',
				id: 'key-1',
				placement: {type: 'location', locationId: 'missing-location'}
			}
		});
		expect(invalidWhileUndone).toBe(undone);
		expect(invalidWhileUndone.future).toBe(undone.future);

		const redone = narrativeProjectHistoryReducer(undone, {type: 'redo'});
		expect(redone.present.itemInstances[0].placement).toEqual({
			type: 'location',
			locationId: 'home'
		});
	});
});
