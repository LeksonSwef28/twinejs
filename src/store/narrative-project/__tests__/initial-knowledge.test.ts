import {NarrativeProjectCommand} from '../../../application/narrative/commands';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	narrativeProjectHistoryReducer,
	NarrativeProjectHistoryState
} from '../reducer';

function execute(
	state: NarrativeProjectHistoryState,
	command: NarrativeProjectCommand
): NarrativeProjectHistoryState {
	return narrativeProjectHistoryReducer(state, {type: 'execute', command});
}

function baseState() {
	const project = createNarrativeProject(
		'knowledge-authoring',
		'Knowledge authoring',
		ninetyThreeDaysTemplate
	);
	let state: NarrativeProjectHistoryState = {
		past: [],
		present: project,
		future: []
	};
	for (const [id, name] of [
		['katya', 'Катя'],
		['olga', 'Оля'],
		['andrey', 'Андрей']
	] as const) {
		state = execute(state, {
			type: 'character/add',
			id,
			profileId: `${id}-profile`,
			name,
			cognitionTier: 'full'
		});
	}
	state = execute(state, {
		type: 'claim/add',
		id: 'claim-key',
		text: 'Андрей украл ключ'
	});
	return state;
}

describe('initial character knowledge authoring', () => {
	test('the same Claim can have independent authored states for any characters', () => {
		let state = baseState();
		state = execute(state, {
			type: 'knowledge/setInitial',
			id: 'seed-katya',
			characterId: 'katya',
			claimId: 'claim-key',
			attitude: 'believes',
			confidence: 0.8,
			source: {type: 'told', sourceCharacterId: 'olga'}
		});
		state = execute(state, {
			type: 'knowledge/setInitial',
			id: 'seed-olga',
			characterId: 'olga',
			claimId: 'claim-key',
			attitude: 'doubts',
			confidence: 0.4,
			source: {type: 'observed'}
		});

		expect(state.present.initialKnowledge).toEqual([
			expect.objectContaining({
				characterId: 'katya',
				attitude: 'believes',
				confidence: 0.8
			}),
			expect.objectContaining({
				characterId: 'olga',
				attitude: 'doubts',
				confidence: 0.4
			})
		]);
		expect(
			state.present.initialKnowledge.some(seed => seed.characterId === 'andrey')
		).toBe(false);
		expect(state.present.simulation.characterKnowledge).toEqual([]);
	});

	test('setting the same character/Claim pair updates the seed instead of duplicating it', () => {
		let state = baseState();
		state = execute(state, {
			type: 'knowledge/setInitial',
			id: 'seed-katya',
			characterId: 'katya',
			claimId: 'claim-key',
			attitude: 'doubts',
			confidence: 0.3,
			source: {type: 'authored'}
		});
		state = execute(state, {
			type: 'knowledge/setInitial',
			id: 'another-id',
			characterId: 'katya',
			claimId: 'claim-key',
			attitude: 'knows',
			confidence: 1,
			source: {type: 'observed'}
		});

		expect(state.present.initialKnowledge).toEqual([
			expect.objectContaining({
				id: 'seed-katya',
				attitude: 'knows',
				confidence: 1,
				source: {type: 'observed'}
			})
		]);
	});

	test('rejects invalid character, Claim, confidence and told-by source references', () => {
		let state = baseState();
		const commands: NarrativeProjectCommand[] = [
			{
				type: 'knowledge/setInitial',
				id: 'bad-character',
				characterId: 'missing',
				claimId: 'claim-key',
				attitude: 'believes',
				confidence: 0.5,
				source: {type: 'authored'}
			},
			{
				type: 'knowledge/setInitial',
				id: 'bad-claim',
				characterId: 'katya',
				claimId: 'missing',
				attitude: 'believes',
				confidence: 0.5,
				source: {type: 'authored'}
			},
			{
				type: 'knowledge/setInitial',
				id: 'bad-confidence',
				characterId: 'katya',
				claimId: 'claim-key',
				attitude: 'believes',
				confidence: 2,
				source: {type: 'authored'}
			},
			{
				type: 'knowledge/setInitial',
				id: 'bad-source',
				characterId: 'katya',
				claimId: 'claim-key',
				attitude: 'believes',
				confidence: 0.5,
				source: {type: 'told', sourceCharacterId: 'missing'}
			}
		];
		for (const command of commands) {
			state = execute(state, command);
		}

		expect(state.present.initialKnowledge).toEqual([]);
	});
});
