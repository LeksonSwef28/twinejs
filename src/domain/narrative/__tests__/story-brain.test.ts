import {
	buildStoryBrainIndex,
	queryStoryBrainFocus,
	queryStoryBrainImpact
} from '../story-brain';
import {NarrativeMoveDefinition} from '../interaction';
import {StoryConnectionDefinition, StoryNodeDefinition} from '../story';

function storyNode(id: string): StoryNodeDefinition {
	return {
		id,
		kind: 'event',
		title: id,
		participantIds: [],
		activationState: 'draft'
	};
}

const nodes = ['start', 'door', 'success', 'note'].map(storyNode);
const connections: StoryConnectionDefinition[] = [
	{
		id: 'start-door',
		sourceNodeId: 'start',
		targetNodeId: 'door',
		kind: 'flow',
		mode: 'executable',
		sourcePortId: 'out',
		targetPortId: 'in'
	},
	{
		id: 'door-note',
		sourceNodeId: 'door',
		targetNodeId: 'note',
		kind: 'semantic',
		mode: 'reference'
	}
];

const moves: NarrativeMoveDefinition[] = [
	{
		id: 'persuade',
		storyNodeId: 'door',
		kind: 'persuade',
		label: 'Убедить охранника',
		actorCharacterId: 'player',
		targetCharacterIds: ['guard'],
		communicatedClaimId: 'claim-code',
		guards: [
			{
				id: 'knows-code',
				condition: {
					type: 'character-knows-claim',
					characterId: 'player',
					claimId: 'claim-code'
				}
			}
		],
		resolution: {type: 'automatic', outcomeId: 'continue'},
		outcomes: [
			{
				id: 'continue',
				key: 'continue',
				label: 'Продолжить',
				effectStoryNodeIds: ['success'],
				effects: []
			}
		]
	}
];

describe('Story Brain graph index', () => {
	test('Focus includes semantic/reference context and Narrative Move dependencies', () => {
		const index = buildStoryBrainIndex(nodes, connections, moves);
		const result = queryStoryBrainFocus(index, {kind: 'story-node', id: 'door'});
		const keys = result.entities.map(entity => `${entity.kind}:${entity.id}`);

		expect(keys).toEqual(
			expect.arrayContaining([
				'story-node:start',
				'story-node:door',
				'story-node:note',
				'story-node:success',
				'move:persuade',
				'claim:claim-code',
				'character:player',
				'character:guard'
			])
		);
	});

	test('Impact follows executable causality but ignores reference Story edges', () => {
		const index = buildStoryBrainIndex(nodes, connections, moves);
		const result = queryStoryBrainImpact(index, {
			kind: 'story-node',
			id: 'start'
		});
		const keys = result.hits.map(hit => `${hit.entity.kind}:${hit.entity.id}`);

		expect(keys).toEqual(
			expect.arrayContaining([
				'story-node:door',
				'move:persuade',
				'story-node:success'
			])
		);
		expect(keys).not.toContain('story-node:note');
	});

	test('changing a Claim impacts dependent moves and their downstream outcomes', () => {
		const index = buildStoryBrainIndex(nodes, connections, moves);
		const result = queryStoryBrainImpact(index, {
			kind: 'claim',
			id: 'claim-code'
		});
		const keys = result.hits.map(hit => `${hit.entity.kind}:${hit.entity.id}`);

		expect(keys).toContain('move:persuade');
		expect(keys).toContain('story-node:success');
	});
});
