import {NarrativeMoveDefinition} from '../interaction';
import {findStoryBridgeCandidates} from '../story-bridge-finder';
import {StoryConnectionDefinition, StoryNodeDefinition} from '../story';

function storyNode(
	id: string,
	participantIds: string[],
	day?: number,
	locationId?: string
): StoryNodeDefinition {
	return {
		id,
		kind: 'event',
		title: id,
		participantIds,
		placement:
			day === undefined ? undefined : {day, minuteOfDay: 720, locationId},
		activationState: day === undefined ? 'dormant' : 'draft'
	};
}

function move(
	id: string,
	storyNodeId: string,
	communicatedClaimId?: string
): NarrativeMoveDefinition {
	return {
		id,
		storyNodeId,
		kind: 'inform',
		label: id,
		targetCharacterIds: [],
		communicatedClaimId,
		guards: [],
		resolution: {type: 'automatic', outcomeId: `${id}:continue`},
		outcomes: [
			{
				id: `${id}:continue`,
				key: 'continue',
				label: 'Продолжить',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
}

describe('Story Brain Bridge Finder', () => {
	test('ranks existing material using explainable semantic signals', () => {
		const nodes = [
			storyNode('source', ['katya'], 20, 'bar'),
			storyNode('andrey-thread', ['andrey'], 24, 'bar'),
			storyNode('katya-draft', ['katya']),
			storyNode('unrelated', ['igor'], 70, 'station')
		];
		const moves = [
			move('source-move', 'source', 'claim-secret'),
			move('andrey-move', 'andrey-thread')
		];

		const result = findStoryBridgeCandidates(
			{
				nodes,
				connections: [],
				moves,
				initialKnowledge: [
					{
						id: 'seed',
						characterId: 'andrey',
						claimId: 'claim-secret',
						attitude: 'believes',
						confidence: 0.7,
						source: {type: 'authored'}
					}
				],
				itemInstances: []
			},
			['source']
		);

		expect(result.candidates.map(candidate => candidate.storyNodeId)).toEqual([
			'andrey-thread',
			'katya-draft'
		]);
		expect(result.candidates[0].reasons.map(reason => reason.kind)).toEqual(
			expect.arrayContaining([
				'candidate-knows-claim',
				'shared-location',
				'nearby-future-time'
			])
		);
	});

	test('uses reference edges as bridge hints but excludes already executable continuations', () => {
		const nodes = [
			storyNode('source', [], 10),
			storyNode('reference-candidate', [], 11),
			storyNode('already-next', [], 12)
		];
		const connections: StoryConnectionDefinition[] = [
			{
				id: 'hint',
				sourceNodeId: 'source',
				targetNodeId: 'reference-candidate',
				kind: 'semantic',
				mode: 'reference'
			},
			{
				id: 'next',
				sourceNodeId: 'source',
				targetNodeId: 'already-next',
				kind: 'flow',
				mode: 'executable',
				sourcePortId: 'out',
				targetPortId: 'in'
			}
		];

		const result = findStoryBridgeCandidates(
			{
				nodes,
				connections,
				moves: [],
				initialKnowledge: [],
				itemInstances: []
			},
			['source']
		);

		expect(result.candidates.map(candidate => candidate.storyNodeId)).toContain(
			'reference-candidate'
		);
		expect(result.candidates.map(candidate => candidate.storyNodeId)).not.toContain(
			'already-next'
		);
	});

	test('does not suggest unrelated material merely because it is dormant', () => {
		const result = findStoryBridgeCandidates(
			{
				nodes: [storyNode('source', ['katya'], 10), storyNode('random', ['igor'])],
				connections: [],
				moves: [],
				initialKnowledge: [],
				itemInstances: []
			},
			['source']
		);

		expect(result.candidates).toEqual([]);
	});
});
