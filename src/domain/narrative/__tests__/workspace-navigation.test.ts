import {NarrativeMoveDefinition} from '../interaction';
import {StoryNodeDefinition} from '../story';
import {
	simulationMomentAbsoluteMinute,
	storyCanvasViewportForNode,
	storyNodeAbsoluteMinute,
	storyNodesForCharacter,
	storyNodesForLocation,
	storyParticipantIds,
	storyWorldNavigationContext,
	workspacePanelsForMode,
	worldTimeViewportForStoryNode
} from '../workspace-navigation';

function node(
	placement?: StoryNodeDefinition['placement'],
	patch: Partial<StoryNodeDefinition> = {}
): StoryNodeDefinition {
	return {
		id: 'story-node',
		kind: 'event',
		title: 'Событие',
		participantIds: [],
		activationState: 'draft',
		placement,
		...patch
	};
}

function automaticMove(
	id: string,
	storyNodeId: string,
	actorCharacterId?: string,
	targetCharacterIds: string[] = []
): NarrativeMoveDefinition {
	return {
		id,
		storyNodeId,
		kind: 'action',
		label: id,
		actorCharacterId,
		targetCharacterIds,
		guards: [],
		resolution: {type: 'automatic', outcomeId: `${id}-outcome`},
		outcomes: [
			{
				id: `${id}-outcome`,
				label: 'Outcome',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
}

describe('cross-workspace navigation', () => {
	test('Split View exposes the two canonical workspaces without inventing a third mode', () => {
		expect(workspacePanelsForMode('story', false)).toEqual({
			showStory: true,
			showWorldTime: false
		});
		expect(workspacePanelsForMode('world-time', false)).toEqual({
			showStory: false,
			showWorldTime: true
		});
		expect(workspacePanelsForMode('story', true)).toEqual({
			showStory: true,
			showWorldTime: true
		});
		expect(workspacePanelsForMode('world-time', true)).toEqual({
			showStory: true,
			showWorldTime: true
		});
	});

	test('maps an exact Story placement to the same World-Time minute', () => {
		const storyNode = node({day: 12, minuteOfDay: 18 * 60 + 35});
		expect(storyNodeAbsoluteMinute(storyNode)).toBe(
			11 * 24 * 60 + 18 * 60 + 35
		);
		expect(worldTimeViewportForStoryNode(storyNode, 4)).toEqual({
			centerAbsoluteMinute: 11 * 24 * 60 + 18 * 60 + 35,
			pixelsPerHour: 12
		});
	});

	test('does not invent a World-Time target for an unscheduled Story node', () => {
		expect(storyNodeAbsoluteMinute(node())).toBeUndefined();
		expect(worldTimeViewportForStoryNode(node(), 24)).toBeUndefined();
	});

	test('centers a Story canvas node while preserving a useful zoom', () => {
		expect(storyCanvasViewportForNode({x: 100, y: 200}, 1)).toEqual({
			x: 280,
			y: 40,
			zoom: 1
		});
		expect(storyCanvasViewportForNode({x: 100, y: 200}, 0.4).zoom).toBe(0.8);
	});

	test('derives participants from Story metadata and authored Moves without duplicates', () => {
		const storyNode = node(undefined, {
			primaryCharacterId: 'katya',
			participantIds: ['andrey', 'katya']
		});
		const moves = [
			automaticMove('move-1', storyNode.id, 'andrey', ['misha', 'katya']),
			automaticMove('other-node-move', 'other-node', 'outsider', [])
		];

		expect(storyParticipantIds(storyNode, moves)).toEqual([
			'katya',
			'andrey',
			'misha'
		]);
	});

	test('supports reverse World-Time lookup by authored location and Character context', () => {
		const station = node(
			{day: 3, minuteOfDay: 600, locationId: 'station'},
			{id: 'station-node', participantIds: ['katya']}
		);
		const park = node(
			{day: 3, minuteOfDay: 720, locationId: 'park'},
			{id: 'park-node'}
		);
		const moves = [automaticMove('park-talk', 'park-node', 'andrey', ['katya'])];

		expect(storyNodesForLocation([station, park], 'station').map(item => item.id)).toEqual([
			'station-node'
		]);
		expect(
			storyNodesForCharacter([station, park], moves, 'katya').map(item => item.id)
		).toEqual(['station-node', 'park-node']);
	});

	test('keeps authored placement separate from actual presence at another Simulation moment', () => {
		const storyNode = node(
			{day: 5, minuteOfDay: 600, locationId: 'station'},
			{participantIds: ['katya']}
		);
		const context = storyWorldNavigationContext(
			storyNode,
			[],
			{katya: 'park'},
			{day: 4, minuteOfDay: 600}
		);

		expect(context.authoredLocationId).toBe('station');
		expect(context.actualPresenceComparableToStoryMoment).toBe(false);
		expect(context.participants[0]).toEqual({
			characterId: 'katya',
			actualLocationId: 'park',
			presenceRelation: 'different-moment'
		});
		expect(context.simulationAbsoluteMinute).toBe(
			simulationMomentAbsoluteMinute({day: 4, minuteOfDay: 600})
		);
	});

	test('compares actual presence only when Story placement matches Simulation Playhead', () => {
		const storyNode = node(
			{day: 5, minuteOfDay: 600, locationId: 'station'},
			{participantIds: ['katya', 'andrey', 'misha']}
		);
		const context = storyWorldNavigationContext(
			storyNode,
			[],
			{katya: 'station', andrey: 'park'},
			{day: 5, minuteOfDay: 600}
		);

		expect(context.actualPresenceComparableToStoryMoment).toBe(true);
		expect(context.participants.map(item => item.presenceRelation)).toEqual([
			'same-location',
			'different-location',
			'unknown-location'
		]);
	});
});
