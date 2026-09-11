import {
	analyzeStoryContinuity,
	connectedStoryNodeIds
} from '../story-analysis';
import {StoryConnectionDefinition, StoryNodeDefinition} from '../story';

function node(
	id: string,
	day?: number
): StoryNodeDefinition {
	return {
		id,
		kind: 'beat',
		title: id,
		participantIds: [],
		activationState: 'draft',
		placement: day === undefined ? undefined : {day, minuteOfDay: 12 * 60}
	};
}

const connections: StoryConnectionDefinition[] = [
	{
		id: 'a-b',
		sourceNodeId: 'a',
		targetNodeId: 'b',
		kind: 'flow',
		sourcePortId: 'flow-out',
		targetPortId: 'flow-in'
	},
	{
		id: 'b-c',
		sourceNodeId: 'b',
		targetNodeId: 'c',
		kind: 'condition-true',
		sourcePortId: 'true',
		targetPortId: 'flow-in'
	}
];

describe('story continuity analysis', () => {
	test('selecting one node expands to the whole connected causal chain', () => {
		expect([...connectedStoryNodeIds('b', connections)].sort()).toEqual([
			'a',
			'b',
			'c'
		]);
	});

	test('finds isolated, unscheduled and early-terminal beats', () => {
		const analysis = analyzeStoryContinuity(
			[node('a', 5), node('b', 20), node('c', 35), node('lonely')],
			connections,
			93
		);

		expect(analysis.isolatedNodeIds).toEqual(['lonely']);
		expect(analysis.unscheduledNodeIds).toEqual(['lonely']);
		expect(analysis.terminalNodeIds).toEqual(['c', 'lonely']);
		expect(analysis.earlyTerminalNodeIds).toEqual(['c']);
	});

	test('semantic notes do not fake narrative continuation', () => {
		const analysis = analyzeStoryContinuity(
			[node('a', 2), node('b', 90)],
			[
				{
					id: 'semantic',
					sourceNodeId: 'a',
					targetNodeId: 'b',
					kind: 'semantic'
				}
			],
			93
		);

		expect(analysis.isolatedNodeIds.sort()).toEqual(['a', 'b']);
	});
});
