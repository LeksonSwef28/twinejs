import {NarrativeMoveDefinition} from '../interaction';
import {applyNarrativeOutcomeEffects} from '../outcome-effects-runtime';

function move(): NarrativeMoveDefinition {
	return {
		id: 'move',
		storyNodeId: 'scene-a',
		kind: 'inform',
		label: 'Сообщить новость',
		actorCharacterId: 'actor',
		targetCharacterIds: ['target'],
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
						id: 'relationship',
						type: 'relationship-adjust',
						from: {type: 'move-target', targetIndex: 0},
						to: {type: 'move-actor'},
						axis: 'trust',
						delta: -3
					},
					{
						id: 'mood',
						type: 'character-mood-set',
						character: {type: 'move-target', targetIndex: 0},
						mood: 'angry'
					},
					{
						id: 'item',
						type: 'item-set-placement',
						itemInstanceId: 'key',
						placement: {
							type: 'character',
							character: {type: 'move-actor'}
						}
					},
					{
						id: 'story',
						type: 'story-node-set-state',
						storyNodeId: 'scene-b',
						state: 'available'
					}
				]
			}
		]
	};
}

describe('typed Narrative Outcome effects', () => {
	test('applies relationship, mood, inventory and Story state without mutating input', () => {
		const authoredMove = move();
		const input = {
			characterKnowledge: [],
			relationships: [
				{fromCharacterId: 'target', toCharacterId: 'actor', values: {trust: 10}}
			],
			mindStates: [],
			itemInstances: [
				{id: 'key', definitionId: 'key-def', placement: {type: 'unplaced' as const}}
			],
			storyNodes: [
				{
					id: 'scene-a',
					kind: 'dialogue' as const,
					title: 'A',
					participantIds: [],
					activationState: 'active' as const
				},
				{
					id: 'scene-b',
					kind: 'event' as const,
					title: 'B',
					participantIds: [],
					activationState: 'dormant' as const
				}
			]
		};

		const result = applyNarrativeOutcomeEffects(
			authoredMove,
			authoredMove.outcomes[0],
			input
		);

		expect(result.state.relationships[0].values.trust).toBe(7);
		expect(result.state.mindStates).toEqual([
			expect.objectContaining({characterId: 'target', mood: 'angry'})
		]);
		expect(result.state.itemInstances[0].placement).toEqual({
			type: 'character',
			characterId: 'actor'
		});
		expect(result.state.storyNodes[1].activationState).toBe('available');
		expect(result.traces).toHaveLength(4);

		expect(input.relationships[0].values.trust).toBe(10);
		expect(input.mindStates).toEqual([]);
		expect(input.itemInstances[0].placement).toEqual({type: 'unplaced'});
		expect(input.storyNodes[1].activationState).toBe('dormant');
	});
});
