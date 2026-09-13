import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {editorAuthoringReducer} from '../editor-authoring';
import {NarrativeProjectHistoryState} from '../reducer';

function execute(state: NarrativeProjectHistoryState, command: Parameters<typeof editorAuthoringReducer>[1] & {type: 'execute'}) {
	return editorAuthoringReducer(state, command);
}

describe('canonical entity authoring', () => {
	test('edits canonical metadata while preserving ids and runtime state', () => {
		let state: NarrativeProjectHistoryState = {
			past: [],
			present: createNarrativeProject('canonical-edit', 'Canonical edit', ninetyThreeDaysTemplate),
			future: []
		};
		state = execute(state, {type: 'execute', command: {type: 'location/add', id: 'station', name: 'Станция'}});
		state = execute(state, {type: 'execute', command: {type: 'character/add', id: 'mila', profileId: 'mila-profile', name: 'Мила', cognitionTier: 'full'}});
		state = execute(state, {type: 'execute', command: {type: 'fact/add', id: 'fact-a', title: 'Старый факт'}});
		state = execute(state, {type: 'execute', command: {type: 'claim/add', id: 'claim-a', text: 'Старый Claim', aboutFactId: 'fact-a', stance: 'unresolved'}});
		state = execute(state, {type: 'execute', command: {type: 'item/addDefinition', id: 'ticket', name: 'Билет'}});

		state = execute(state, {type: 'execute', command: {type: 'location/update', id: 'station', name: 'Главный вокзал'}});
		state = execute(state, {type: 'execute', command: {type: 'character/update', id: 'mila', name: 'Мила Орлова', cognitionTier: 'light'}});
		state = execute(state, {type: 'execute', command: {type: 'fact/update', id: 'fact-a', title: 'Поезд ушёл', description: 'Объективное событие', tags: ['rail', 'rail', ' summer ']}});
		state = execute(state, {type: 'execute', command: {type: 'claim/update', id: 'claim-a', text: 'Поезд ещё ждёт', aboutFactId: 'fact-a', stance: 'contradicts', tags: ['rumor']}});
		state = execute(state, {type: 'execute', command: {type: 'item/updateDefinition', id: 'ticket', name: 'Билет домой', description: 'Бумажный билет', tags: ['document']}});

		expect(state.present.locations[0]).toEqual({id: 'station', name: 'Главный вокзал'});
		expect(state.present.characters[0]).toEqual(expect.objectContaining({id: 'mila', name: 'Мила Орлова', cognitionTier: 'light'}));
		expect(state.present.objectiveFacts[0]).toEqual({id: 'fact-a', title: 'Поезд ушёл', description: 'Объективное событие', tags: ['rail', 'summer']});
		expect(state.present.claims[0]).toEqual({id: 'claim-a', text: 'Поезд ещё ждёт', aboutFactId: 'fact-a', stance: 'contradicts', tags: ['rumor']});
		expect(state.present.itemDefinitions[0]).toEqual(expect.objectContaining({id: 'ticket', name: 'Билет домой', description: 'Бумажный билет', tags: ['document']}));
		expect(state.present.runtimeOccurrences).toEqual([]);
		expect(state.present.storyNodeStateOverrides).toEqual({});
	});

	test('rejects invalid claim references and authoring remains undoable', () => {
		let state: NarrativeProjectHistoryState = {
			past: [],
			present: createNarrativeProject('canonical-invalid', 'Canonical invalid', ninetyThreeDaysTemplate),
			future: []
		};
		state = execute(state, {type: 'execute', command: {type: 'claim/add', id: 'claim-a', text: 'Claim', stance: 'unresolved'}});
		const beforeInvalid = state;
		state = execute(state, {type: 'execute', command: {type: 'claim/update', id: 'claim-a', text: 'Broken', aboutFactId: 'missing', stance: 'supports', tags: []}});
		expect(state).toBe(beforeInvalid);
		state = execute(state, {type: 'execute', command: {type: 'claim/update', id: 'claim-a', text: 'Исправленный Claim', stance: 'unresolved', tags: []}});
		expect(state.present.claims[0].text).toBe('Исправленный Claim');
		const undone = editorAuthoringReducer(state, {type: 'undo'});
		expect(undone.present.claims[0].text).toBe('Claim');
	});
});
