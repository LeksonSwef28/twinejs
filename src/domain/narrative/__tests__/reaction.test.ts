import {
	evaluateReactionCandidateSet,
	ReactionCandidateSetDefinition,
	ReactionEvaluationContext,
	reactionCandidateSetIsStructurallyValid
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

const salienceSet: ReactionCandidateSetDefinition = {
	id: 'reaction-memory',
	storyNodeId: 'scene-door',
	reactingCharacterId: 'katya',
	candidates: [
		{
			id: 'remember',
			moveId: 'move-remember',
			valence: 'negative',
			baseScore: 1,
			guards: [],
			considerations: [
				{
					id: 'remember-betrayal',
					type: 'memory-tag',
					tag: 'betrayal',
					minimumSalience: 0.6,
					weight: 4
				}
			]
		}
	]
};

function memoryContext(
	memory: ReactionEvaluationContext['memories'][number],
	memoryMoment?: ReactionEvaluationContext['memoryMoment']
): ReactionEvaluationContext {
	return {
		characterKnowledge: [],
		itemInstances: [],
		relationships: [],
		storyNodes: [],
		actualLocationByCharacter: {},
		mindStates: [],
		memories: [memory],
		memoryMoment
	};
}

const freshMemory = {
	id: 'memory-betrayal',
	characterId: 'katya',
	summary: 'Андрей солгал',
	createdAtDay: 1,
	createdAtMinute: 600,
	importance: 0.8,
	baseStrength: 0.9,
	tags: ['betrayal'],
	relatedEntityIds: ['andrey']
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

	test('keeps legacy memory-tag semantics when no salience threshold is authored', () => {
		const result = evaluateReactionCandidateSet(set, {
			characterKnowledge: [],
			itemInstances: [],
			relationships: [],
			storyNodes: [],
			actualLocationByCharacter: {},
			mindStates: [],
			memories: [freshMemory]
		});
		const sharp = result.candidates.find(candidate => candidate.candidateId === 'sharp');
		const memoryTrace = sharp?.considerationTraces.find(
			trace => trace.considerationId === 'sharp-memory'
		);

		expect(memoryTrace).toEqual(
			expect.objectContaining({status: 'met', appliedWeight: 5})
		);
		expect(memoryTrace?.minimumSalience).toBeUndefined();
	});

	test('uses explicit simulation moment to pass or fail a memory salience gate', () => {
		const fresh = evaluateReactionCandidateSet(
			salienceSet,
			memoryContext(freshMemory, {day: 1, minuteOfDay: 600})
		);
		const aged = evaluateReactionCandidateSet(
			salienceSet,
			memoryContext(freshMemory, {day: 30, minuteOfDay: 600})
		);
		const freshTrace = fresh.candidates[0].considerationTraces[0];
		const agedTrace = aged.candidates[0].considerationTraces[0];

		expect(fresh.candidates[0].score).toBe(5);
		expect(freshTrace).toEqual(
			expect.objectContaining({
				status: 'met',
				strongestMemoryId: 'memory-betrayal',
				minimumSalience: 0.6
			})
		);
		expect(freshTrace.strongestMemorySalience).toBeGreaterThanOrEqual(0.6);
		expect(aged.candidates[0].score).toBe(1);
		expect(agedTrace.status).toBe('unmet');
		expect(agedTrace.strongestMemorySalience).toBeLessThan(0.6);
	});

	test('reinforcement can keep an older memory above the authored salience gate', () => {
		const reinforced = evaluateReactionCandidateSet(
			salienceSet,
			memoryContext(
				{
					...freshMemory,
					reinforcementCount: 3,
					lastReinforcedAtDay: 29,
					lastReinforcedAtMinute: 600
				},
				{day: 30, minuteOfDay: 600}
			)
		);
		const trace = reinforced.candidates[0].considerationTraces[0];

		expect(trace.status).toBe('met');
		expect(trace.strongestMemorySalience).toBeGreaterThanOrEqual(0.6);
		expect(reinforced.candidates[0].score).toBe(5);
	});

	test('reports unknown instead of inventing time when a salience gate has no moment', () => {
		const result = evaluateReactionCandidateSet(
			salienceSet,
			memoryContext(freshMemory)
		);
		const trace = result.candidates[0].considerationTraces[0];

		expect(trace).toEqual(
			expect.objectContaining({
				status: 'unknown',
				appliedWeight: 0,
				minimumSalience: 0.6
			})
		);
		expect(trace.summary).toContain('Simulation Playhead');
	});

	test('rejects salience thresholds outside the normalized range', () => {
		const invalid: ReactionCandidateSetDefinition = {
			...salienceSet,
			candidates: [
				{
					...salienceSet.candidates[0],
					considerations: [
						{
							id: 'invalid-threshold',
							type: 'memory-tag',
							tag: 'betrayal',
							minimumSalience: 1.1,
							weight: 4
						}
					]
				}
			]
		};

		expect(reactionCandidateSetIsStructurallyValid(invalid)).toBe(false);
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
