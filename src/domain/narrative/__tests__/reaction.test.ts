import {
	evaluateReactionCandidateSet,
	ReactionCandidateSetDefinition
} from '../reaction';

const set: ReactionCandidateSetDefinition = {
	id: 'reaction-door',
	storyNodeId: 'scene-door',
	reactingCharacterId: 'katya',
	counterpartCharacterId: 'andrey',
	candidates: [
		{
			id: 'warm',
			moveId: 'move-warm',
			valence: 'positive',
			baseScore: 3,
			guards: [],
			considerations: [
				{
					id: 'warm-trust',
					type: 'relationship-at-least',
					axis: 'trust',
					value: 50,
					weight: 2
				}
			]
		},
		{
			id: 'sharp',
			moveId: 'move-sharp',
			valence: 'negative',
			baseScore: 1,
			guards: [],
			considerations: [
				{id: 'sharp-mood', type: 'mood-is', mood: 'angry', weight: 3},
				{id: 'sharp-memory', type: 'memory-tag', tag: 'betrayal', weight: 5}
			]
		},
		{
			id: 'plain',
			moveId: 'move-plain',
			valence: 'neutral',
			baseScore: 4,
			guards: [],
			considerations: []
		},
		{
			id: 'secret',
			moveId: 'move-secret',
			valence: 'other',
			baseScore: 20,
			guards: [
				{
					id: 'must-have-key',
					condition: {
						type: 'character-has-item',
						characterId: 'katya',
						itemInstanceId: 'missing-key'
					}
				}
			],
			considerations: [
				{id: 'knows-secret', type: 'knows-claim', claimId: 'claim-secret', weight: 2}
			]
		}
	]
};

describe('character reaction candidates', () => {
	test('ranks any number of authored candidates with explainable traces', () => {
		const result = evaluateReactionCandidateSet(set, {
			characterKnowledge: [
				{
					id: 'knowledge:katya:claim-secret',
					characterId: 'katya',
					claimId: 'claim-secret',
					attitude: 'knows',
					confidence: 0.8,
					source: {type: 'authored'},
					timesHeard: 1
				}
			],
			itemInstances: [],
			relationships: [
				{
					fromCharacterId: 'katya',
					toCharacterId: 'andrey',
					values: {trust: 70}
				}
			],
			storyNodes: [
				{
					id: 'scene-door',
					kind: 'dialogue',
					title: 'У двери',
					participantIds: ['katya', 'andrey'],
					activationState: 'active'
				}
			],
			actualLocationByCharacter: {},
			mindStates: [
				{characterId: 'katya', mood: 'angry', activeMemoryIds: ['memory-1'], pendingReactionIds: []}
			],
			memories: [
				{
					id: 'memory-1',
					characterId: 'katya',
					summary: 'Андрей солгал',
					createdAtDay: 4,
					createdAtMinute: 600,
					importance: 8,
					baseStrength: 0.9,
					tags: ['betrayal'],
					relatedEntityIds: ['andrey']
				}
			]
		});

		expect(result.candidates.map(candidate => candidate.candidateId)).toEqual([
			'sharp',
			'warm',
			'plain',
			'secret'
		]);
		expect(result.candidates[0]).toEqual(
			expect.objectContaining({availability: 'available', score: 9})
		);
		expect(result.candidates[1]).toEqual(
			expect.objectContaining({availability: 'available', score: 5})
		);
		expect(result.candidates[3].availability).toBe('unknown');
		expect(result.candidates[3].score).toBe(22);
		expect(result.candidates[0].considerationTraces).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					considerationId: 'sharp-memory',
					status: 'met',
					appliedWeight: 5
				})
			])
		);
	});

	test('does not mutate authored candidates or runtime context', () => {
		const frozenSet = JSON.stringify(set);
		const context = {
			characterKnowledge: [],
			itemInstances: [],
			relationships: [],
			storyNodes: [],
			actualLocationByCharacter: {},
			mindStates: [],
			memories: []
		};
		const frozenContext = JSON.stringify(context);

		evaluateReactionCandidateSet(set, context);

		expect(JSON.stringify(set)).toBe(frozenSet);
		expect(JSON.stringify(context)).toBe(frozenContext);
	});
});
