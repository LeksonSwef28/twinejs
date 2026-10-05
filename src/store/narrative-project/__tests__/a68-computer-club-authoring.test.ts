import {compileNarrativeRuntimeArtifact} from '../../../application/narrative/export-compiler';
import {
	computerClubCycleIds,
	create93DaysComputerClubCycleProject
} from '../../../domain/narrative/content/93-days-computer-club-cycle';
import {editorAuthoringReducer} from '../editor-authoring';
import {NarrativeProjectHistoryState} from '../reducer';

describe('A68-C1 canonical authoring regression', () => {
	test('edits an ordinary Computer Club claim with undo redo and compile', () => {
		const initial = create93DaysComputerClubCycleProject();
		const originalClaim = initial.claims.find(
			claim => claim.id === computerClubCycleIds.claims.nightSession
		);
		if (!originalClaim) {
			throw new Error('Expected A68 Computer Club night-session claim.');
		}

		let state: NarrativeProjectHistoryState = {
			past: [],
			present: initial,
			future: []
		};

		const editedText =
			'На девятый день в компьютерном клубе собираются оставить несколько машин на позднюю сетевую игру; желающих всё ещё больше, чем свободных мест.';
		const editedTags = [
			'a68',
			'computer-club',
			'social-plan',
			'early-internet',
			'authoring-regression'
		];

		state = editorAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'claim/update',
				id: originalClaim.id,
				text: editedText,
				aboutFactId: originalClaim.aboutFactId,
				stance: originalClaim.stance,
				tags: editedTags
			}
		});

		const editedClaim = state.present.claims.find(
			claim => claim.id === originalClaim.id
		);
		expect(editedClaim).toEqual({
			...originalClaim,
			text: editedText,
			tags: editedTags
		});
		expect(state.past).toHaveLength(1);
		expect(state.future).toHaveLength(0);
		expect(state.present.runtimeOccurrences).toEqual(initial.runtimeOccurrences);
		expect(state.present.storyNodeStateOverrides).toEqual(
			initial.storyNodeStateOverrides
		);
		expect(state.present.memories).toEqual(initial.memories);

		state = editorAuthoringReducer(state, {type: 'undo'});
		expect(
			state.present.claims.find(claim => claim.id === originalClaim.id)
		).toEqual(originalClaim);
		expect(state.future).toHaveLength(1);

		state = editorAuthoringReducer(state, {type: 'redo'});
		expect(
			state.present.claims.find(claim => claim.id === originalClaim.id)
		).toEqual({
			...originalClaim,
			text: editedText,
			tags: editedTags
		});

		const compiled = compileNarrativeRuntimeArtifact(state.present);
		expect(compiled.status).toBe('compiled');
	});
});
