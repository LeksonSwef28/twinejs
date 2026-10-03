import {NarrativeMoveDefinition} from '../interaction';
import {applyNarrativeOutcomeEffects} from '../outcome-effects-runtime';

function memoryMove(): NarrativeMoveDefinition {
	return {
		id: 'move-confession',
		storyNodeId: 'story-confession',
		kind: 'inform',
		label: 'Признаться',
		actorCharacterId: 'andrey',
		targetCharacterIds: ['katya'],
		communicatedClaimId: 'claim-confession',
		guards: [],
		resolution: {type: 'automatic', outcomeId: 'outcome'},
		outcomes: [
			{
				id: 'outcome',
				key: 'continue',
				label: 'Продолжить',
				effectStoryNodeIds: [],
				effects: [
					{
						id: 'remember-confession',
						type: 'character-remembers',
						character: {type: 'move-target', targetIndex: 0},
						summary: 'Андрей признался Кате.',
						importance: 0.9,
						baseStrength: 0.8,
						tags: ['confession', 'andrey'],
						source: {type: 'communicated-claim'}
					}
				]
			}
		]
	};
}

const runtime = () => ({
	characterKnowledge: [],
	relationships: [],
	mindStates: [],
	itemInstances: [],
	storyNodes: [
		{
			id: 'story-confession',
			kind: 'dialogue' as const,
			title: 'Признание',
			participantIds: ['andrey', 'katya'],
			activationState: 'active' as const
		}
	],
	memories: []
});

describe('character-remembers Outcome effect', () => {
	test('creates a provenance-rich memory only when the Outcome is applied', () => {
		const move = memoryMove();
		const input = runtime();
		const result = applyNarrativeOutcomeEffects(move, move.outcomes[0], input, {
			moment: {day: 18, minuteOfDay: 20 * 60 + 15}
		});

		expect(result.state.memories).toEqual([
			expect.objectContaining({
				id: 'remember-confession:katya',
				characterId: 'katya',
				createdAtDay: 18,
				createdAtMinute: 20 * 60 + 15,
				source: {type: 'claim', claimId: 'claim-confession'},
				relatedEntityIds: expect.arrayContaining([
					'claim-confession',
					'story-confession'
				])
			})
		]);
		expect(input.memories).toEqual([]);
	});

	test('repeating the same authored effect reinforces instead of duplicating memory', () => {
		const move = memoryMove();
		const first = applyNarrativeOutcomeEffects(move, move.outcomes[0], runtime(), {
			moment: {day: 18, minuteOfDay: 900}
		});
		const second = applyNarrativeOutcomeEffects(move, move.outcomes[0], first.state, {
			moment: {day: 20, minuteOfDay: 930}
		});

		expect(second.state.memories).toHaveLength(1);
		expect(second.state.memories?.[0].reinforcementCount).toBe(1);
		expect(second.state.memories?.[0].lastReinforcedAtDay).toBe(20);
	});

	test('fails closed when runtime moment is absent', () => {
		const move = memoryMove();
		expect(() =>
			applyNarrativeOutcomeEffects(move, move.outcomes[0], runtime())
		).toThrow('requires an exact runtime moment');
	});
});
